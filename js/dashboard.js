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

// ================================================================
// INSPECTOR DASHBOARD DATA
// ================================================================

export async function fetchInspectorDashboardData() {
    try {
        // Fetch inspection statistics
        const [pendingResult, inProgressResult, completedResult, failedResult] = await Promise.all([
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'under_inspection'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'inspection_in_progress'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'inspection_completed'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'inspection_failed')
        ]);

        const stats = {
            pending: pendingResult.count || 0,
            inProgress: inProgressResult.count || 0,
            completed: completedResult.count || 0,
            failed: failedResult.count || 0
        };

        // Fetch inspection queue (applications needing inspection)
        const { data: queueData, error: queueError } = await supabase
            .from('applications')
            .select('*')
            .in('status', ['under_inspection', 'inspection_in_progress'])
            .order('created_at', { ascending: false })
            .limit(10);

        // Fetch recent notifications
        const { data: { user } } = await supabase.auth.getUser();
        let notificationsData = [];
        if (user) {
            const profile = await getUserProfile(user.id);
            const { data: notifData } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', profile?.id)
                .order('created_at', { ascending: false })
                .limit(5);
            notificationsData = notifData || [];
        }

        return {
            success: true,
            stats,
            queue: queueData || [],
            notifications: notificationsData
        };
    } catch (error) {
        console.error('Error fetching inspector dashboard data:', error);
        return { success: false, error: error.message };
    }
}

export function setupInspectorRealtimeUpdates(callback) {
    const subscriptions = [];

    // Subscribe to applications changes
    const appSubscription = supabase
        .channel('inspector-dashboard-apps')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, async () => {
            console.log('Applications table changed, refreshing dashboard...');
            if (callback) await callback();
        })
        .subscribe();

    subscriptions.push(appSubscription);

    // Subscribe to notifications changes
    const notifSubscription = supabase
        .channel('inspector-dashboard-notifs')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, async () => {
            console.log('Notifications table changed, refreshing dashboard...');
            if (callback) await callback();
        })
        .subscribe();

    subscriptions.push(notifSubscription);

    return () => {
        subscriptions.forEach(sub => supabase.removeChannel(sub));
    };
}

