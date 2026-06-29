import supabase from './supabase.js';
import { fetchApplicationStatistics } from './applications.js';
import { getUnreadCount } from './notifications.js';
import { fetchTable } from './database.js';
import { getUserProfile } from './auth.js';

export async function fetchDashboardData() {
    const [stats, unreadResult] = await Promise.all([
        fetchApplicationStatistics(),
        getUnreadCount()
    ]);
    return { applications: stats, notifications: { unread: unreadResult.success ? unreadResult.count : 0 } };
}

export async function fetchRecentActivities(limit = 10) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    
    const profile = await getUserProfile(user.id);
    return fetchTable('activity_logs', { filters: { user_id: profile?.id }, orderBy: { column: 'created_at', ascending: false }, limit });
}

export async function fetchRecentApplications(limit = 5) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    
    const profile = await getUserProfile(user.id);
    try {
        const { data, error } = await supabase.from('applications').select('*').eq('user_id', profile?.id).order('created_at', { ascending: false }).limit(limit);
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
