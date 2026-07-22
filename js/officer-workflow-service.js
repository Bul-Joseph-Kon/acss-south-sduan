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
import { generateInvoice } from './payment-service.js';

async function createNotification(userId, title, message, type = 'info', referenceId = null, referenceType = null) {
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

        // Check if application requires supervisor escalation
        const requiresEscalation = application.declared_value > 100000 || // High value threshold
                                   application.risk_assessments?.[0]?.risk_level === 'high' ||
                                   application.requires_supervisor_review;

        // Update application status
        const newStatus = requiresEscalation ? 'pending_supervisor' : 'awaiting_payment';
        
        const { error: updateError } = await supabase
            .from('applications')
            .update({
                status: newStatus,
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

        // If not escalated, generate invoice automatically
        if (!requiresEscalation) {
            await generateInvoice(applicationId);
            
            // Notify agent
            await createNotification(
                application.agent_id || application.user_id,
                'Declaration Approved',
                `Your declaration ${application.application_number} has been approved. Invoice has been generated.`,
                'success',
                applicationId,
                'application'
            );
        } else {
            // Create escalation record
            await supabase.from('escalated_cases').insert({
                application_id: applicationId,
                escalation_reason: requiresEscalation ? 'high_value_or_risk' : 'manual_review',
                escalated_by: profile.id,
                status: 'pending'
            });
            
            // Notify supervisor
            await createNotification(
                profile.id,
                'Application Escalated',
                `Application ${application.application_number} has been escalated for supervisor review.`,
                'warning',
                applicationId,
                'application'
            );
        }

        return { success: true, message: 'Application approved and invoice generated' };
    } catch (error) {
        console.error('Error approving application:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Approve and send to inspection (if inspection is required)
 */
export async function approveAndSendToInspection(applicationId, notes = '') {
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

        // Update application status to under_inspection
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

        // Notify agent
        await createNotification(
            application.agent_id || application.user_id,
            'Declaration Returned',
            `Your declaration ${application.application_number} has been returned for corrections. Reason: ${returnReason}`,
            'warning',
            applicationId,
            'application'
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

        // Notify agent
        await createNotification(
            application.agent_id || application.user_id,
            'Declaration Rejected',
            `Your declaration ${application.application_number} has been rejected. Reason: ${rejectionReason}`,
            'error',
            applicationId,
            'application'
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
