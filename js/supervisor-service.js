// ================================================================
// SUPERVISOR SERVICE
// ================================================================
// Handles supervisor workflow: escalated cases, override decisions, resolve escalations
// ================================================================

import supabase from './supabase.js';
import { getCurrentUser, getUserProfile } from './auth.js';

// ================================================================
// SUPERVISOR FUNCTIONS
// ================================================================

async function getEscalatedCases() {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'supervisor') {
            throw new Error('User must be a supervisor');
        }

        const { data, error } = await supabase
            .from('escalated_cases')
            .select(`
                *,
                applications(application_number, status, declaration_data),
                profiles:escalated_by(full_name, email),
                profiles:escalated_to(full_name, email)
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Error fetching escalated cases:', error);
        return { success: false, error: error.message };
    }
}

async function resolveEscalation(escalationId, resolution, resolutionNotes) {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'supervisor') {
            throw new Error('User must be a supervisor');
        }

        // Get current escalation
        const { data: currentEscalation, error: fetchError } = await supabase
            .from('escalated_cases')
            .select('*')
            .eq('id', escalationId)
            .single();

        if (fetchError) throw fetchError;

        // Update escalation
        const { data: updatedEscalation, error } = await supabase
            .from('escalated_cases')
            .update({
                status: 'resolved',
                resolved_by: profile.id,
                resolved_at: new Date().toISOString(),
                resolution_notes: resolutionNotes
            })
            .eq('id', escalationId)
            .select()
            .single();

        if (error) throw error;

        // Update application based on resolution
        let applicationUpdate = {};
        if (resolution === 'approve') {
            applicationUpdate = { status: 'approved', approved_at: new Date().toISOString() };
        } else if (resolution === 'return') {
            applicationUpdate = { status: 'returned', return_reason: resolutionNotes };
        } else if (resolution === 'reject') {
            applicationUpdate = { status: 'rejected', rejection_reason: resolutionNotes };
        }

        if (Object.keys(applicationUpdate).length > 0) {
            await supabase
                .from('applications')
                .update(applicationUpdate)
                .eq('id', currentEscalation.application_id);
        }

        // Create activity log
        await createActivityLog(
            profile.id,
            'escalation_resolved',
            `Escalation ${escalationId} resolved with action: ${resolution}`,
            { escalation_id: escalationId, resolution, resolution_notes: resolutionNotes }
        );

        // Create audit log
        await createAuditLog(
            profile.id,
            'UPDATE',
            'escalated_cases',
            escalationId,
            { status: currentEscalation.status },
            { status: 'resolved', resolution }
        );

        // Notify the inspector who escalated
        await createNotification(
            currentEscalation.escalated_by,
            'Escalation Resolved',
            `Your escalation has been resolved. Action: ${resolution}`,
            resolution === 'approve' ? 'success' : 'info',
            escalationId,
            'escalated_case'
        );

        // Notify agent
        const { data: application } = await supabase
            .from('applications')
            .select('agent_id, application_number')
            .eq('id', currentEscalation.application_id)
            .single();

        if (application) {
            await createNotification(
                application.agent_id,
                `Escalation ${resolution.charAt(0).toUpperCase() + resolution.slice(1)}`,
                `Your declaration ${application.application_number} escalation has been ${resolution}.`,
                resolution === 'approve' ? 'success' : 'warning',
                currentEscalation.application_id,
                'application'
            );
        }

        console.log('Escalation resolved:', escalationId);
        return { success: true, data: updatedEscalation };
    } catch (error) {
        console.error('Error resolving escalation:', error);
        return { success: false, error: error.message };
    }
}

async function approveEscalatedApplication(applicationId, notes) {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'supervisor') {
            throw new Error('User must be a supervisor');
        }

        // Get current application
        const { data: currentApp, error: fetchError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (fetchError) throw fetchError;

        // Update application status
        const { data: updatedApp, error } = await supabase
            .from('applications')
            .update({
                status: 'approved',
                supervisor_id: profile.id,
                approved_at: new Date().toISOString(),
                notes: notes || currentApp.notes
            })
            .eq('id', applicationId)
            .select()
            .single();

        if (error) throw error;

        // Resolve any related escalations
        await supabase
            .from('escalated_cases')
            .update({
                status: 'resolved',
                resolved_by: profile.id,
                resolved_at: new Date().toISOString(),
                resolution_notes: 'Application approved by supervisor'
            })
            .eq('application_id', applicationId)
            .eq('status', 'pending');

        // Create activity log
        await createActivityLog(
            profile.id,
            'application_approved',
            `Application ${updatedApp.application_number} approved by supervisor (escalated case)`,
            { application_id: applicationId }
        );

        // Create audit log
        await createAuditLog(
            profile.id,
            'UPDATE',
            'applications',
            applicationId,
            { status: currentApp.status },
            { status: 'approved', supervisor_id: profile.id }
        );

        // Notify agent
        await createNotification(
            updatedApp.agent_id,
            'Application Approved',
            `Your declaration ${updatedApp.application_number} has been approved by supervisor. Proceed to payment.`,
            'success',
            applicationId,
            'application'
        );

        // Notify revenue officer
        await notifyRevenueOfficers(applicationId, updatedApp.application_number);

        console.log('Escalated application approved:', updatedApp.application_number);
        return { success: true, data: updatedApp };
    } catch (error) {
        console.error('Error approving escalated application:', error);
        return { success: false, error: error.message };
    }
}

async function returnEscalatedApplication(applicationId, returnReason, notes) {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'supervisor') {
            throw new Error('User must be a supervisor');
        }

        // Get current application
        const { data: currentApp, error: fetchError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (fetchError) throw fetchError;

        // Update application status
        const { data: updatedApp, error } = await supabase
            .from('applications')
            .update({
                status: 'returned',
                supervisor_id: profile.id,
                return_reason: returnReason,
                notes: notes || currentApp.notes
            })
            .eq('id', applicationId)
            .select()
            .single();

        if (error) throw error;

        // Resolve any related escalations
        await supabase
            .from('escalated_cases')
            .update({
                status: 'resolved',
                resolved_by: profile.id,
                resolved_at: new Date().toISOString(),
                resolution_notes: `Application returned: ${returnReason}`
            })
            .eq('application_id', applicationId)
            .eq('status', 'pending');

        // Create activity log
        await createActivityLog(
            profile.id,
            'application_returned',
            `Application ${updatedApp.application_number} returned by supervisor: ${returnReason}`,
            { application_id: applicationId, return_reason }
        );

        // Create audit log
        await createAuditLog(
            profile.id,
            'UPDATE',
            'applications',
            applicationId,
            { status: currentApp.status },
            { status: 'returned', return_reason }
        );

        // Notify agent
        await createNotification(
            updatedApp.agent_id,
            'Application Returned',
            `Your declaration ${updatedApp.application_number} has been returned. Reason: ${returnReason}`,
            'warning',
            applicationId,
            'application'
        );

        console.log('Escalated application returned:', updatedApp.application_number);
        return { success: true, data: updatedApp };
    } catch (error) {
        console.error('Error returning escalated application:', error);
        return { success: false, error: error.message };
    }
}

async function rejectEscalatedApplication(applicationId, rejectionReason, notes) {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'supervisor') {
            throw new Error('User must be a supervisor');
        }

        // Get current application
        const { data: currentApp, error: fetchError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (fetchError) throw fetchError;

        // Update application status
        const { data: updatedApp, error } = await supabase
            .from('applications')
            .update({
                status: 'rejected',
                supervisor_id: profile.id,
                rejection_reason: rejectionReason,
                notes: notes || currentApp.notes
            })
            .eq('id', applicationId)
            .select()
            .single();

        if (error) throw error;

        // Resolve any related escalations
        await supabase
            .from('escalated_cases')
            .update({
                status: 'resolved',
                resolved_by: profile.id,
                resolved_at: new Date().toISOString(),
                resolution_notes: `Application rejected: ${rejectionReason}`
            })
            .eq('application_id', applicationId)
            .eq('status', 'pending');

        // Create activity log
        await createActivityLog(
            profile.id,
            'application_rejected',
            `Application ${updatedApp.application_number} rejected by supervisor: ${rejectionReason}`,
            { application_id: applicationId, rejection_reason }
        );

        // Create audit log
        await createAuditLog(
            profile.id,
            'UPDATE',
            'applications',
            applicationId,
            { status: currentApp.status },
            { status: 'rejected', rejection_reason }
        );

        // Notify agent
        await createNotification(
            updatedApp.agent_id,
            'Application Rejected',
            `Your declaration ${updatedApp.application_number} has been rejected. Reason: ${rejectionReason}`,
            'error',
            applicationId,
            'application'
        );

        console.log('Escalated application rejected:', updatedApp.application_number);
        return { success: true, data: updatedApp };
    } catch (error) {
        console.error('Error rejecting escalated application:', error);
        return { success: false, error: error.message };
    }
}

async function getSupervisorStatistics() {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'supervisor') {
            throw new Error('User must be a supervisor');
        }

        const [pendingEscalations, resolvedEscalations, approvedApps, rejectedApps] = await Promise.all([
            supabase.from('escalated_cases').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('escalated_cases').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('supervisor_id', profile.id).eq('status', 'approved'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('supervisor_id', profile.id).eq('status', 'rejected')
        ]);

        return {
            success: true,
            statistics: {
                pending_escalations: pendingEscalations.count || 0,
                resolved_escalations: resolvedEscalations.count || 0,
                approved: approvedApps.count || 0,
                rejected: rejectedApps.count || 0
            }
        };
    } catch (error) {
        console.error('Error fetching supervisor statistics:', error);
        return { success: false, error: error.message };
    }
}

async function getApplicationById(applicationId) {
    try {
        const { data, error } = await supabase
            .from('applications')
            .select(`
                *,
                profiles:agent_id(full_name, email, phone),
                profiles:officer_id(full_name),
                profiles:inspector_id(full_name),
                escalated_cases(*)
            `)
            .eq('id', applicationId)
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Error fetching application:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

async function createActivityLog(userId, activityType, description, metadata) {
    try {
        await supabase.from('activity_logs').insert({
            user_id: userId,
            activity_type: activityType,
            description,
            metadata
        });
    } catch (error) {
        console.error('Error creating activity log:', error);
    }
}

async function createAuditLog(userId, action, tableName, recordId, oldValues, newValues) {
    try {
        await supabase.from('audit_logs').insert({
            user_id: userId,
            action,
            table_name: tableName,
            record_id: recordId,
            old_values,
            new_values
        });
    } catch (error) {
        console.error('Error creating audit log:', error);
    }
}

async function createNotification(userId, title, message, type, referenceId, referenceType) {
    try {
        await supabase.from('notifications').insert({
            user_id: userId,
            title,
            message,
            type,
            reference_id: referenceId,
            reference_type: referenceType
        });
    } catch (error) {
        console.error('Error creating notification:', error);
    }
}

async function notifyRevenueOfficers(applicationId, applicationNumber) {
    try {
        const { data: officers } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'supervisor');

        if (officers && officers.length > 0) {
            await Promise.all(officers.map(officer =>
                createNotification(
                    officer.id,
                    'Payment Required',
                    `Application ${applicationNumber} approved and awaiting payment generation.`,
                    'info',
                    applicationId,
                    'application'
                )
            ));
        }
    } catch (error) {
        console.error('Error notifying revenue officers:', error);
    }
}

// ================================================================
// EXPORTS
// ================================================================

export {
    getEscalatedCases,
    resolveEscalation,
    approveEscalatedApplication,
    returnEscalatedApplication,
    rejectEscalatedApplication,
    getSupervisorStatistics,
    getApplicationById
};
