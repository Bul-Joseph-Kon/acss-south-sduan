import supabase from './supabase.js';
import { getUserProfile } from './auth.js';

export function subscribeToApplications(callback) {
    const channel = supabase
        .channel('applications-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, (payload) => {
            callback(payload);
        })
        .subscribe();
    return channel;
}

export async function subscribeToNotifications(callback) {
    const profile = await getUserProfile((await supabase.auth.getUser()).data.user?.id);
    const channel = supabase
        .channel('notifications-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile?.id}` }, (payload) => {
            callback(payload);
        })
        .subscribe();
    return channel;
}

export function subscribeToApplicationStatus(applicationId, callback) {
    const channel = supabase
        .channel(`application-${applicationId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'applications', filter: `id=eq.${applicationId}` }, (payload) => {
            callback(payload);
        })
        .subscribe();
    return channel;
}

export function unsubscribe(channel) {
    supabase.removeChannel(channel);
}

export async function subscribeToDashboardCounters(callback) {
    const profile = await getUserProfile((await supabase.auth.getUser()).data.user?.id);
    const channel = supabase
        .channel('dashboard-counters')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, async (payload) => {
            const stats = await fetchDashboardCounters();
            callback(stats);
        })
        .subscribe();
    return channel;
}

async function fetchDashboardCounters() {
    const profile = await getUserProfile((await supabase.auth.getUser()).data.user?.id);
    const { count: total } = await supabase.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', profile?.id);
    const { count: pending } = await supabase.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', profile?.id).in('status', ['pending_review', 'under_inspection']);
    const { count: approved } = await supabase.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', profile?.id).eq('status', 'approved');
    const { count: rejected } = await supabase.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', profile?.id).eq('status', 'rejected');
    return { total: total || 0, pending: pending || 0, approved: approved || 0, rejected: rejected || 0 };
}
