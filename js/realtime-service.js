// ================================================================
// SUPABASE REALTIME SERVICE
// ================================================================
// Handles realtime subscriptions for automatic data updates
// ================================================================

import supabase from './supabase.js';

// ================================================================
// SUBSCRIPTION MANAGEMENT
// ================================================================

const subscriptions = new Map();

/**
 * Subscribe to application changes for a specific agent
 * @param {string} agentId - The agent's user ID
 * @param {Function} callback - Callback function to handle updates
 * @returns {Object} Subscription object
 */
function subscribeToAgentApplications(agentId, callback) {
    const channelName = `agent_applications_${agentId}`;
    
    if (subscriptions.has(channelName)) {
        console.log('Subscription already exists:', channelName);
        return subscriptions.get(channelName);
    }

    const channel = supabase
        .channel(channelName)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'applications',
                filter: `agent_id=eq.${agentId}`
            },
            (payload) => {
                console.log('Application update received:', payload);
                if (callback) callback(payload);
            }
        )
        .subscribe((status) => {
            console.log('Subscription status:', channelName, status);
        });

    subscriptions.set(channelName, channel);
    return channel;
}

/**
 * Subscribe to applications by status (for officers, inspectors, etc.)
 * @param {string} status - Application status to filter by
 * @param {Function} callback - Callback function to handle updates
 * @returns {Object} Subscription object
 */
function subscribeToApplicationsByStatus(status, callback) {
    const channelName = `applications_status_${status}`;
    
    if (subscriptions.has(channelName)) {
        console.log('Subscription already exists:', channelName);
        return subscriptions.get(channelName);
    }

    const channel = supabase
        .channel(channelName)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'applications',
                filter: `status=eq.${status}`
            },
            (payload) => {
                console.log('Application status update received:', payload);
                if (callback) callback(payload);
            }
        )
        .subscribe((status) => {
            console.log('Subscription status:', channelName, status);
        });

    subscriptions.set(channelName, channel);
    return channel;
}

/**
 * Subscribe to notifications for a user
 * @param {string} userId - The user's ID
 * @param {Function} callback - Callback function to handle updates
 * @returns {Object} Subscription object
 */
function subscribeToNotifications(userId, callback) {
    const channelName = `notifications_${userId}`;
    
    if (subscriptions.has(channelName)) {
        console.log('Subscription already exists:', channelName);
        return subscriptions.get(channelName);
    }

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
                console.log('Notification update received:', payload);
                if (callback) callback(payload);
            }
        )
        .subscribe((status) => {
            console.log('Subscription status:', channelName, status);
        });

    subscriptions.set(channelName, channel);
    return channel;
}

/**
 * Subscribe to AI validation results for a specific application
 * @param {string} applicationId - The application ID
 * @param {Function} callback - Callback function to handle updates
 * @returns {Object} Subscription object
 */
function subscribeToAIValidationResults(applicationId, callback) {
    const channelName = `ai_validation_${applicationId}`;
    
    if (subscriptions.has(channelName)) {
        console.log('Subscription already exists:', channelName);
        return subscriptions.get(channelName);
    }

    const channel = supabase
        .channel(channelName)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'ai_validation_results',
                filter: `application_id=eq.${applicationId}`
            },
            (payload) => {
                console.log('AI validation result update received:', payload);
                if (callback) callback(payload);
            }
        )
        .subscribe((status) => {
            console.log('Subscription status:', channelName, status);
        });

    subscriptions.set(channelName, channel);
    return channel;
}

/**
 * Subscribe to risk assessments for a specific application
 * @param {string} applicationId - The application ID
 * @param {Function} callback - Callback function to handle updates
 * @returns {Object} Subscription object
 */
function subscribeToRiskAssessments(applicationId, callback) {
    const channelName = `risk_assessment_${applicationId}`;
    
    if (subscriptions.has(channelName)) {
        console.log('Subscription already exists:', channelName);
        return subscriptions.get(channelName);
    }

    const channel = supabase
        .channel(channelName)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'risk_assessments',
                filter: `application_id=eq.${applicationId}`
            },
            (payload) => {
                console.log('Risk assessment update received:', payload);
                if (callback) callback(payload);
            }
        )
        .subscribe((status) => {
            console.log('Subscription status:', channelName, status);
        });

    subscriptions.set(channelName, channel);
    return channel;
}

/**
 * Subscribe to payments for an application
 * @param {string} applicationId - The application ID
 * @param {Function} callback - Callback function to handle updates
 * @returns {Object} Subscription object
 */
function subscribeToApplicationPayments(applicationId, callback) {
    const channelName = `payments_${applicationId}`;
    
    if (subscriptions.has(channelName)) {
        console.log('Subscription already exists:', channelName);
        return subscriptions.get(channelName);
    }

    const channel = supabase
        .channel(channelName)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'payments',
                filter: `application_id=eq.${applicationId}`
            },
            (payload) => {
                console.log('Payment update received:', payload);
                if (callback) callback(payload);
            }
        )
        .subscribe((status) => {
            console.log('Subscription status:', channelName, status);
        });

    subscriptions.set(channelName, channel);
    return channel;
}

/**
 * Subscribe to escalated cases
 * @param {Function} callback - Callback function to handle updates
 * @returns {Object} Subscription object
 */
function subscribeToEscalatedCases(callback) {
    const channelName = 'escalated_cases';
    
    if (subscriptions.has(channelName)) {
        console.log('Subscription already exists:', channelName);
        return subscriptions.get(channelName);
    }

    const channel = supabase
        .channel(channelName)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'escalated_cases'
            },
            (payload) => {
                console.log('Escalated case update received:', payload);
                if (callback) callback(payload);
            }
        )
        .subscribe((status) => {
            console.log('Subscription status:', channelName, status);
        });

    subscriptions.set(channelName, channel);
    return channel;
}

/**
 * Subscribe to activity logs
 * @param {string} userId - The user's ID (optional)
 * @param {Function} callback - Callback function to handle updates
 * @returns {Object} Subscription object
 */
function subscribeToActivityLogs(userId, callback) {
    const channelName = `activity_logs_${userId || 'all'}`;
    
    if (subscriptions.has(channelName)) {
        console.log('Subscription already exists:', channelName);
        return subscriptions.get(channelName);
    }

    const filter = userId ? `user_id=eq.${userId}` : undefined;

    const channel = supabase
        .channel(channelName)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'activity_logs',
                filter
            },
            (payload) => {
                console.log('Activity log update received:', payload);
                if (callback) callback(payload);
            }
        )
        .subscribe((status) => {
            console.log('Subscription status:', channelName, status);
        });

    subscriptions.set(channelName, channel);
    return channel;
}

/**
 * Subscribe to documents for an application
 * @param {string} applicationId - The application ID
 * @param {Function} callback - Callback function to handle updates
 * @returns {Object} Subscription object
 */
function subscribeToApplicationDocuments(applicationId, callback) {
    const channelName = `documents_${applicationId}`;
    
    if (subscriptions.has(channelName)) {
        console.log('Subscription already exists:', channelName);
        return subscriptions.get(channelName);
    }

    const channel = supabase
        .channel(channelName)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'documents',
                filter: `application_id=eq.${applicationId}`
            },
            (payload) => {
                console.log('Document update received:', payload);
                if (callback) callback(payload);
            }
        )
        .subscribe((status) => {
            console.log('Subscription status:', channelName, status);
        });

    subscriptions.set(channelName, channel);
    return channel;
}

/**
 * Unsubscribe from a specific channel
 * @param {string} channelName - The channel name to unsubscribe from
 */
function unsubscribe(channelName) {
    const channel = subscriptions.get(channelName);
    if (channel) {
        supabase.removeChannel(channel);
        subscriptions.delete(channelName);
        console.log('Unsubscribed from:', channelName);
    }
}

/**
 * Unsubscribe from all channels
 */
function unsubscribeAll() {
    subscriptions.forEach((channel, channelName) => {
        supabase.removeChannel(channel);
        console.log('Unsubscribed from:', channelName);
    });
    subscriptions.clear();
}

/**
 * Setup comprehensive realtime subscriptions for a role
 * @param {string} role - The user role (agent, officer, inspector, supervisor)
 * @param {string} userId - The user ID
 * @param {Object} callbacks - Object containing callback functions for different events
 */
function setupRealtimeForRole(role, userId, callbacks = {}) {
    console.log('Setting up realtime for role:', role, 'user:', userId);

    // Subscribe to notifications for all roles
    subscribeToNotifications(userId, callbacks.onNotification);

    switch (role) {
        case 'agent':
            // Agent subscribes to their applications
            subscribeToAgentApplications(userId, callbacks.onApplicationUpdate);
            subscribeToActivityLogs(userId, callbacks.onActivityLog);
            // Subscribe to AI validation results for agent's applications
            subscribeToAIValidationResults(userId, callbacks.onAIValidationResult);
            break;

        case 'officer':
            // Officer subscribes to pending review applications
            subscribeToApplicationsByStatus('under_review', callbacks.onApplicationUpdate);
            subscribeToActivityLogs(userId, callbacks.onActivityLog);
            // Subscribe to AI validation results for all applications
            subscribeToAIValidationResults(null, callbacks.onAIValidationResult);
            break;

        case 'inspector':
            // Inspector subscribes to under inspection applications
            subscribeToApplicationsByStatus('under_inspection', callbacks.onApplicationUpdate);
            subscribeToEscalatedCases(callbacks.onEscalatedCase);
            subscribeToActivityLogs(userId, callbacks.onActivityLog);
            break;

        case 'supervisor':
            // Supervisor subscribes to escalated cases and approved applications
            subscribeToEscalatedCases(callbacks.onEscalatedCase);
            subscribeToApplicationsByStatus('approved', callbacks.onApplicationUpdate);
            subscribeToActivityLogs(null, callbacks.onActivityLog);
            break;

        default:
            console.warn('Unknown role for realtime setup:', role);
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', unsubscribeAll);
}

// ================================================================
// UI UPDATE HELPERS
// ================================================================

/**
 * Update a dashboard count element
 * @param {string} elementId - The element ID to update
 * @param {number} count - The new count
 */
function updateDashboardCount(elementId, count) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = count;
        // Add a flash animation
        element.classList.add('bg-yellow-100');
        setTimeout(() => element.classList.remove('bg-yellow-100'), 500);
    }
}

/**
 * Update a status badge
 * @param {string} elementId - The element ID to update
 * @param {string} status - The new status
 */
function updateStatusBadge(elementId, status) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = status;
        element.className = getStatusBadgeClass(status);
    }
}

function getStatusBadgeClass(status) {
    const statusClasses = {
        draft: 'px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700',
        submitted: 'px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700',
        pending_review: 'px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700',
        under_inspection: 'px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700',
        returned: 'px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700',
        approved: 'px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700',
        rejected: 'px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700',
        paid: 'px-2 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700',
        completed: 'px-2 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700',
        awaiting_payment: 'px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700'
    };
    return statusClasses[status] || statusClasses.draft;
}

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The notification type (success, error, warning, info)
 */
function showToastNotification(message, type = 'info') {
    // Remove existing toast if any
    const existingToast = document.querySelector('.realtime-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `realtime-toast fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 ${getToastClass(type)}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 5000);
}

function getToastClass(type) {
    const classes = {
        success: 'bg-green-600 text-white',
        error: 'bg-red-600 text-white',
        warning: 'bg-yellow-500 text-white',
        info: 'bg-blue-600 text-white'
    };
    return classes[type] || classes.info;
}

// ================================================================
// EXPORTS
// ================================================================

export {
    subscribeToAgentApplications,
    subscribeToApplicationsByStatus,
    subscribeToNotifications,
    subscribeToAIValidationResults,
    subscribeToRiskAssessments,
    subscribeToActivityLogs,
    subscribeToApplicationPayments,
    subscribeToEscalatedCases,
    subscribeToApplicationDocuments,
    unsubscribe,
    unsubscribeAll,
    setupRealtimeForRole,
    updateDashboardCount,
    updateStatusBadge,
    showToastNotification
};
