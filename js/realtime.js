import supabase from './supabase.js';
import { getUserProfile } from './auth.js';

// ================================================================
// REALTIME MONITORING SYSTEM
// ================================================================

class RealtimeMonitor {
    constructor() {
        this.channels = [];
        this.connectionStatus = 'disconnected';
        this.lastSyncTime = null;
        this.subscribers = {};
    }

    // ================================================================
    // CONNECTION MANAGEMENT
    // ================================================================

    async initialize() {
        console.log('=== INITIALIZING REALTIME MONITOR ===');
        
        // Listen to connection state changes
        supabase.realtime.onStateChange((state) => {
            console.log('Realtime connection state:', state);
            this.connectionStatus = state;
            this.notifySubscribers('connection', { status: state });
        });

        this.lastSyncTime = new Date();
        return this;
    }

    async disconnect() {
        console.log('=== DISCONNECTING REALTIME MONITOR ===');
        this.channels.forEach(channel => {
            supabase.removeChannel(channel);
        });
        this.channels = [];
        this.connectionStatus = 'disconnected';
    }

    // ================================================================
    // SUBSCRIBE TO TABLE CHANGES
    // ================================================================

    subscribeToTable(tableName, callback, filter = null) {
        const channelName = `${tableName}-changes-${Date.now()}`;
        console.log(`Subscribing to ${tableName} changes`);
        
        const config = {
            event: '*',
            schema: 'public',
            table: tableName
        };

        if (filter) {
            config.filter = filter;
        }

        const channel = supabase
            .channel(channelName)
            .on('postgres_changes', config, (payload) => {
                console.log(`${tableName} change:`, payload);
                callback(payload);
            })
            .subscribe((status) => {
                console.log(`${tableName} subscription status:`, status);
                if (status === 'SUBSCRIBED') {
                    this.connectionStatus = 'connected';
                    this.lastSyncTime = new Date();
                }
            });

        this.channels.push(channel);
        return channel;
    }

    // ================================================================
    // ADMIN DASHBOARD REALTIME SUBSCRIPTIONS
    // ================================================================

    subscribeToAdminDashboard(callbacks) {
        console.log('=== SUBSCRIBING TO ADMIN DASHBOARD REALTIME ===');
        
        // Subscribe to profiles (user registrations, updates, deletions)
        const profilesChannel = this.subscribeToTable('profiles', (payload) => {
            if (callbacks.onProfileChange) {
                callbacks.onProfileChange(payload);
            }
            this.addActivityFeedItem(this.createActivityFromPayload(payload, 'profile'));
        });

        // Subscribe to applications (declarations)
        const applicationsChannel = this.subscribeToTable('applications', (payload) => {
            if (callbacks.onApplicationChange) {
                callbacks.onApplicationChange(payload);
            }
            this.addActivityFeedItem(this.createActivityFromPayload(payload, 'application'));
        });

        // Subscribe to payments
        const paymentsChannel = this.subscribeToTable('payments', (payload) => {
            if (callbacks.onPaymentChange) {
                callbacks.onPaymentChange(payload);
            }
            this.addActivityFeedItem(this.createActivityFromPayload(payload, 'payment'));
        });

        // Subscribe to notifications
        const notificationsChannel = this.subscribeToTable('notifications', (payload) => {
            if (callbacks.onNotificationChange) {
                callbacks.onNotificationChange(payload);
            }
            this.addActivityFeedItem(this.createActivityFromPayload(payload, 'notification'));
        });

        // Subscribe to documents
        const documentsChannel = this.subscribeToTable('documents', (payload) => {
            if (callbacks.onDocumentChange) {
                callbacks.onDocumentChange(payload);
            }
            this.addActivityFeedItem(this.createActivityFromPayload(payload, 'document'));
        });

        return {
            profiles: profilesChannel,
            applications: applicationsChannel,
            payments: paymentsChannel,
            notifications: notificationsChannel,
            documents: documentsChannel
        };
    }

    // ================================================================
    // ACTIVITY FEED
    // ================================================================

    activityFeed = [];
    maxActivityItems = 50;

    addActivityFeedItem(item) {
        this.activityFeed.unshift(item);
        if (this.activityFeed.length > this.maxActivityItems) {
            this.activityFeed.pop();
        }
        this.notifySubscribers('activity', this.activityFeed);
    }

    getActivityFeed() {
        return this.activityFeed;
    }

    createActivityFromPayload(payload, type) {
        const event = payload.eventType;
        const record = payload.new || payload.old;
        
        const activityMap = {
            profile: {
                INSERT: { icon: 'ri-user-add-line', text: 'User Registered', color: 'text-green-500' },
                UPDATE: { icon: 'ri-user-edit-line', text: 'User Updated', color: 'text-blue-500' },
                DELETE: { icon: 'ri-user-delete-line', text: 'User Deleted', color: 'text-red-500' }
            },
            application: {
                INSERT: { icon: 'ri-file-add-line', text: 'Declaration Submitted', color: 'text-green-500' },
                UPDATE: { icon: 'ri-file-edit-line', text: 'Declaration Updated', color: 'text-blue-500' },
                DELETE: { icon: 'ri-file-delete-line', text: 'Declaration Deleted', color: 'text-red-500' }
            },
            payment: {
                INSERT: { icon: 'ri-bank-card-line', text: 'Payment Initiated', color: 'text-yellow-500' },
                UPDATE: { icon: 'ri-check-double-line', text: 'Payment Completed', color: 'text-green-500' }
            },
            notification: {
                INSERT: { icon: 'ri-notification-3-line', text: 'Notification Created', color: 'text-purple-500' }
            },
            document: {
                INSERT: { icon: 'ri-file-upload-line', text: 'Document Uploaded', color: 'text-green-500' },
                DELETE: { icon: 'ri-file-delete-line', text: 'Document Deleted', color: 'text-red-500' }
            }
        };

        const activity = activityMap[type]?.[event] || { icon: 'ri-information-line', text: 'System Event', color: 'text-gray-500' };

        return {
            id: `${type}-${event}-${Date.now()}`,
            icon: activity.icon,
            text: activity.text,
            color: activity.color,
            timestamp: new Date().toISOString(),
            details: record
        };
    }

    // ================================================================
    // ONLINE USERS TRACKING
    // ================================================================

    onlineUsers = new Map();

    async updateOnlineUser(userId, status) {
        this.onlineUsers.set(userId, {
            userId,
            status,
            lastSeen: new Date().toISOString()
        });
        this.notifySubscribers('onlineUsers', Array.from(this.onlineUsers.values()));
    }

    async removeOnlineUser(userId) {
        this.onlineUsers.delete(userId);
        this.notifySubscribers('onlineUsers', Array.from(this.onlineUsers.values()));
    }

    getOnlineUsers() {
        return Array.from(this.onlineUsers.values());
    }

    // ================================================================
    // SYSTEM STATUS
    // ================================================================

    systemStatus = {
        database: 'connected',
        aiEngine: 'running',
        realtime: 'connected',
        lastSync: new Date().toISOString()
    };

    updateSystemStatus(key, value) {
        this.systemStatus[key] = value;
        this.systemStatus.lastSync = new Date().toISOString();
        this.notifySubscribers('systemStatus', this.systemStatus);
    }

    getSystemStatus() {
        return this.systemStatus;
    }

    // ================================================================
    // SUBSCRIBER NOTIFICATIONS
    // ================================================================

    subscribe(event, callback) {
        if (!this.subscribers[event]) {
            this.subscribers[event] = [];
        }
        this.subscribers[event].push(callback);
    }

    unsubscribe(event, callback) {
        if (this.subscribers[event]) {
            this.subscribers[event] = this.subscribers[event].filter(cb => cb !== callback);
        }
    }

    notifySubscribers(event, data) {
        if (this.subscribers[event]) {
            this.subscribers[event].forEach(callback => callback(data));
        }
    }

    // ================================================================
    // UTILITY FUNCTIONS
    // ================================================================

    getConnectionStatus() {
        return this.connectionStatus;
    }

    getLastSyncTime() {
        return this.lastSyncTime;
    }
}

// ================================================================
// GLOBAL REALTIME MONITOR INSTANCE
// ================================================================

export const realtimeMonitor = new RealtimeMonitor();

// ================================================================
// LEGACY FUNCTIONS (for backward compatibility)
// ================================================================

export function subscribeToApplications(callback) {
    return realtimeMonitor.subscribeToTable('applications', callback);
}

export async function subscribeToNotifications(callback) {
    const profile = await getUserProfile((await supabase.auth.getUser()).data.user?.id);
    return realtimeMonitor.subscribeToTable('notifications', callback, `user_id=eq.${profile?.id}`);
}

export function subscribeToApplicationStatus(applicationId, callback) {
    return realtimeMonitor.subscribeToTable('applications', callback, `id=eq.${applicationId}`);
}

export function unsubscribe(channel) {
    supabase.removeChannel(channel);
}

export async function subscribeToDashboardCounters(callback) {
    const profile = await getUserProfile((await supabase.auth.getUser()).data.user?.id);
    return realtimeMonitor.subscribeToTable('applications', async (payload) => {
        const stats = await fetchDashboardCounters();
        callback(stats);
    });
}

async function fetchDashboardCounters() {
    const profile = await getUserProfile((await supabase.auth.getUser()).data.user?.id);
    const { count: total } = await supabase.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', profile?.id);
    const { count: pending } = await supabase.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', profile?.id).in('status', ['pending_review', 'under_inspection']);
    const { count: approved } = await supabase.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', profile?.id).eq('status', 'approved');
    const { count: rejected } = await supabase.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', profile?.id).eq('status', 'rejected');
    return { total: total || 0, pending: pending || 0, approved: approved || 0, rejected: rejected || 0 };
}

