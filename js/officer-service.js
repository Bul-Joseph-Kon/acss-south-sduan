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
                profiles:agent_id(full_name, email),
                risk_assessments(risk_level, overall_score)
            `)
            .eq('status', 'pending_review')
            .order('submitted_at', { ascending: false });

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
                inspection_type: inspectionType,
                notes: notes || currentApp.notes
            })
            .eq('id', applicationId)
            .select()
            .single();

        if (error) throw error;

        // Create activity log
        await createActivityLog(
            profile.id,
            'inspection_requested',
            `Application ${updatedApp.application_number} sent for ${inspectionType} inspection`,
            { application_id: applicationId, inspection_type }
        );

        // Create audit log
        await createAuditLog(
            profile.id,
            'UPDATE',
            'applications',
            applicationId,
            { status: currentApp.status },
            { status: 'under_inspection', inspection_type }
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
                ai_validation_results(validation_type, status, results)
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
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'pending_review'),
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

// ================================================================
// EXPORTS
// ================================================================

export {
    getPendingReviewApplications,
    approveApplication,
    returnApplication,
    rejectApplication,
    sendForInspection,
    getApplicationById,
    getOfficerStatistics
};
