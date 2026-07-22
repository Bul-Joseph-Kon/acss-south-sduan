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

/**
 * Log goods item creation
 */
export async function logGoodsItemCreated(goodsItemId, userId, applicationId, itemNumber, hsCode) {
    return await logAction({
        userId,
        action: 'create_goods_item',
        entityType: 'application_goods',
        entityId: goodsItemId,
        details: { application_id: applicationId, item_number: itemNumber, hs_code: hsCode },
        newValues: { item_number: itemNumber, hs_code: hsCode },
        reason: 'Goods item added to declaration',
        notificationRecipients: [userId],
        notificationData: {
            type: 'goods_item_added',
            title: 'Goods Item Added',
            message: `Goods item #${itemNumber} (HS Code: ${hsCode}) has been added to your declaration.`,
            entity_type: 'application_goods',
            entity_id: goodsItemId,
            action_url: `/pages/agent/create-declaration.html?id=${applicationId}`,
            priority: 'normal'
        }
    });
}

/**
 * Log goods item update
 */
export async function logGoodsItemUpdated(goodsItemId, userId, applicationId, itemNumber, hsCode) {
    return await logAction({
        userId,
        action: 'update_goods_item',
        entityType: 'application_goods',
        entityId: goodsItemId,
        details: { application_id: applicationId, item_number: itemNumber, hs_code: hsCode },
        reason: 'Goods item details updated',
        notificationRecipients: [userId],
        notificationData: {
            type: 'goods_item_updated',
            title: 'Goods Item Updated',
            message: `Goods item #${itemNumber} (HS Code: ${hsCode}) has been updated.`,
            entity_type: 'application_goods',
            entity_id: goodsItemId,
            action_url: `/pages/agent/create-declaration.html?id=${applicationId}`,
            priority: 'normal'
        }
    });
}

/**
 * Log goods item deletion
 */
export async function logGoodsItemDeleted(goodsItemId, userId, applicationId, itemNumber, hsCode) {
    return await logAction({
        userId,
        action: 'delete_goods_item',
        entityType: 'application_goods',
        entityId: goodsItemId,
        details: { application_id: applicationId, item_number: itemNumber, hs_code: hsCode },
        oldValues: { item_number: itemNumber, hs_code: hsCode },
        reason: 'Goods item removed from declaration',
        notificationRecipients: [userId],
        notificationData: {
            type: 'goods_item_deleted',
            title: 'Goods Item Deleted',
            message: `Goods item #${itemNumber} (HS Code: ${hsCode}) has been removed from your declaration.`,
            entity_type: 'application_goods',
            entity_id: goodsItemId,
            action_url: `/pages/agent/create-declaration.html?id=${applicationId}`,
            priority: 'normal'
        }
    });
}

// ================================================================
// AI VALIDATION LOGGING
// ================================================================

/**
 * Log AI validation started
 */
export async function logAIValidationStarted(applicationId, userId, applicationNumber) {
    return await createActivityLog({
        user_id: userId,
        action: 'ai_validation_started',
        entity_type: 'application',
        entity_id: applicationId,
        details: { application_number: applicationNumber }
    });
}

/**
 * Log AI validation completed
 */
export async function logAIValidationCompleted(applicationId, userId, applicationNumber, validationResults) {
    return await createActivityLog({
        user_id: userId,
        action: 'ai_validation_completed',
        entity_type: 'application',
        entity_id: applicationId,
        details: {
            application_number: applicationNumber,
            overall_score: validationResults.overall_score,
            risk_level: validationResults.risk_level,
            processing_time_ms: validationResults.processing_time_ms
        }
    });
}

/**
 * Log OCR processing
 */
export async function logOCRProcessing(applicationId, userId, documentCount, extractedFields) {
    return await createActivityLog({
        user_id: userId,
        action: 'ocr_processing',
        entity_type: 'application',
        entity_id: applicationId,
        details: {
            documents_processed: documentCount,
            fields_extracted: extractedFields
        }
    });
}

/**
 * Log HS code verification
 */
export async function logHSCodeVerification(applicationId, userId, hsCode, suggestedCode, confidence) {
    return await createActivityLog({
        user_id: userId,
        action: 'hs_code_verification',
        entity_type: 'application',
        entity_id: applicationId,
        details: {
            declared_hs_code: hsCode,
            suggested_hs_code: suggestedCode,
            confidence_score: confidence
        }
    });
}

/**
 * Log tax calculation
 */
export async function logTaxCalculation(applicationId, userId, taxDetails) {
    return await createActivityLog({
        user_id: userId,
        action: 'tax_calculation',
        entity_type: 'application',
        entity_id: applicationId,
        details: {
            customs_duty: taxDetails.customs_duty,
            vat: taxDetails.vat,
            excise_duty: taxDetails.excise_duty,
            total_payable: taxDetails.total_payable
        }
    });
}

/**
 * Log fraud detection
 */
export async function logFraudDetection(applicationId, userId, fraudScore, riskFactors) {
    return await createActivityLog({
        user_id: userId,
        action: 'fraud_detection',
        entity_type: 'application',
        entity_id: applicationId,
        details: {
            fraud_score: fraudScore,
            risk_factors: riskFactors
        }
    });
}

/**
 * Log risk assessment
 */
export async function logRiskAssessment(applicationId, userId, riskScore, riskLevel, recommendations) {
    return await createActivityLog({
        user_id: userId,
        action: 'risk_assessment',
        entity_type: 'application',
        entity_id: applicationId,
        details: {
            risk_score: riskScore,
            risk_level: riskLevel,
            recommendations: recommendations
        }
    });
}

/**
 * Log invoice generation
 */
export async function logInvoiceGenerated(applicationId, userId, invoiceNumber, amount) {
    return await createActivityLog({
        user_id: userId,
        action: 'invoice_generated',
        entity_type: 'invoice',
        entity_id: applicationId,
        details: {
            invoice_number: invoiceNumber,
            amount: amount
        }
    });
}

/**
 * Log document generation (CVET, Cargo Release, etc.)
 */
export async function logDocumentGenerated(applicationId, userId, documentType, documentNumber) {
    return await createActivityLog({
        user_id: userId,
        action: 'document_generated',
        entity_type: documentType,
        entity_id: applicationId,
        details: {
            document_type: documentType,
            document_number: documentNumber
        }
    });
}

/**
 * Log cargo release
 */
export async function logCargoRelease(applicationId, userId, releaseNumber) {
    return await createActivityLog({
        user_id: userId,
        action: 'cargo_released',
        entity_type: 'application',
        entity_id: applicationId,
        details: {
            release_number: releaseNumber
        }
    });
}
