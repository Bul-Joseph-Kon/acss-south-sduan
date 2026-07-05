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
            application_id: applicationId,
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
            application_id: applicationId,
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
            application_id: applicationId,
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
            application_id: applicationId,
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

