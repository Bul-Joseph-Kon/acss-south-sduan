// ================================================================
// INSPECTOR WORKFLOW SERVICE
// ================================================================
// Handles Inspector workflow operations
// ================================================================

import supabase from './supabase.js';
import { getUserProfile } from './auth.js';
import { logInspectionCompletion, logEscalationCreation } from './logging-service.js';

// ================================================================
// INSPECTOR OPERATIONS
// ================================================================

/**
 * Complete inspection and approve application
 */
export async function completeInspection(applicationId, inspectionReport, evidenceDocuments = []) {
    try {
        const profile = await getUserProfile();
        if (!profile) {
            return { success: false, error: 'User profile not found' };
        }

        // Get application details
        const { data: application, error: fetchError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (fetchError) throw fetchError;
        if (!application) throw new Error('Application not found');

        // Update application with inspection results
        const { error: updateError } = await supabase
            .from('applications')
            .update({
                status: 'approved',
                inspector_id: profile.id,
                inspected_at: new Date().toISOString(),
                inspection_report: inspectionReport,
                inspection_completed_at: new Date().toISOString()
            })
            .eq('id', applicationId);

        if (updateError) throw updateError;

        // Upload evidence documents if provided
        if (evidenceDocuments.length > 0) {
            for (const doc of evidenceDocuments) {
                await supabase
                    .from('documents')
                    .insert({
                        application_id: applicationId,
                        user_id: profile.id,
                        document_type: doc.type,
                        file_name: doc.name,
                        file_url: doc.url,
                        file_size: doc.size
                    });
            }
        }

        // Log the inspection completion
        await logInspectionCompletion(
            applicationId,
            application.agent_id || application.user_id,
            application.application_number,
            profile.id
        );

        return { success: true, message: 'Inspection completed and application approved' };
    } catch (error) {
        console.error('Error completing inspection:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Escalate a case to supervisor
 */
export async function escalateCase(applicationId, escalationReason, escalationType = 'inspection') {
    try {
        const profile = await getUserProfile();
        if (!profile) {
            return { success: false, error: 'User profile not found' };
        }

        // Get application details
        const { data: application, error: fetchError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (fetchError) throw fetchError;
        if (!application) throw new Error('Application not found');

        if (!escalationReason || escalationReason.trim() === '') {
            return { success: false, error: 'Escalation reason is required' };
        }

        // Find a supervisor to escalate to
        const { data: supervisors, error: supervisorError } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'supervisor')
            .limit(1);

        if (supervisorError || !supervisors || supervisors.length === 0) {
            return { success: false, error: 'No supervisor available to escalate to' };
        }

        const supervisorId = supervisors[0].id;

        // Create escalation record
        const { error: escalationError } = await supabase
            .from('escalated_cases')
            .insert({
                application_id: applicationId,
                escalated_by: profile.id,
                escalated_to: supervisorId,
                escalation_reason: escalationReason,
                escalation_type: escalationType,
                priority: 'high',
                status: 'pending'
            });

        if (escalationError) throw escalationError;

        // Update application status
        const { error: updateError } = await supabase
            .from('applications')
            .update({
                status: 'escalated',
                inspector_id: profile.id,
                inspected_at: new Date().toISOString()
            })
            .eq('id', applicationId);

        if (updateError) throw updateError;

        // Log the escalation
        await logEscalationCreation(
            applicationId,
            profile.id,
            supervisorId,
            escalationReason,
            application.application_number
        );

        return { success: true, message: 'Case escalated to supervisor' };
    } catch (error) {
        console.error('Error escalating case:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Record inspection notes without completing
 */
export async function recordInspectionNotes(applicationId, notes) {
    try {
        const profile = await getUserProfile();
        if (!profile) {
            return { success: false, error: 'User profile not found' };
        }

        const { error } = await supabase
            .from('applications')
            .update({
                inspector_id: profile.id,
                inspection_report: { notes },
                notes: notes
            })
            .eq('id', applicationId);

        if (error) throw error;

        return { success: true, message: 'Inspection notes recorded' };
    } catch (error) {
        console.error('Error recording inspection notes:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetch under inspection applications
 */
export async function fetchUnderInspectionApplications() {
    try {
        const profile = await getUserProfile();
        if (!profile) {
            return { success: false, error: 'User profile not found' };
        }

        const { data, error } = await supabase
            .from('applications')
            .select('*')
            .eq('status', 'under_inspection')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error fetching under inspection applications:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetch escalated cases assigned to inspector
 */
export async function fetchEscalatedCases() {
    try {
        const profile = await getUserProfile();
        if (!profile) {
            return { success: false, error: 'User profile not found' };
        }

        const { data, error } = await supabase
            .from('escalated_cases')
            .select(`
                *,
                applications (*)
            `)
            .eq('escalated_by', profile.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error fetching escalated cases:', error);
        return { success: false, error: error.message };
    }
}
