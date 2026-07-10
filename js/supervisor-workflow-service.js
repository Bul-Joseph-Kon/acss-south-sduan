// ================================================================
// SUPERVISOR WORKFLOW SERVICE
// ================================================================
// Handles Supervisor workflow operations for escalated cases
// ================================================================

import supabase from './supabase.js';
import { getUserProfile } from './auth.js';
import { logEscalationResolution, logApplicationApproval } from './logging-service.js';

// ================================================================
// SUPERVISOR OPERATIONS
// ================================================================

/**
 * Resolve an escalated case and approve the application
 */
export async function resolveEscalation(applicationId, resolutionNotes, action = 'approve') {
    try {
        const profile = await getUserProfile();
        if (!profile) {
            return { success: false, error: 'User profile not found' };
        }

        // Get application and escalation details
        const { data: application, error: fetchError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (fetchError) throw fetchError;
        if (!application) throw new Error('Application not found');

        // Get escalation record
        const { data: escalation, error: escalationError } = await supabase
            .from('escalated_cases')
            .select('*')
            .eq('application_id', applicationId)
            .eq('status', 'pending')
            .single();

        if (escalationError || !escalation) {
            // No pending escalation found, proceed with action
        }

        if (!resolutionNotes || resolutionNotes.trim() === '') {
            return { success: false, error: 'Resolution notes are required' };
        }

        // Update escalation record if exists
        if (escalation) {
            const { error: updateEscalationError } = await supabase
                .from('escalated_cases')
                .update({
                    status: 'resolved',
                    resolved_by: profile.id,
                    resolved_at: new Date().toISOString(),
                    resolution_notes: resolutionNotes
                })
                .eq('id', escalation.id);

            if (updateEscalationError) throw updateEscalationError;
        }

        // Perform the requested action
        let newStatus = 'approved';
        if (action === 'reject') {
            newStatus = 'rejected';
        } else if (action === 'return') {
            newStatus = 'returned';
        }

        // Update application status
        const { error: updateError } = await supabase
            .from('applications')
            .update({
                status: newStatus,
                supervisor_id: profile.id,
                approved_at: new Date().toISOString(),
                notes: resolutionNotes
            })
            .eq('id', applicationId);

        if (updateError) throw updateError;

        // Log the resolution
        await logEscalationResolution(
            applicationId,
            profile.id,
            resolutionNotes,
            application.application_number
        );

        // If approved, also log as approval
        if (action === 'approve') {
            await logApplicationApproval(
                applicationId,
                application.agent_id || application.user_id,
                application.application_number,
                profile.id
            );
        }

        const actionText = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'returned';
        return { success: true, message: `Escalation resolved and application ${actionText}` };
    } catch (error) {
        console.error('Error resolving escalation:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Reject an escalated case
 */
export async function rejectEscalatedCase(applicationId, rejectionReason) {
    return await resolveEscalation(applicationId, rejectionReason, 'reject');
}

/**
 * Return an escalated case to agent
 */
export async function returnEscalatedCase(applicationId, returnReason) {
    return await resolveEscalation(applicationId, returnReason, 'return');
}

/**
 * Fetch escalated cases assigned to supervisor
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
                applications (*),
                escalated_by_profile:profiles!escalated_cases_escalated_by_fkey (full_name, email),
                escalated_to_profile:profiles!escalated_cases_escalated_to_fkey (full_name, email)
            `)
            .eq('escalated_to', profile.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error fetching escalated cases:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetch all escalated cases (for supervisors)
 */
export async function fetchAllEscalatedCases() {
    try {
        const profile = await getUserProfile();
        if (!profile) {
            return { success: false, error: 'User profile not found' };
        }

        const { data, error } = await supabase
            .from('escalated_cases')
            .select(`
                *,
                applications (*),
                escalated_by_profile:profiles!escalated_cases_escalated_by_fkey (full_name, email)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error fetching all escalated cases:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Add notes to an escalated case
 */
export async function addEscalationNotes(escalationId, notes) {
    try {
        const profile = await getUserProfile();
        if (!profile) {
            return { success: false, error: 'User profile not found' };
        }

        const { error } = await supabase
            .from('escalated_cases')
            .update({
                resolution_notes: notes
            })
            .eq('id', escalationId);

        if (error) throw error;

        return { success: true, message: 'Notes added to escalation' };
    } catch (error) {
        console.error('Error adding escalation notes:', error);
        return { success: false, error: error.message };
    }
}
