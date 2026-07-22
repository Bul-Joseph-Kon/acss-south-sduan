// ================================================================
// CUSTOMS OFFICER SERVICE
// ================================================================
// Handles officer review workflow: approve, return, reject, send for inspection
// ================================================================

import supabase from './supabase.js';
import { getCurrentUser, getUserProfile } from './auth.js';

// ================================================================
// OFFICER REVIEW FUNCTIONS
// ================================================================

async function getPendingReviewApplications() {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'officer') {
            throw new Error('User must be an officer');
        }

        const { data, error } = await supabase
            .from('applications')
            .select(`
                *,
                agent_profile:profiles!agent_id(full_name, email),
                ai_validation_results!ai_validation_results_application_id_fkey(*)
            `)
            .in('status', ['under_review', 'under_inspection'])
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Error fetching pending review applications:', error);
        return { success: false, error: error.message };
    }
}

async function approveApplication(applicationId, notes) {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'officer') {
            throw new Error('User must be an officer');
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
                officer_id: profile.id,
                approved_at: new Date().toISOString(),
                reviewed_at: new Date().toISOString(),
                notes: notes || currentApp.notes
            })
            .eq('id', applicationId)
            .select()
            .single();

        if (error) throw error;

        // Log workflow transition
        await supabase.from('workflow_logs').insert({
            application_id: applicationId,
            from_status: currentApp.status,
            to_status: 'approved',
            action: 'application_approved',
            notes: notes || 'Application approved by officer',
            performed_by: profile.id
        });

        // Create activity log
        await createActivityLog(
            profile.id,
            'application_approved',
            `Application ${updatedApp.application_number} approved by officer`,
            { application_id: applicationId, application_number: updatedApp.application_number }
        );

        // Create audit log
        await createAuditLog(
            profile.id,
            'UPDATE',
            'applications',
            applicationId,
            { status: currentApp.status },
            { status: 'approved', officer_id: profile.id }
        );

        // Notify agent
        await createNotification(
            updatedApp.agent_id,
            'Application Approved',
            `Your declaration ${updatedApp.application_number} has been approved. Proceed to payment.`,
            'success',
            applicationId,
            'application'
        );

        // Notify revenue officer (in production, would notify specific revenue officer)
        await notifyRevenueOfficers(applicationId, updatedApp.application_number);

        console.log('Application approved:', updatedApp.application_number);
        return { success: true, data: updatedApp };
    } catch (error) {
        console.error('Error approving application:', error);
        return { success: false, error: error.message };
    }
}

async function returnApplication(applicationId, returnReason, notes) {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'officer') {
            throw new Error('User must be an officer');
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
                officer_id: profile.id,
                reviewed_at: new Date().toISOString(),
                return_reason: returnReason,
                notes: notes || currentApp.notes
            })
            .eq('id', applicationId)
            .select()
            .single();

        if (error) throw error;

        // Log workflow transition
        await supabase.from('workflow_logs').insert({
            application_id: applicationId,
            from_status: currentApp.status,
            to_status: 'returned',
            action: 'application_returned',
            notes: returnReason,
            performed_by: profile.id
        });

        // Create activity log
        await createActivityLog(
            profile.id,
            'application_returned',
            `Application ${updatedApp.application_number} returned to agent: ${returnReason}`,
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

        console.log('Application returned:', updatedApp.application_number);
        return { success: true, data: updatedApp };
    } catch (error) {
        console.error('Error returning application:', error);
        return { success: false, error: error.message };
    }
}

async function rejectApplication(applicationId, rejectionReason, notes) {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'officer') {
            throw new Error('User must be an officer');
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
                officer_id: profile.id,
                reviewed_at: new Date().toISOString(),
                rejection_reason: rejectionReason,
                notes: notes || currentApp.notes
            })
            .eq('id', applicationId)
            .select()
            .single();

        if (error) throw error;

        // Log workflow transition
        await supabase.from('workflow_logs').insert({
            application_id: applicationId,
            from_status: currentApp.status,
            to_status: 'rejected',
            action: 'application_rejected',
            notes: rejectionReason,
            performed_by: profile.id
        });

        // Create activity log
        await createActivityLog(
            profile.id,
            'application_rejected',
            `Application ${updatedApp.application_number} rejected: ${rejectionReason}`,
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

        console.log('Application rejected:', updatedApp.application_number);
        return { success: true, data: updatedApp };
    } catch (error) {
        console.error('Error rejecting application:', error);
        return { success: false, error: error.message };
    }
}

async function sendForInspection(applicationId, inspectionType, notes) {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'officer') {
            throw new Error('User must be an officer');
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
                status: 'under_inspection',
                officer_id: profile.id,
                reviewed_at: new Date().toISOString(),
                inspection_required: true,
                inspection_type: inspectionType,
                notes: notes || currentApp.notes
            })
            .eq('id', applicationId)
            .select()
            .single();

        if (error) throw error;

        // Log workflow transition
        await supabase.from('workflow_logs').insert({
            application_id: applicationId,
            from_status: currentApp.status,
            to_status: 'under_inspection',
            action: 'inspection_assigned',
            notes: `${inspectionType} inspection requested`,
            performed_by: profile.id
        });

        // Create activity log
        await createActivityLog(
            profile.id,
            'inspection_requested',
            `Application ${updatedApp.application_number} sent for ${inspectionType} inspection`,
            { application_id: applicationId, inspection_type: inspectionType }
        );

        // Create audit log
        await createAuditLog(
            profile.id,
            'UPDATE',
            'applications',
            applicationId,
            { status: currentApp.status },
            { status: 'under_inspection', inspection_type: inspectionType }
        );

        // Notify agent
        await createNotification(
            updatedApp.agent_id,
            'Inspection Required',
            `Your declaration ${updatedApp.application_number} requires ${inspectionType} inspection.`,
            'warning',
            applicationId,
            'application'
        );

        // Notify inspectors (in production, would notify specific inspectors)
        await notifyInspectors(applicationId, updatedApp.application_number, inspectionType);

        console.log('Application sent for inspection:', updatedApp.application_number);
        return { success: true, data: updatedApp };
    } catch (error) {
        console.error('Error sending for inspection:', error);
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
                risk_assessments(risk_level, overall_score, recommendations),
                ai_validation_results!ai_validation_results_application_id_fkey(validation_type, status, results)
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

async function getOfficerStatistics() {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'officer') {
            throw new Error('User must be an officer');
        }

        const [pendingResult, approvedResult, rejectedResult, returnedResult, inspectionResult] = await Promise.all([
            supabase.from('applications').select('*', { count: 'exact', head: true }).in('status', ['under_review', 'pending_review', 'submitted']),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'returned'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'under_inspection')
        ]);

        return {
            success: true,
            statistics: {
                pending_review: pendingResult.count || 0,
                approved: approvedResult.count || 0,
                rejected: rejectedResult.count || 0,
                returned: returnedResult.count || 0,
                under_inspection: inspectionResult.count || 0
            }
        };
    } catch (error) {
        console.error('Error fetching officer statistics:', error);
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
        // Get all revenue officers
        const { data: officers } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'supervisor'); // Using supervisor for now, should be revenue_officer

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

async function notifyInspectors(applicationId, applicationNumber, inspectionType) {
    try {
        // Get all inspectors
        const { data: inspectors } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'inspector');

        if (inspectors && inspectors.length > 0) {
            await Promise.all(inspectors.map(inspector =>
                createNotification(
                    inspector.id,
                    'New Inspection Assignment',
                    `Application ${applicationNumber} requires ${inspectionType} inspection.`,
                    'info',
                    applicationId,
                    'application'
                )
            ));
        }
    } catch (error) {
        console.error('Error notifying inspectors:', error);
    }
}

async function escalateApplication(applicationId, reason, priority = 'high', notes = '') {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'officer') {
            throw new Error('User must be a customs officer');
        }

        const { data: currentApp, error: fetchError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (fetchError) throw fetchError;

        const { data: updatedApp, error: updateError } = await supabase
            .from('applications')
            .update({
                status: 'escalated',
                officer_id: profile.id,
                escalated: true,
                escalated_at: new Date().toISOString(),
                escalated_by: profile.id,
                notes: notes || currentApp.notes
            })
            .eq('id', applicationId)
            .select()
            .single();

        if (updateError) throw updateError;

        await supabase
            .from('escalated_cases')
            .insert({
                application_id: applicationId,
                trader_id: currentApp.user_id,
                assigned_officer_id: profile.id,
                reason: reason || 'Escalated by officer for supervisor review',
                priority: priority || 'high',
                status: 'open',
                notes: notes
            });

        await supabase.from('workflow_logs').insert({
            application_id: applicationId,
            from_status: currentApp.status,
            to_status: 'escalated',
            action: 'application_escalated',
            notes: reason,
            performed_by: profile.id
        });

        await createActivityLog(
            profile.id,
            'application_escalated',
            `Application ${currentApp.application_number} escalated to supervisor: ${reason}`,
            { application_id: applicationId, reason, priority }
        );

        await createAuditLog(
            profile.id,
            'UPDATE',
            'applications',
            applicationId,
            { status: currentApp.status },
            { status: 'escalated', escalated_by: profile.id }
        );

        const { data: supervisors } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'supervisor');

        if (supervisors) {
            for (const supervisor of supervisors) {
                await createNotification(
                    supervisor.id,
                    'Escalated Case Assigned',
                    `Declaration ${currentApp.application_number} has been escalated for your review. Reason: ${reason}`,
                    'warning',
                    applicationId,
                    'application'
                );
            }
        }

        console.log('Application escalated:', currentApp.application_number);
        return { success: true, data: updatedApp };
    } catch (error) {
        console.error('Error escalating application:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// EXPORTS
// ================================================================

export {
    getPendingReviewApplications,
    approveApplication,
    returnApplication,
    rejectApplication,
    sendForInspection,
    escalateApplication,
    getApplicationById,
    getOfficerStatistics
};

