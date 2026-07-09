import supabase from './supabase.js';
import { getUserProfile } from './auth.js';

// ================================================================
// REALTIME MANAGER - Singleton Pattern
// ================================================================

class RealtimeManager {
    constructor() {
        if (RealtimeManager.instance) {
            return RealtimeManager.instance;
        }
        
        this.channels = new Map(); // Track channels by key
        this.activeSubscriptions = new Map(); // Track active subscriptions per page
        this.connectionStatus = 'disconnected';
        this.lastSyncTime = null;
        this.subscribers = {};
        this.isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        this.reconnectTimer = null;
        this.debouncedRefreshes = new Map(); // Track debounced refreshes
        this.cachedValues = new Map(); // Cache values for comparison
        this.processedEvents = new Set(); // Track processed events to prevent duplicates
        this.eventCleanupInterval = null;
        
        RealtimeManager.instance = this;
    }

    // ================================================================
    // CONNECTION MANAGEMENT
    // ================================================================

    async initialize() {
        if (this.logEnabled()) {
            console.log('=== INITIALIZING REALTIME MANAGER ===');
        }
        
        // Listen to connection state changes
        supabase.realtime.stateChangeCallbacks.open.push(() => {
            if (this.logEnabled()) {
                console.log('Realtime connection state: open');
            }
            this.connectionStatus = 'connected';
            this.notifySubscribers('connection', { status: 'connected' });
            this.reconnectAttempts = 0;
            this.hideReconnectingIndicator();
        });

        supabase.realtime.stateChangeCallbacks.close.push(() => {
            if (this.logEnabled()) {
                console.log('Realtime connection state: closed');
            }
            this.connectionStatus = 'disconnected';
            this.notifySubscribers('connection', { status: 'disconnected' });
            this.handleReconnection();
        });

        supabase.realtime.stateChangeCallbacks.error.push((err) => {
            if (this.logEnabled()) {
                console.error('Realtime connection error:', err);
            }
            this.connectionStatus = 'error';
            this.notifySubscribers('connection', { status: 'error' });
            this.handleReconnection();
        });

        this.lastSyncTime = new Date();
        this.startEventCleanup();
        return this;
    }

    async disconnect() {
        if (this.logEnabled()) {
            console.log('=== DISCONNECTING REALTIME MANAGER ===');
        }
        
        // Clear all channels safely using removeAllChannels
        try {
            await supabase.removeAllChannels();
        } catch (err) {
            console.error('Error removing all channels:', err);
        }
        
        this.channels.clear();
        this.activeSubscriptions.clear();
        this.connectionStatus = 'disconnected';
        
        // Clear reconnection timer
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        
        // Clear event cleanup interval
        if (this.eventCleanupInterval) {
            clearInterval(this.eventCleanupInterval);
            this.eventCleanupInterval = null;
        }
    }

    // ================================================================
    // RECONNECTION HANDLING
    // ================================================================

    handleReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            if (this.logEnabled()) {
                console.error('Max reconnection attempts reached');
            }
            return;
        }

        this.reconnectAttempts++;
        this.showReconnectingIndicator();

        if (this.logEnabled()) {
            console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        }

        this.reconnectTimer = setTimeout(async () => {
            try {
                // Reinitialize all active subscriptions
                const subscriptions = Array.from(this.activeSubscriptions.entries());
                for (const [pageKey, config] of subscriptions) {
                    await this.reinitializeSubscription(pageKey, config);
                }
            } catch (error) {
                if (this.logEnabled()) {
                    console.error('Reconnection failed:', error);
                }
                this.handleReconnection();
            }
        }, this.reconnectDelay);
    }

    async reinitializeSubscription(pageKey, config) {
        // Remove old channels for this page
        const oldChannels = this.activeSubscriptions.get(pageKey)?.channels || {};
        Object.values(oldChannels).forEach(channel => {
            supabase.removeChannel(channel);
        });

        // Reinitialize based on role
        const { role, userId, callbacks } = config;
        let newChannels;

        switch (role) {
            case 'administrator':
                newChannels = this.subscribeToAdminDashboard(callbacks);
                break;
            case 'officer':
                newChannels = this.subscribeToOfficerDashboard(userId, callbacks);
                break;
            case 'supervisor':
                newChannels = this.subscribeToSupervisorDashboard(callbacks);
                break;
            case 'inspector':
                newChannels = this.subscribeToInspectorDashboard(userId, callbacks);
                break;
            case 'trader':
                newChannels = this.subscribeToTraderDashboard(userId, callbacks);
                break;
            case 'agent':
                newChannels = this.subscribeToAgentDashboard(userId, callbacks);
                break;
            case 'revenue':
                newChannels = this.subscribeToRevenueDashboard(callbacks);
                break;
            default:
                return;
        }

        // Update subscription config
        this.activeSubscriptions.set(pageKey, { ...config, channels: newChannels });
    }

    showReconnectingIndicator() {
        let indicator = document.getElementById('reconnecting-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'reconnecting-indicator';
            indicator.className = 'fixed bottom-4 right-4 z-50 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2';
            indicator.innerHTML = '<i class="ri-refresh-line animate-spin"></i><span>Reconnecting...</span>';
            document.body.appendChild(indicator);
        }
        indicator.style.display = 'flex';
    }

    hideReconnectingIndicator() {
        const indicator = document.getElementById('reconnecting-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    // ================================================================
    // PAGE SUBSCRIPTION MANAGEMENT
    // ================================================================

    registerPage(pageKey, role, userId, callbacks) {
        // Check if already subscribed for this page
        if (this.activeSubscriptions.has(pageKey)) {
            if (this.logEnabled()) {
                console.log(`Page ${pageKey} already subscribed, skipping`);
            }
            return this.activeSubscriptions.get(pageKey).channels;
        }

        if (this.logEnabled()) {
            console.log(`Registering page ${pageKey} for role ${role}`);
        }

        let channels;
        switch (role) {
            case 'administrator':
                channels = this.subscribeToAdminDashboard(callbacks);
                break;
            case 'officer':
                channels = this.subscribeToOfficerDashboard(userId, callbacks);
                break;
            case 'supervisor':
                channels = this.subscribeToSupervisorDashboard(callbacks);
                break;
            case 'inspector':
                channels = this.subscribeToInspectorDashboard(userId, callbacks);
                break;
            case 'trader':
                channels = this.subscribeToTraderDashboard(userId, callbacks);
                break;
            case 'agent':
                channels = this.subscribeToAgentDashboard(userId, callbacks);
                break;
            case 'revenue':
                channels = this.subscribeToRevenueDashboard(callbacks);
                break;
            default:
                return null;
        }

        this.activeSubscriptions.set(pageKey, { role, userId, callbacks, channels });
        return channels;
    }

    unregisterPage(pageKey) {
        if (this.logEnabled()) {
            console.log(`Unregistering page ${pageKey}`);
        }

        const subscription = this.activeSubscriptions.get(pageKey);
        if (subscription) {
            // Remove all channels for this page safely
            Object.values(subscription.channels).forEach(channel => {
                try {
                    supabase.removeChannel(channel);
                } catch (err) {
                    console.error(`Error removing channel for page ${pageKey}:`, err);
                }
            });
            this.activeSubscriptions.delete(pageKey);
        }
    }

    cleanupOnSignOut() {
        if (this.logEnabled()) {
            console.log('=== CLEANING UP ON SIGN OUT ===');
        }
        this.disconnect();
        this.activeSubscriptions.clear();
        this.cachedValues.clear();
        this.processedEvents.clear();
    }

    // ================================================================
    // DEBOUNCING AND VALUE COMPARISON
    // ================================================================

    debounce(pageKey, callback, delay = 400) {
        const debounceKey = `${pageKey}-${callback.name || 'anonymous'}`;
        
        if (this.debouncedRefreshes.has(debounceKey)) {
            clearTimeout(this.debouncedRefreshes.get(debounceKey));
        }

        const timer = setTimeout(() => {
            callback();
            this.debouncedRefreshes.delete(debounceKey);
        }, delay);

        this.debouncedRefreshes.set(debounceKey, timer);
    }

    shouldRefresh(cacheKey, newValue) {
        const oldValue = this.cachedValues.get(cacheKey);
        
        // If no old value, refresh
        if (oldValue === undefined) {
            this.cachedValues.set(cacheKey, newValue);
            return true;
        }

        // Compare values (deep comparison for objects)
        const hasChanged = JSON.stringify(oldValue) !== JSON.stringify(newValue);
        
        if (hasChanged) {
            this.cachedValues.set(cacheKey, newValue);
        }

        return hasChanged;
    }

    clearCache(pageKey) {
        // Clear cache for specific page
        for (const key of this.cachedValues.keys()) {
            if (key.startsWith(pageKey)) {
                this.cachedValues.delete(key);
            }
        }
    }

    // ================================================================
    // EVENT DUPLICATION PREVENTION
    // ================================================================

    isEventProcessed(eventId) {
        return this.processedEvents.has(eventId);
    }

    markEventProcessed(eventId) {
        this.processedEvents.add(eventId);
    }

    startEventCleanup() {
        // Clean up processed events every 5 minutes
        this.eventCleanupInterval = setInterval(() => {
            const now = Date.now();
            const fiveMinutesAgo = now - (5 * 60 * 1000);
            
            for (const eventId of this.processedEvents) {
                const timestamp = parseInt(eventId.split('-').pop());
                if (timestamp < fiveMinutesAgo) {
                    this.processedEvents.delete(eventId);
                }
            }
        }, 5 * 60 * 1000);
    }

    generateEventId(payload) {
        return `${payload.table}-${payload.eventType}-${payload.new?.id || payload.old?.id}-${Date.now()}`;
    }

    // ================================================================
    // STATISTIC CARD ANIMATION
    // ================================================================

    animateStatChange(elementId, oldValue, newValue) {
        const element = document.getElementById(elementId);
        if (!element) return;

        // Add animation class
        element.classList.add('animate-pulse', 'bg-yellow-100');
        
        setTimeout(() => {
            element.classList.remove('animate-pulse', 'bg-yellow-100');
        }, 500);
    }

    // ================================================================
    // DEVELOPMENT LOGGING
    // ================================================================

    logEnabled() {
        return this.isDevelopment;
    }

    log(...args) {
        if (this.logEnabled()) {
            console.log(...args);
        }
    }

    logError(...args) {
        if (this.logEnabled()) {
            console.error(...args);
        }
    }

    // ================================================================
    // SUBSCRIBE TO TABLE CHANGES
    // ================================================================

    subscribeToTable(tableName, callback, filter = null, pageKey = 'default') {
        const channelKey = `${pageKey}-${tableName}-${filter || 'all'}`;
        
        // Check if channel already exists for this page
        if (this.channels.has(channelKey)) {
            if (this.logEnabled()) {
                console.log(`Channel ${channelKey} already exists, reusing`);
            }
            return this.channels.get(channelKey);
        }

        const channelName = `${tableName}-${pageKey}-${Date.now()}`;
        this.log(`Subscribing to ${tableName} changes for page ${pageKey}`);
        
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
                const eventId = this.generateEventId(payload);
                
                // Prevent duplicate event processing
                if (this.isEventProcessed(eventId)) {
                    this.log(`Event ${eventId} already processed, skipping`);
                    return;
                }
                this.markEventProcessed(eventId);
                
                this.log(`${tableName} change:`, payload);
                callback(payload);
            })
            .subscribe((status) => {
                this.log(`${tableName} subscription status:`, status);
                if (status === 'SUBSCRIBED') {
                    this.connectionStatus = 'connected';
                    this.lastSyncTime = new Date();
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    this.logError(`Subscription error for ${tableName}:`, status);
                }
            });

        this.channels.set(channelKey, channel);
        return channel;
    }

    // ================================================================
    // ADMIN DASHBOARD REALTIME SUBSCRIPTIONS
    // ================================================================

    subscribeToAdminDashboard(callbacks, pageKey = 'admin') {
        this.log('=== SUBSCRIBING TO ADMIN DASHBOARD REALTIME ===');
        
        // Subscribe to profiles (user registrations, updates, deletions)
        const profilesChannel = this.subscribeToTable('profiles', (payload) => {
            if (callbacks.onProfileChange) {
                this.debounce(pageKey, () => callbacks.onProfileChange(payload));
            }
            this.addActivityFeedItem(this.createActivityFromPayload(payload, 'profile'));
        }, null, pageKey);

        // Subscribe to applications (declarations)
        const applicationsChannel = this.subscribeToTable('applications', (payload) => {
            if (callbacks.onApplicationChange) {
                this.debounce(pageKey, () => callbacks.onApplicationChange(payload));
            }
            this.addActivityFeedItem(this.createActivityFromPayload(payload, 'application'));
        }, null, pageKey);

        // Subscribe to payments
        const paymentsChannel = this.subscribeToTable('payments', (payload) => {
            if (callbacks.onPaymentChange) {
                this.debounce(pageKey, () => callbacks.onPaymentChange(payload));
            }
            this.addActivityFeedItem(this.createActivityFromPayload(payload, 'payment'));
        }, null, pageKey);

        // Subscribe to notifications
        const notificationsChannel = this.subscribeToTable('notifications', (payload) => {
            if (callbacks.onNotificationChange) {
                this.debounce(pageKey, () => callbacks.onNotificationChange(payload));
            }
            this.addActivityFeedItem(this.createActivityFromPayload(payload, 'notification'));
        }, null, pageKey);

        // Subscribe to documents
        const documentsChannel = this.subscribeToTable('documents', (payload) => {
            if (callbacks.onDocumentChange) {
                this.debounce(pageKey, () => callbacks.onDocumentChange(payload));
            }
            this.addActivityFeedItem(this.createActivityFromPayload(payload, 'document'));
        }, null, pageKey);

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
    // OFFICER DASHBOARD REALTIME SUBSCRIPTIONS
    // ================================================================

    subscribeToOfficerDashboard(userId, callbacks, pageKey = 'officer') {
        this.log('=== SUBSCRIBING TO OFFICER DASHBOARD REALTIME ===');
        
        // Subscribe to applications assigned to this officer
        const applicationsChannel = this.subscribeToTable('applications', (payload) => {
            const record = payload.new || payload.old;
            if (record.assigned_officer_id === userId) {
                if (callbacks.onApplicationChange) {
                    this.debounce(pageKey, () => callbacks.onApplicationChange(payload));
                }
                this.addActivityFeedItem(this.createActivityFromPayload(payload, 'application'));
            }
        }, null, pageKey);

        // Subscribe to payments for officer's assigned applications
        const paymentsChannel = this.subscribeToTable('payments', (payload) => {
            if (callbacks.onPaymentChange) {
                this.debounce(pageKey, () => callbacks.onPaymentChange(payload));
            }
            this.addActivityFeedItem(this.createActivityFromPayload(payload, 'payment'));
        }, null, pageKey);

        return {
            applications: applicationsChannel,
            payments: paymentsChannel
        };
    }

    // ================================================================
    // SUPERVISOR DASHBOARD REALTIME SUBSCRIPTIONS
    // ================================================================

    subscribeToSupervisorDashboard(callbacks, pageKey = 'supervisor') {
        this.log('=== SUBSCRIBING TO SUPERVISOR DASHBOARD REALTIME ===');
        
        // Subscribe to all applications for team oversight
        const applicationsChannel = this.subscribeToTable('applications', (payload) => {
            if (callbacks.onApplicationChange) {
                this.debounce(pageKey, () => callbacks.onApplicationChange(payload));
            }
            this.addActivityFeedItem(this.createActivityFromPayload(payload, 'application'));
        }, null, pageKey);

        // Subscribe to profiles for team performance
        const profilesChannel = this.subscribeToTable('profiles', (payload) => {
            if (callbacks.onProfileChange) {
                this.debounce(pageKey, () => callbacks.onProfileChange(payload));
            }
            this.addActivityFeedItem(this.createActivityFromPayload(payload, 'profile'));
        }, null, pageKey);

        return {
            applications: applicationsChannel,
            profiles: profilesChannel
        };
    }

    // ================================================================
    // INSPECTOR DASHBOARD REALTIME SUBSCRIPTIONS
    // ================================================================

    subscribeToInspectorDashboard(userId, callbacks, pageKey = 'inspector') {
        this.log('=== SUBSCRIBING TO INSPECTOR DASHBOARD REALTIME ===');

        // Subscribe to applications assigned for inspection
        const applicationsChannel = this.subscribeToTable('applications', (payload) => {
            const record = payload.new || payload.old;
            if (record.assigned_inspector_id === userId || record.status === 'under_inspection') {
                if (callbacks.onApplicationChange) {
                    this.debounce(pageKey, () => callbacks.onApplicationChange(payload));
                }
                this.addActivityFeedItem(this.createActivityFromPayload(payload, 'application'));
            }
        }, null, pageKey);

        // Subscribe to notifications for this inspector
        const notificationsChannel = this.subscribeToTable('notifications', (payload) => {
            const record = payload.new || payload.old;
            if (record.user_id === userId) {
                if (callbacks.onNotificationChange) {
                    this.debounce(pageKey, () => callbacks.onNotificationChange(payload));
                }
                this.addActivityFeedItem(this.createActivityFromPayload(payload, 'notification'));
            }
        }, null, pageKey);

        // Subscribe to activity logs for this inspector
        const activityLogsChannel = this.subscribeToTable('activity_logs', (payload) => {
            const record = payload.new || payload.old;
            if (record.user_id === userId) {
                if (callbacks.onActivityChange) {
                    this.debounce(pageKey, () => callbacks.onActivityChange(payload));
                }
                this.addActivityFeedItem(this.createActivityFromPayload(payload, 'activity'));
            }
        }, null, pageKey);

        return {
            applications: applicationsChannel,
            notifications: notificationsChannel,
            activity_logs: activityLogsChannel
        };
    }

    // ================================================================
    // TRADER DASHBOARD REALTIME SUBSCRIPTIONS
    // ================================================================

    subscribeToTraderDashboard(userId, callbacks, pageKey = 'trader') {
        this.log('=== SUBSCRIBING TO TRADER DASHBOARD REALTIME ===');
        
        // Subscribe to applications for this trader
        const applicationsChannel = this.subscribeToTable('applications', (payload) => {
            const record = payload.new || payload.old;
            if (record.user_id === userId) {
                if (callbacks.onApplicationChange) {
                    this.debounce(pageKey, () => callbacks.onApplicationChange(payload));
                }
                this.addActivityFeedItem(this.createActivityFromPayload(payload, 'application'));
                // Show toast notification for important events (debounced)
                this.debounce(`${pageKey}-toast-${payload.new?.id}`, () => this.showToastForTraderEvent(payload));
            }
        }, null, pageKey);

        // Subscribe to payments for this trader
        const paymentsChannel = this.subscribeToTable('payments', (payload) => {
            const record = payload.new || payload.old;
            if (record.user_id === userId) {
                if (callbacks.onPaymentChange) {
                    this.debounce(pageKey, () => callbacks.onPaymentChange(payload));
                }
                this.addActivityFeedItem(this.createActivityFromPayload(payload, 'payment'));
                this.debounce(`${pageKey}-toast-${payload.new?.id}`, () => this.showToastForPaymentEvent(payload));
            }
        }, null, pageKey);

        // Subscribe to notifications for this trader
        const notificationsChannel = this.subscribeToTable('notifications', (payload) => {
            const record = payload.new || payload.old;
            if (record.user_id === userId) {
                if (callbacks.onNotificationChange) {
                    this.debounce(pageKey, () => callbacks.onNotificationChange(payload));
                }
                this.addActivityFeedItem(this.createActivityFromPayload(payload, 'notification'));
            }
        }, null, pageKey);

        // Subscribe to profile status changes for this trader
        const profilesChannel = this.subscribeToTable('profiles', (payload) => {
            const record = payload.new || payload.old;
            if (record.user_id === userId) {
                if (callbacks.onProfileChange) {
                    this.debounce(pageKey, () => callbacks.onProfileChange(payload));
                }
            }
        }, null, pageKey);

        return {
            applications: applicationsChannel,
            payments: paymentsChannel,
            notifications: notificationsChannel,
            profiles: profilesChannel
        };
    }

    // ================================================================
    // CLEARING AGENT DASHBOARD REALTIME SUBSCRIPTIONS
    // ================================================================

    subscribeToAgentDashboard(userId, callbacks, pageKey = 'agent') {
        this.log('=== SUBSCRIBING TO AGENT DASHBOARD REALTIME ===');
        
        // Subscribe to applications for this agent
        const applicationsChannel = this.subscribeToTable('applications', (payload) => {
            const record = payload.new || payload.old;
            if (record.agent_id === userId) {
                if (callbacks.onApplicationChange) {
                    this.debounce(pageKey, () => callbacks.onApplicationChange(payload));
                }
                this.addActivityFeedItem(this.createActivityFromPayload(payload, 'application'));
            }
        }, null, pageKey);

        // Subscribe to payments for this agent
        const paymentsChannel = this.subscribeToTable('payments', (payload) => {
            const record = payload.new || payload.old;
            if (record.agent_id === userId) {
                if (callbacks.onPaymentChange) {
                    this.debounce(pageKey, () => callbacks.onPaymentChange(payload));
                }
                this.addActivityFeedItem(this.createActivityFromPayload(payload, 'payment'));
            }
        }, null, pageKey);

        // Subscribe to profile status changes for this agent
        const profilesChannel = this.subscribeToTable('profiles', (payload) => {
            const record = payload.new || payload.old;
            if (record.user_id === userId) {
                if (callbacks.onProfileChange) {
                    this.debounce(pageKey, () => callbacks.onProfileChange(payload));
                }
            }
        }, null, pageKey);

        return {
            applications: applicationsChannel,
            payments: paymentsChannel,
            profiles: profilesChannel
        };
    }

    // ================================================================
    // REVENUE OFFICER DASHBOARD REALTIME SUBSCRIPTIONS
    // ================================================================

    subscribeToRevenueDashboard(callbacks, pageKey = 'revenue') {
        this.log('=== SUBSCRIBING TO REVENUE DASHBOARD REALTIME ===');
        
        // Subscribe to all payments
        const paymentsChannel = this.subscribeToTable('payments', (payload) => {
            if (callbacks.onPaymentChange) {
                this.debounce(pageKey, () => callbacks.onPaymentChange(payload));
            }
            this.addActivityFeedItem(this.createActivityFromPayload(payload, 'payment'));
        }, null, pageKey);

        // Subscribe to applications (for revenue calculation)
        const applicationsChannel = this.subscribeToTable('applications', (payload) => {
            if (callbacks.onApplicationChange) {
                this.debounce(pageKey, () => callbacks.onApplicationChange(payload));
            }
        }, null, pageKey);

        return {
            payments: paymentsChannel,
            applications: applicationsChannel
        };
    }

    // ================================================================
    // TOAST NOTIFICATIONS (Role-Specific)
    // ================================================================

    showToastForTraderEvent(payload, role = 'trader') {
        const event = payload.eventType;
        const record = payload.new;
        
        // Only show for trader role
        if (role !== 'trader') return;
        
        if (event === 'INSERT') {
            this.showToast('Declaration Submitted', 'Your declaration has been submitted successfully', 'success');
        } else if (event === 'UPDATE') {
            if (record.status === 'approved') {
                this.showToast('Declaration Approved', 'Your declaration has been approved!', 'success');
            } else if (record.status === 'rejected') {
                this.showToast('Declaration Rejected', 'Your declaration has been rejected. Please review the feedback.', 'error');
            } else if (record.status === 'under_inspection') {
                this.showToast('Inspection Started', 'Your declaration is now under inspection', 'info');
            }
        }
    }

    showToastForPaymentEvent(payload, role = 'trader') {
        const event = payload.eventType;
        const record = payload.new;
        
        // Show for trader and agent roles
        if (role !== 'trader' && role !== 'agent') return;
        
        if (event === 'UPDATE' && record.status === 'completed') {
            this.showToast('Payment Completed', 'Your payment has been processed successfully', 'success');
        } else if (event === 'UPDATE' && record.status === 'failed') {
            this.showToast('Payment Failed', 'Your payment could not be processed. Please try again.', 'error');
        }
    }

    showToastForOfficerEvent(payload, role = 'officer') {
        const event = payload.eventType;
        const record = payload.new;
        
        // Only show for officer role
        if (role !== 'officer') return;
        
        if (event === 'UPDATE' && record.assigned_officer_id) {
            if (record.status === 'pending_review') {
                this.showToast('New Assignment', 'A new declaration has been assigned to you', 'info');
            }
        }
    }

    showToastForProfileStatusChange(payload, role, currentUserId) {
        const event = payload.eventType;
        const newRecord = payload.new;
        const oldRecord = payload.old;
        
        // Only show for trader and agent roles
        if (role !== 'trader' && role !== 'agent') return;
        
        // Only show if this is the current user's profile
        if (newRecord.user_id !== currentUserId) return;
        
        if (event === 'UPDATE') {
            if (oldRecord.status === 'pending' && newRecord.status === 'active') {
                this.showToast('Account Approved', 'Your account has been approved! You can now access the system.', 'success');
            } else if (oldRecord.status === 'active' && newRecord.status === 'suspended') {
                this.showToast('Account Suspended', 'Your account has been suspended. Please contact the administrator.', 'warning');
            } else if (oldRecord.status === 'active' && newRecord.status === 'inactive') {
                this.showToast('Account Deactivated', 'Your account has been deactivated. Please contact the administrator.', 'warning');
            } else if (oldRecord.status === 'suspended' && newRecord.status === 'active') {
                this.showToast('Account Reactivated', 'Your account has been reactivated. You can now access the system.', 'success');
            } else if (oldRecord.status === 'inactive' && newRecord.status === 'active') {
                this.showToast('Account Activated', 'Your account has been activated. You can now access the system.', 'success');
            } else if (newRecord.status === 'rejected') {
                this.showToast('Registration Rejected', 'Your registration has been rejected. Please contact the administrator for more information.', 'error');
            }
        }
    }

    showToast(title, message, type = 'info') {
        // Check if toast with same title already exists
        const existingToast = document.querySelector(`[data-toast-title="${title}"]`);
        if (existingToast) {
            return; // Prevent duplicate toasts
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full`;
        toast.setAttribute('data-toast-title', title);
        
        const colors = {
            success: 'bg-green-500 text-white',
            error: 'bg-red-500 text-white',
            info: 'bg-blue-500 text-white',
            warning: 'bg-yellow-500 text-white'
        };
        
        toast.className += ` ${colors[type] || colors.info}`;
        toast.innerHTML = `
            <div class="font-semibold">${title}</div>
            <div class="text-sm opacity-90">${message}</div>
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 10);
        
        // Remove after 5 seconds
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                if (toast.parentNode) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 5000);
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
// GLOBAL REALTIME MANAGER INSTANCE
// ================================================================

export const realtimeManager = new RealtimeManager();

// ================================================================
// LEGACY COMPATIBILITY - Alias for backward compatibility
// ================================================================

export const realtimeMonitor = realtimeManager;

// ================================================================
// LEGACY FUNCTIONS (for backward compatibility)
// ================================================================

export function subscribeToApplications(callback) {
    return realtimeManager.subscribeToTable('applications', callback);
}

export async function subscribeToNotifications(callback) {
    const profile = await getUserProfile((await supabase.auth.getUser()).data.user?.id);
    return realtimeManager.subscribeToTable('notifications', callback, `user_id=eq.${profile?.id}`);
}

export function subscribeToApplicationStatus(applicationId, callback) {
    return realtimeManager.subscribeToTable('applications', callback, `id=eq.${applicationId}`);
}

export function unsubscribe(channel) {
    supabase.removeChannel(channel);
}

export async function subscribeToDashboardCounters(callback) {
    const profile = await getUserProfile((await supabase.auth.getUser()).data.user?.id);
    return realtimeManager.subscribeToTable('applications', async (payload) => {
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
    return { total: total || 0, pending: pending || 0, approved: approved || 0, rejected: rejected  || 0 };
}

