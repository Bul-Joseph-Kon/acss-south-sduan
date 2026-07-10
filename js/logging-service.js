// ================================================================
// LOGGING SERVICE
// ================================================================
// Handles activity_logs, audit_logs, and notifications for all actions
// ================================================================

import supabase from './supabase.js';

// ================================================================
// ACTIVITY LOGS
// ================================================================

/**
 * Create an activity log entry
 */
export async function createActivityLog(data) {
    try {
        const { error } = await supabase
            .from('activity_logs')
            .insert({
                user_id: data.user_id,
                action: data.action,
                entity_type: data.entity_type,
                entity_id: data.entity_id,
                details: data.details || {},
                ip_address: data.ip_address || null,
                user_agent: data.user_agent || null
            });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error creating activity log:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// AUDIT LOGS
// ================================================================

/**
 * Create an audit log entry
 */
export async function createAuditLog(data) {
    try {
        const { error } = await supabase
            .from('audit_logs')
            .insert({
                user_id: data.user_id,
                action: data.action,
                entity_type: data.entity_type,
                entity_id: data.entity_id,
                old_values: data.old_values || {},
                new_values: data.new_values || {},
                reason: data.reason || null
            });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error creating audit log:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// NOTIFICATIONS
// ================================================================

/**
 * Create a notification entry
 */
export async function createNotification(data) {
    try {
        const { error } = await supabase
            .from('notifications')
            .insert({
                user_id: data.user_id,
                type: data.type,
                title: data.title,
                message: data.message,
                entity_type: data.entity_type,
                entity_id: data.entity_id,
                action_url: data.action_url || null,
                priority: data.priority || 'normal'
            });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error creating notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Create notification for multiple users
 */
export async function createBulkNotifications(userIds, notificationData) {
    try {
        const notifications = userIds.map(userId => ({
            ...notificationData,
            user_id: userId
        }));

        const { error } = await supabase
            .from('notifications')
            .insert(notifications);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error creating bulk notifications:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// COMPREHENSIVE LOGGING
// ================================================================

/**
 * Log a complete action with activity log, audit log, and notifications
 */
export async function logAction(data) {
    const {
        userId,
        action,
        entityType,
        entityId,
        details,
        oldValues,
        newValues,
        reason,
        notificationRecipients,
        notificationData
    } = data;

    const results = {
        activityLog: null,
        auditLog: null,
        notifications: null
    };

    // Create activity log
    if (userId && action && entityType && entityId) {
        results.activityLog = await createActivityLog({
            user_id: userId,
            action,
            entity_type: entityType,
            entity_id: entityId,
            details: details || {}
        });
    }

    // Create audit log
    if (userId && action && entityType && entityId) {
        results.auditLog = await createAuditLog({
            user_id: userId,
            action,
            entity_type: entityType,
            entity_id: entityId,
            old_values: oldValues || {},
            new_values: newValues || {},
            reason: reason || null
        });
    }

    // Create notifications
    if (notificationRecipients && notificationRecipients.length > 0 && notificationData) {
        results.notifications = await createBulkNotifications(notificationRecipients, notificationData);
    }

    return results;
}

// ================================================================
// PRE-DEFINED LOGGING FUNCTIONS
// ================================================================

/**
 * Log application submission
 */
export async function logApplicationSubmission(applicationId, userId, applicationNumber) {
    return await logAction({
        userId,
        action: 'submit',
        entityType: 'application',
        entityId: applicationId,
        details: { application_number: applicationNumber },
        newValues: { status: 'submitted' },
        notificationRecipients: [userId],
        notificationData: {
            type: 'application_submitted',
            title: 'Application Submitted',
            message: `Your application ${applicationNumber} has been submitted successfully.`,
            entity_type: 'application',
            entity_id: applicationId,
            action_url: `/pages/agent/application-details.html?id=${applicationId}`,
            priority: 'normal'
        }
    });
}

/**
 * Log application approval
 */
export async function logApplicationApproval(applicationId, userId, applicationNumber, officerId) {
    const notificationRecipients = [userId];
    if (officerId && officerId !== userId) {
        notificationRecipients.push(officerId);
    }

    return await logAction({
        userId,
        action: 'approve',
        entityType: 'application',
        entityId: applicationId,
        details: { application_number: applicationNumber },
        oldValues: { status: 'pending_review' },
        newValues: { status: 'approved' },
        reason: 'Application approved after review',
        notificationRecipients,
        notificationData: {
            type: 'application_approved',
            title: 'Application Approved',
            message: `Application ${applicationNumber} has been approved.`,
            entity_type: 'application',
            entity_id: applicationId,
            action_url: `/pages/agent/application-details.html?id=${applicationId}`,
            priority: 'high'
        }
    });
}

/**
 * Log application rejection
 */
export async function logApplicationRejection(applicationId, userId, applicationNumber, rejectionReason) {
    return await logAction({
        userId,
        action: 'reject',
        entityType: 'application',
        entityId: applicationId,
        details: { application_number: applicationNumber, rejection_reason: rejectionReason },
        oldValues: { status: 'pending_review' },
        newValues: { status: 'rejected' },
        reason: rejectionReason,
        notificationRecipients: [userId],
        notificationData: {
            type: 'application_rejected',
            title: 'Application Rejected',
            message: `Application ${applicationNumber} has been rejected. Reason: ${rejectionReason}`,
            entity_type: 'application',
            entity_id: applicationId,
            action_url: `/pages/agent/application-details.html?id=${applicationId}`,
            priority: 'high'
        }
    });
}

/**
 * Log application return
 */
export async function logApplicationReturn(applicationId, userId, applicationNumber, returnReason) {
    return await logAction({
        userId,
        action: 'return',
        entityType: 'application',
        entityId: applicationId,
        details: { application_number: applicationNumber, return_reason: returnReason },
        oldValues: { status: 'pending_review' },
        newValues: { status: 'returned' },
        reason: returnReason,
        notificationRecipients: [userId],
        notificationData: {
            type: 'application_returned',
            title: 'Application Returned',
            message: `Application ${applicationNumber} has been returned for corrections. Reason: ${returnReason}`,
            entity_type: 'application',
            entity_id: applicationId,
            action_url: `/pages/agent/application-details.html?id=${applicationId}`,
            priority: 'high'
        }
    });
}

/**
 * Log inspection completion
 */
export async function logInspectionCompletion(applicationId, userId, applicationNumber, inspectorId) {
    const notificationRecipients = [userId];
    if (inspectorId && inspectorId !== userId) {
        notificationRecipients.push(inspectorId);
    }

    return await logAction({
        userId,
        action: 'complete_inspection',
        entityType: 'application',
        entityId: applicationId,
        details: { application_number: applicationNumber },
        oldValues: { status: 'under_inspection' },
        newValues: { status: 'approved' },
        reason: 'Inspection completed successfully',
        notificationRecipients,
        notificationData: {
            type: 'inspection_completed',
            title: 'Inspection Completed',
            message: `Inspection for application ${applicationNumber} has been completed.`,
            entity_type: 'application',
            entity_id: applicationId,
            action_url: `/pages/agent/application-details.html?id=${applicationId}`,
            priority: 'normal'
        }
    });
}

/**
 * Log payment confirmation
 */
export async function logPaymentConfirmation(applicationId, userId, applicationNumber, paymentId, amount) {
    return await logAction({
        userId,
        action: 'confirm_payment',
        entityType: 'payment',
        entityId: paymentId,
        details: { application_number: applicationNumber, amount },
        newValues: { status: 'paid' },
        reason: 'Payment confirmed',
        notificationRecipients: [userId],
        notificationData: {
            type: 'payment_confirmed',
            title: 'Payment Confirmed',
            message: `Payment of ${amount} for application ${applicationNumber} has been confirmed.`,
            entity_type: 'payment',
            entity_id: paymentId,
            action_url: `/pages/agent/application-details.html?id=${applicationId}`,
            priority: 'high'
        }
    });
}

/**
 * Log escalation creation
 */
export async function logEscalationCreation(applicationId, userId, escalatedToId, escalationReason, applicationNumber) {
    return await logAction({
        userId,
        action: 'escalate',
        entityType: 'escalated_case',
        entityId: applicationId,
        details: { application_number: applicationNumber, escalation_reason: escalationReason },
        newValues: { status: 'escalated' },
        reason: escalationReason,
        notificationRecipients: [escalatedToId],
        notificationData: {
            type: 'case_escalated',
            title: 'Case Escalated',
            message: `Application ${applicationNumber} has been escalated to your attention. Reason: ${escalationReason}`,
            entity_type: 'application',
            entity_id: applicationId,
            action_url: `/pages/supervisor/escalated-cases.html?id=${applicationId}`,
            priority: 'urgent'
        }
    });
}

/**
 * Log escalation resolution
 */
export async function logEscalationResolution(applicationId, userId, resolutionNotes, applicationNumber) {
    return await logAction({
        userId,
        action: 'resolve_escalation',
        entityType: 'escalated_case',
        entityId: applicationId,
        details: { application_number: applicationNumber, resolution_notes: resolutionNotes },
        oldValues: { status: 'escalated' },
        newValues: { status: 'resolved' },
        reason: resolutionNotes,
        notificationRecipients: [userId],
        notificationData: {
            type: 'escalation_resolved',
            title: 'Escalation Resolved',
            message: `Escalation for application ${applicationNumber} has been resolved.`,
            entity_type: 'application',
            entity_id: applicationId,
            action_url: `/pages/agent/application-details.html?id=${applicationId}`,
            priority: 'normal'
        }
    });
}
