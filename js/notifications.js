import supabase from './supabase.js';
import { fetchTable, updateRecord, insertRecord } from './database.js';
import { getUserProfile } from './auth.js';

export async function fetchNotifications(options = {}) {
    const { data: { user } } = await supabase.auth.getUser();
    const profile = user ? await getUserProfile(user.id) : null;
    const filters = options.filters || {};
    if (profile) filters.user_id = profile.id;
    return fetchTable('notifications', { filters, orderBy: options.orderBy || { column: 'created_at', ascending: false }, limit: options.limit });
}

export async function fetchUnreadNotifications() {
    const { data: { user } } = await supabase.auth.getUser();
    const profile = user ? await getUserProfile(user.id) : null;
    try {
        const { data, error } = await supabase.from('notifications').select('*').eq('user_id', profile?.id).eq('read', false).order('created_at', { ascending: false });
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function markNotificationAsRead(id) {
    return updateRecord('notifications', id, { read: true, read_at: new Date().toISOString() });
}

export async function markAllNotificationsAsRead() {
    const { data: { user } } = await supabase.auth.getUser();
    const profile = user ? await getUserProfile(user.id) : null;
    try {
        const { error } = await supabase.from('notifications').update({ read: true, read_at: new Date().toISOString() }).eq('user_id', profile?.id).eq('read', false);
        if (error) throw error;
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function getUnreadCount() {
    const { data: { user } } = await supabase.auth.getUser();
    const profile = user ? await getUserProfile(user.id) : null;
    try {
        const { count, error } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', profile?.id).eq('read', false);
        if (error) throw error;
        return { success: true, count };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ================================================================
// AI-GENERATED NOTIFICATIONS
// ================================================================

export async function sendAIValidationNotification(userId, applicationId, errors, warnings) {
    try {
        const message = `AI validation failed for application #${applicationId}. ` +
            (errors.length > 0 ? `Errors: ${errors.join(', ')}. ` : '') +
            (warnings.length > 0 ? `Warnings: ${warnings.join(', ')}` : '');

        const notification = {
            user_id: userId,
            type: 'ai_validation_error',
            title: 'Application Validation Failed',
            message,
            reference_id: applicationId,
            reference_type: 'application',
            priority: 'high',
            read: false,
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('notifications')
            .insert(notification)
            .select()
            .single();

        if (error) throw error;

        console.log('AI validation notification sent:', notification);
        return { success: true, data };
    } catch (error) {
        console.error('Send AI validation notification error:', error);
        return { success: false, error: error.message };
    }
}

export async function sendAIMonitoringNotification(userId, applicationId, issues, workflowStage) {
    try {
        const message = `AI monitoring detected issues during ${workflowStage} for application #${applicationId}. ` +
            `Issues: ${issues.join(', ')}`;

        const notification = {
            user_id: userId,
            type: 'ai_monitoring_alert',
            title: 'AI Monitoring Alert',
            message,
            reference_id: applicationId,
            reference_type: 'application',
            priority: 'high',
            read: false,
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('notifications')
            .insert(notification)
            .select()
            .single();

        if (error) throw error;

        console.log('AI monitoring notification sent:', notification);
        return { success: true, data };
    } catch (error) {
        console.error('Send AI monitoring notification error:', error);
        return { success: false, error: error.message };
    }
}

export async function sendApplicationStatusNotification(userId, applicationId, newStatus, previousStatus) {
    try {
        const message = `Application #${applicationId} status changed from ${previousStatus} to ${newStatus}`;

        const notification = {
            user_id: userId,
            type: 'application_status_update',
            title: 'Application Status Updated',
            message,
            reference_id: applicationId,
            reference_type: 'application',
            priority: 'medium',
            read: false,
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('notifications')
            .insert(notification)
            .select()
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Send status notification error:', error);
        return { success: false, error: error.message };
    }
}

export async function sendPaymentRequiredNotification(userId, applicationId, amount) {
    try {
        const message = `Payment required for application #${applicationId}. Amount: ${amount}`;

        const notification = {
            user_id: userId,
            type: 'payment_required',
            title: 'Payment Required',
            message,
            reference_id: applicationId,
            reference_type: 'application',
            priority: 'high',
            read: false,
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('notifications')
            .insert(notification)
            .select()
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Send payment notification error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// INSPECTOR NOTIFICATIONS
// ================================================================

export async function sendInspectionStartedNotification(userId, applicationId, inspectionType) {
    try {
        const message = `Inspection started for application #${applicationId}. Type: ${inspectionType}`;

        const notification = {
            user_id: userId,
            title: 'Inspection Started',
            message,
            reference_id: applicationId,
            reference_type: 'application',
            read: false,
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('notifications')
            .insert(notification)
            .select()
            .single();

        if (error) throw error;

        console.log('Inspection started notification sent:', notification);
        return { success: true, data };
    } catch (error) {
        console.error('Send inspection started notification error:', error);
        return { success: false, error: error.message };
    }
}

export async function sendInspectionPassedNotification(userId, applicationId) {
    try {
        const message = `Inspection passed for application #${applicationId}. Application routed for review.`;

        const notification = {
            user_id: userId,
            title: 'Inspection Passed',
            message,
            reference_id: applicationId,
            reference_type: 'application',
            read: false,
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('notifications')
            .insert(notification)
            .select()
            .single();

        if (error) throw error;

        console.log('Inspection passed notification sent:', notification);
        return { success: true, data };
    } catch (error) {
        console.error('Send inspection passed notification error:', error);
        return { success: false, error: error.message };
    }
}

export async function sendInspectionFailedNotification(userId, applicationId, reason) {
    try {
        const message = `Inspection failed for application #${applicationId}. Reason: ${reason}. Application returned for correction.`;

        const notification = {
            user_id: userId,
            title: 'Inspection Failed',
            message,
            reference_id: applicationId,
            reference_type: 'application',
            read: false,
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('notifications')
            .insert(notification)
            .select()
            .single();

        if (error) throw error;

        console.log('Inspection failed notification sent:', notification);
        return { success: true, data };
    } catch (error) {
        console.error('Send inspection failed notification error:', error);
        return { success: false, error: error.message };
    }
}

export async function sendInspectionReturnedNotification(userId, applicationId, reason) {
    try {
        const message = `Application #${applicationId} returned for correction. Reason: ${reason}`;

        const notification = {
            user_id: userId,
            title: 'Application Returned',
            message,
            reference_id: applicationId,
            reference_type: 'application',
            read: false,
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('notifications')
            .insert(notification)
            .select()
            .single();

        if (error) throw error;

        console.log('Inspection returned notification sent:', notification);
        return { success: true, data };
    } catch (error) {
        console.error('Send inspection returned notification error:', error);
        return { success: false, error: error.message };
    }
}

export async function sendInspectionCompletedNotification(userId, applicationId) {
    try {
        const message = `Inspection completed for application #${applicationId}. Final report submitted.`;

        const notification = {
            user_id: userId,
            title: 'Inspection Completed',
            message,
            reference_id: applicationId,
            reference_type: 'application',
            read: false,
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('notifications')
            .insert(notification)
            .select()
            .single();

        if (error) throw error;

        console.log('Inspection completed notification sent:', notification);
        return { success: true, data };
    } catch (error) {
        console.error('Send inspection completed notification error:', error);
        return { success: false, error: error.message };
    }
}

export async function sendInspectionEscalatedNotification(userId, applicationId, reason) {
    try {
        const message = `Application #${applicationId} escalated to supervisor. Reason: ${reason}`;

        const notification = {
            user_id: userId,
            title: 'Application Escalated',
            message,
            reference_id: applicationId,
            reference_type: 'application',
            read: false,
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('notifications')
            .insert(notification)
            .select()
            .single();

        if (error) throw error;

        console.log('Inspection escalated notification sent:', notification);
        return { success: true, data };
    } catch (error) {
        console.error('Send inspection escalated notification error:', error);
        return { success: false, error: error.message };
    }
}

export async function sendReinspectionRequestedNotification(userId, applicationId, reason) {
    try {
        const message = `Reinspection requested for application #${applicationId}. Reason: ${reason}`;

        const notification = {
            user_id: userId,
            title: 'Reinspection Requested',
            message,
            reference_id: applicationId,
            reference_type: 'application',
            read: false,
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('notifications')
            .insert(notification)
            .select()
            .single();

        if (error) throw error;

        console.log('Reinspection requested notification sent:', notification);
        return { success: true, data };
    } catch (error) {
        console.error('Send reinspection requested notification error:', error);
        return { success: false, error: error.message };
    }
}

