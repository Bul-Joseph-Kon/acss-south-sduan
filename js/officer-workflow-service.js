// ================================================================
// OFFICER WORKFLOW SERVICE
// ================================================================
// Handles Customs Officer workflow operations
// ================================================================

import supabase from './supabase.js';
import { getUserProfile } from './auth.js';
import { 
    logApplicationApproval, 
    logApplicationRejection, 
    logApplicationReturn 
} from './logging-service.js';

// ================================================================
// OFFICER OPERATIONS
// ================================================================

/**
 * Approve an application and send it to inspection
 */
export async function approveApplication(applicationId, notes = '') {
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

        // Update application status
        const { error: updateError } = await supabase
            .from('applications')
            .update({
                status: 'under_inspection',
                officer_id: profile.id,
                reviewed_at: new Date().toISOString(),
                notes: notes || application.notes
            })
            .eq('id', applicationId);

        if (updateError) throw updateError;

        // Log the approval
        await logApplicationApproval(
            applicationId, 
            application.agent_id || application.user_id, 
            application.application_number,
            profile.id
        );

        return { success: true, message: 'Application approved and sent for inspection' };
    } catch (error) {
        console.error('Error approving application:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Return an application to the agent for corrections
 */
export async function returnApplication(applicationId, returnReason) {
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

        if (!returnReason || returnReason.trim() === '') {
            return { success: false, error: 'Return reason is required' };
        }

        // Update application status
        const { error: updateError } = await supabase
            .from('applications')
            .update({
                status: 'returned',
                officer_id: profile.id,
                reviewed_at: new Date().toISOString(),
                return_reason: returnReason
            })
            .eq('id', applicationId);

        if (updateError) throw updateError;

        // Log the return
        await logApplicationReturn(
            applicationId,
            application.agent_id || application.user_id,
            application.application_number,
            returnReason
        );

        return { success: true, message: 'Application returned to agent' };
    } catch (error) {
        console.error('Error returning application:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Reject an application
 */
export async function rejectApplication(applicationId, rejectionReason) {
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

        if (!rejectionReason || rejectionReason.trim() === '') {
            return { success: false, error: 'Rejection reason is required' };
        }

        // Update application status
        const { error: updateError } = await supabase
            .from('applications')
            .update({
                status: 'rejected',
                officer_id: profile.id,
                reviewed_at: new Date().toISOString(),
                rejection_reason: rejectionReason
            })
            .eq('id', applicationId);

        if (updateError) throw updateError;

        // Log the rejection
        await logApplicationRejection(
            applicationId,
            application.agent_id || application.user_id,
            application.application_number,
            rejectionReason
        );

        return { success: true, message: 'Application rejected' };
    } catch (error) {
        console.error('Error rejecting application:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetch pending review applications for officer
 */
export async function fetchPendingReviewApplications() {
    try {
        const profile = await getUserProfile();
        if (!profile) {
            return { success: false, error: 'User profile not found' };
        }

        const { data, error } = await supabase
            .from('applications')
            .select('*')
            .eq('status', 'pending_review')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error fetching pending review applications:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetch applications assigned to the officer
 */
export async function fetchAssignedApplications() {
    try {
        const profile = await getUserProfile();
        if (!profile) {
            return { success: false, error: 'User profile not found' };
        }

        const { data, error } = await supabase
            .from('applications')
            .select('*')
            .eq('officer_id', profile.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error fetching assigned applications:', error);
        return { success: false, error: error.message };
    }
}
