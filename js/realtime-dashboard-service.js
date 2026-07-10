// ================================================================
// REALTIME DASHBOARD SERVICE
// ================================================================
// Provides realtime subscription management for dashboard updates
// ================================================================

import supabase from './supabase.js';

// ================================================================
// REALTIME SUBSCRIPTION MANAGER
// ================================================================

class RealtimeDashboardManager {
    constructor() {
        this.subscriptions = new Map();
    }

    /**
     * Subscribe to applications table changes
     */
    subscribeToApplications(callback, filters = {}) {
        const channelName = 'applications-channel';
        
        // Remove existing subscription if any
        this.unsubscribe(channelName);

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'applications',
                    filter: filters.status ? `status=eq.${filters.status}` : undefined
                },
                (payload) => {
                    console.log('Applications realtime update:', payload);
                    callback(payload);
                }
            )
            .subscribe((status) => {
                console.log('Applications subscription status:', status);
            });

        this.subscriptions.set(channelName, channel);
        return channel;
    }

    /**
     * Subscribe to notifications table changes
     */
    subscribeToNotifications(userId, callback) {
        const channelName = `notifications-${userId}`;
        
        // Remove existing subscription if any
        this.unsubscribe(channelName);

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    console.log('Notifications realtime update:', payload);
                    callback(payload);
                }
            )
            .subscribe((status) => {
                console.log('Notifications subscription status:', status);
            });

        this.subscriptions.set(channelName, channel);
        return channel;
    }

    /**
     * Subscribe to payments table changes
     */
    subscribeToPayments(userId, callback) {
        const channelName = `payments-${userId}`;
        
        // Remove existing subscription if any
        this.unsubscribe(channelName);

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'payments',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    console.log('Payments realtime update:', payload);
                    callback(payload);
                }
            )
            .subscribe((status) => {
                console.log('Payments subscription status:', status);
            });

        this.subscriptions.set(channelName, channel);
        return channel;
    }

    /**
     * Subscribe to escalated_cases table changes
     */
    subscribeToEscalatedCases(escalatedToId, callback) {
        const channelName = `escalated-cases-${escalatedToId}`;
        
        // Remove existing subscription if any
        this.unsubscribe(channelName);

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'escalated_cases',
                    filter: `escalated_to=eq.${escalatedToId}`
                },
                (payload) => {
                    console.log('Escalated cases realtime update:', payload);
                    callback(payload);
                }
            )
            .subscribe((status) => {
                console.log('Escalated cases subscription status:', status);
            });

        this.subscriptions.set(channelName, channel);
        return channel;
    }

    /**
     * Subscribe to activity_logs table changes
     */
    subscribeToActivityLogs(userId, callback) {
        const channelName = `activity-logs-${userId}`;
        
        // Remove existing subscription if any
        this.unsubscribe(channelName);

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'activity_logs',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    console.log('Activity logs realtime update:', payload);
                    callback(payload);
                }
            )
            .subscribe((status) => {
                console.log('Activity logs subscription status:', status);
            });

        this.subscriptions.set(channelName, channel);
        return channel;
    }

    /**
     * Unsubscribe from a specific channel
     */
    unsubscribe(channelName) {
        const existing = this.subscriptions.get(channelName);
        if (existing) {
            supabase.removeChannel(existing);
            this.subscriptions.delete(channelName);
        }
    }

    /**
     * Unsubscribe from all channels
     */
    unsubscribeAll() {
        this.subscriptions.forEach((channel, name) => {
            supabase.removeChannel(channel);
        });
        this.subscriptions.clear();
    }
}

// Export singleton instance
export const realtimeDashboard = new RealtimeDashboardManager();

// ================================================================
// DASHBOARD-SPECIFIC REALTIME SETUP
// ================================================================

/**
 * Setup realtime for Agent dashboard
 */
export function setupAgentRealtime(userId, callbacks) {
    // Subscribe to applications where user is agent or user
    realtimeDashboard.subscribeToApplications((payload) => {
        if (callbacks.onApplicationsChange) {
            callbacks.onApplicationsChange(payload);
        }
    });

    // Subscribe to notifications
    realtimeDashboard.subscribeToNotifications(userId, (payload) => {
        if (callbacks.onNotification) {
            callbacks.onNotification(payload);
        }
    });

    // Subscribe to payments
    realtimeDashboard.subscribeToPayments(userId, (payload) => {
        if (callbacks.onPaymentChange) {
            callbacks.onPaymentChange(payload);
        }
    });
}

/**
 * Setup realtime for Officer dashboard
 */
export function setupOfficerRealtime(callbacks) {
    // Subscribe to pending review applications
    realtimeDashboard.subscribeToApplications(
        (payload) => {
            if (callbacks.onApplicationsChange) {
                callbacks.onApplicationsChange(payload);
            }
        },
        { status: 'pending_review' }
    );
}

/**
 * Setup realtime for Inspector dashboard
 */
export function setupInspectorRealtime(callbacks) {
    // Subscribe to under inspection applications
    realtimeDashboard.subscribeToApplications(
        (payload) => {
            if (callbacks.onApplicationsChange) {
                callbacks.onApplicationsChange(payload);
            }
        },
        { status: 'under_inspection' }
    );
}

/**
 * Setup realtime for Supervisor dashboard
 */
export function setupSupervisorRealtime(escalatedToId, callbacks) {
    // Subscribe to escalated cases
    realtimeDashboard.subscribeToEscalatedCases(escalatedToId, (payload) => {
        if (callbacks.onEscalationChange) {
            callbacks.onEscalationChange(payload);
        }
    });
}

/**
 * Setup realtime for Revenue Officer dashboard
 */
export function setupRevenueRealtime(callbacks) {
    // Subscribe to approved applications
    realtimeDashboard.subscribeToApplications(
        (payload) => {
            if (callbacks.onApplicationsChange) {
                callbacks.onApplicationsChange(payload);
            }
        },
        { status: 'approved' }
    );

    // Subscribe to awaiting payment applications
    realtimeDashboard.subscribeToApplications(
        (payload) => {
            if (callbacks.onAwaitingPaymentChange) {
                callbacks.onAwaitingPaymentChange(payload);
            }
        },
        { status: 'awaiting_payment' }
    );
}
