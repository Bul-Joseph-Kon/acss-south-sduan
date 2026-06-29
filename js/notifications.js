import supabase from './supabase.js';
import { fetchTable, updateRecord } from './database.js';
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
