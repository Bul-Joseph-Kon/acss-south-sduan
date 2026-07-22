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
            .from('applications')
            .select(`
                *,
                agent_profile:profiles!agent_id(full_name, email),
                officer_profile:profiles!officer_id(full_name),
                ai_validation_results!ai_validation_results_application_id_fkey(*)
            `)
            .eq('status', 'escalated')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Error fetching escalated cases:', error);
        return { success: false, error: error.message };
    }
}

async function resolveEscalation(applicationId, resolution, resolutionNotes) {
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

        // Update application based on resolution
        let newStatus = '';
        let applicationUpdate = {};
        if (resolution === 'approve') {
            newStatus = 'approved';
            applicationUpdate = { 
                status: 'approved', 
                approved_at: new Date().toISOString(),
                supervisor_id: profile.id
            };
        } else if (resolution === 'return') {
            newStatus = 'returned';
            applicationUpdate = { 
                status: 'returned', 
                return_reason: resolutionNotes,
                supervisor_id: profile.id
            };
        } else if (resolution === 'reject') {
            newStatus = 'rejected';
            applicationUpdate = { 
                status: 'rejected', 
                rejection_reason: resolutionNotes,
                supervisor_id: profile.id
            };
        }

        if (Object.keys(applicationUpdate).length > 0) {
            const { error } = await supabase
                .from('applications')
                .update(applicationUpdate)
                .eq('id', applicationId);
            
            if (error) throw error;
        }

        // Log workflow transition
        await supabase.from('workflow_logs').insert({
            application_id: applicationId,
            from_status: 'escalated',
            to_status: newStatus,
            action: `escalation_${resolution}`,
            notes: resolutionNotes,
            performed_by: profile.id
        });

        // Create activity log
        await createActivityLog(
            profile.id,
            'escalation_resolved',
            `Escalation for application ${currentApp.application_number} resolved with action: ${resolution}`,
            { application_id: applicationId, resolution, resolution_notes: resolutionNotes }
        );

        // Create audit log
        await createAuditLog(
            profile.id,
            'UPDATE',
            'applications',
            applicationId,
            { status: currentApp.status },
            { status: newStatus, supervisor_id: profile.id }
        );

        // Notify agent
        await createNotification(
            currentApp.agent_id,
            `Escalation ${resolution.charAt(0).toUpperCase() + resolution.slice(1)}`,
            `Your application ${currentApp.application_number} escalation has been ${resolution} by supervisor.`,
            resolution === 'approve' ? 'success' : 'warning',
            applicationId,
            'application'
        );

        // Notify customs officer
        if (currentApp.officer_id) {
            await createNotification(
                currentApp.officer_id,
                `Escalation ${resolution.charAt(0).toUpperCase() + resolution.slice(1)}`,
                `Escalation for application ${currentApp.application_number} has been ${resolution} by supervisor.`,
                'info',
                applicationId,
                'application'
            );
        }

        console.log('Escalation resolved:', currentApp.application_number, resolution);
        return { success: true, data: { status: newStatus } };
    } catch (error) {
        console.error('Error resolving escalation:', error);
        return { success: false, error: error.message };
    }
}

async function getSupervisorStatistics() {
    try {
        const { data, error } = await supabase
            .from('applications')
            .select('status')
            .in('status', ['escalated', 'approved', 'rejected']);

        if (error) throw error;

        const stats = {
            pending_escalations: data.filter(a => a.status === 'escalated').length,
            resolved_escalations: 0, // Would need to track resolved escalations separately
            approved: data.filter(a => a.status === 'approved').length,
            rejected: data.filter(a => a.status === 'rejected').length
        };

        return { success: true, statistics: stats };
    } catch (error) {
        console.error('Error fetching supervisor statistics:', error);
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

async function overrideOfficerDecision(applicationId, newDecision, reason) {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'supervisor') {
            throw new Error('User must be a supervisor');
        }

        const { data: currentApp, error: fetchError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (fetchError) throw fetchError;
        if (!currentApp) throw new Error('Application not found');

        let validStatus = newDecision;
        if (newDecision === 'approve') validStatus = 'approved';
        else if (newDecision === 'return') validStatus = 'returned';
        else if (newDecision === 'reject') validStatus = 'rejected';

        const { data: updatedApp, error: updateError } = await supabase
            .from('applications')
            .update({
                status: validStatus,
                supervisor_id: profile.id,
                updated_at: new Date().toISOString(),
                notes: `Supervisor override: ${reason}`
            })
            .eq('id', applicationId)
            .select()
            .single();

        if (updateError) throw updateError;

        await supabase.from('workflow_logs').insert({
            application_id: applicationId,
            from_status: currentApp.status,
            to_status: validStatus,
            action: 'supervisor_override',
            notes: `Supervisor override to ${validStatus}: ${reason}`,
            performed_by: profile.id
        });

        await createActivityLog(
            profile.id,
            'supervisor_override',
            `Supervisor overridden officer decision for application ${currentApp.application_number} to ${validStatus}`,
            { application_id: applicationId, newStatus: validStatus, reason }
        );

        await createAuditLog(
            profile.id,
            'UPDATE',
            'applications',
            applicationId,
            { status: currentApp.status },
            { status: validStatus, supervisor_id: profile.id, override_reason: reason }
        );

        await createNotification(
            currentApp.agent_id,
            `Application ${validStatus.charAt(0).toUpperCase() + validStatus.slice(1)} (Supervisor Review)`,
            `Your application ${currentApp.application_number} has been updated to ${validStatus} following supervisor review.`,
            validStatus === 'approved' ? 'success' : 'warning',
            applicationId,
            'application'
        );

        return { success: true, data: updatedApp };
    } catch (error) {
        console.error('Error overriding decision:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// EXPORT FUNCTIONS
// ================================================================

export {
    getEscalatedCases,
    resolveEscalation,
    overrideOfficerDecision,
    getSupervisorStatistics
};

