import supabase from './supabase.js';
import { fetchApplicationStatistics, fetchApplicationsForRole } from './applications.js';
import { getUnreadCount } from './notifications.js';
import { fetchTable } from './database.js';
import { getUserProfile } from './auth.js';

export async function fetchDashboardData(role = 'trader') {
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

export async function fetchRecentApplications(role = 'trader', limit = 5) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    
    const profile = await getUserProfile(user.id);
    const userRole = profile?.role || 'trader';
    
    try {
        const result = await fetchApplicationsForRole(userRole, { limit });
        return result;
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function fetchApplicationsByWorkflowStatus(role, status, limit = 10) {
    try {
        const result = await fetchApplicationsForRole(role, { 
            filters: { status },
            limit 
        });
        return result;
    } catch (error) {
        return { success: false, error: error.message };
    }
}
