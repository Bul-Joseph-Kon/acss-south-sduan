// ================================================================
// TRADER SIDEBAR MODULE
// ================================================================
// Shared sidebar component for all trader pages
// Features:
// - Flat navigation (no dropdowns)
// - Live counts from Supabase
// - Realtime updates
// - Active page highlighting
// - Authentication & role verification
// ================================================================

import supabase from './supabase.js';
import { getCurrentUser, getProfile } from './profile-store.js';

// ================================================================
// SIDEBAR CONFIGURATION
// ================================================================

const SIDEBAR_CONFIG = {
    sections: [
        {
            id: 'dashboard',
            title: 'Dashboard',
            items: [
                { id: 'overview', label: 'Overview', icon: 'ri-dashboard-line', path: '/pages/trader/overview.html' }
            ]
        },
        {
            id: 'services',
            title: 'SERVICES',
            items: [
                { id: 'cvet-dashboard', label: 'CVET Dashboard', icon: 'ri-file-list-3-line', path: '/pages/trader/declaration-details.html' },
                { id: 'direct-assessment', label: 'Direct Assessment', icon: 'ri-calculator-line', path: '/pages/trader/create-assessment.html' },
                { id: 'vehicle-query', label: 'Vehicle Query', icon: 'ri-search-line', path: '/pages/trader/search-vehicle.html' }
            ]
        },
        {
            id: 'applications',
            title: 'APPLICATIONS',
            items: [
                { id: 'drafts', label: 'Drafts', icon: 'ri-file-draft-line', path: '/pages/trader/draft.html', countKey: 'draft' },
                { id: 'submitted', label: 'Submitted', icon: 'ri-send-plane-fill', path: '/pages/trader/submitted.html', countKey: 'submitted' },
                { id: 'under-review', label: 'Under Review', icon: 'ri-time-line', path: '/pages/trader/under-review.html', countKey: 'under_review' },
                { id: 'approved', label: 'Approved', icon: 'ri-checkbox-circle-line', path: '/pages/trader/approved.html', countKey: 'approved' },
                { id: 'rejected', label: 'Rejected', icon: 'ri-close-circle-line', path: '/pages/trader/rejected.html', countKey: 'rejected' },
                { id: 'completed', label: 'Completed', icon: 'ri-task-line', path: '/pages/trader/completed.html', countKey: 'completed' }
            ]
        },
        {
            id: 'notifications',
            title: 'NOTIFICATIONS',
            items: [
                { id: 'application-updates', label: 'Application Updates', icon: 'ri-notification-3-line', path: '/pages/trader/application-updates.html', countKey: 'application_updates' },
                { id: 'payment-alerts', label: 'Payment Alerts', icon: 'ri-money-dollar-circle-line', path: '/pages/trader/payment-alerts.html', countKey: 'payment_alerts' },
                { id: 'approval-alerts', label: 'Approval Alerts', icon: 'ri-shield-check-line', path: '/pages/trader/approval-alerts.html', countKey: 'approval_alerts' },
                { id: 'system-alerts', label: 'System Alerts', icon: 'ri-alarm-warning-line', path: '/pages/trader/system-alerts.html', countKey: 'system_alerts' }
            ]
        },
        {
            id: 'account',
            title: 'ACCOUNT',
            items: [
                { id: 'profile', label: 'Profile', icon: 'ri-user-line', path: '/pages/trader/profile.html' },
                { id: 'settings', label: 'Settings', icon: 'ri-settings-3-line', path: '/pages/trader/settings.html' },
                { id: 'help', label: 'Help Center', icon: 'ri-question-line', path: '/pages/trader/help.html' },
                { id: 'logout', label: 'Logout', icon: 'ri-logout-box-line', action: 'logout' }
            ]
        }
    ]
};

// ================================================================
// STATE MANAGEMENT
// ================================================================

let sidebarState = {
    profile: null,
    counts: {},
    subscriptions: [],
    currentPage: null
};

// ================================================================
// SUPABASE QUERIES FOR LIVE COUNTS
// ================================================================

async function fetchApplicationCounts(profileId) {
    try {
        const { data, error } = await supabase
            .from('applications')
            .select('status')
            .eq('user_id', profileId);

        if (error) throw error;

        const counts = {
            draft: 0,
            submitted: 0,
            under_review: 0,
            approved: 0,
            rejected: 0,
            completed: 0
        };

        data.forEach(app => {
            if (counts.hasOwnProperty(app.status)) {
                counts[app.status]++;
            }
        });

        return counts;
    } catch (error) {
        console.error('Error fetching application counts:', error);
        return {};
    }
}

async function fetchNotificationCounts(profileId) {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('title, message, type, read')
            .eq('user_id', profileId);

        if (error) throw error;

        const counts = {
            application_updates: 0,
            payment_alerts: 0,
            approval_alerts: 0,
            system_alerts: 0
        };

        data.forEach(notif => {
            if (!notif.read) {
                const title = (notif.title || '').toLowerCase();
                const msg = (notif.message || '').toLowerCase();
                const type = (notif.type || '').toLowerCase();

                if (title.includes('payment') || title.includes('invoice') || title.includes('fee') ||
                    msg.includes('payment') || msg.includes('invoice') || msg.includes('fee') ||
                    type === 'payment_required' || type === 'payment_confirmed') {
                    counts.payment_alerts++;
                } else if (title.includes('approve') || title.includes('reject') || title.includes('clearance') ||
                           title.includes('release') || title.includes('inspect') || title.includes('verified') ||
                           msg.includes('approve') || msg.includes('reject') || msg.includes('clearance') ||
                           msg.includes('release') || msg.includes('inspect') || msg.includes('verified') ||
                           type === 'approval' || type === 'inspection') {
                    counts.approval_alerts++;
                } else if (title.includes('application') || title.includes('status') || title.includes('validation') ||
                           title.includes('submitted') || msg.includes('application') ||
                           type === 'ai_validation_error' || type === 'application_status_update') {
                    counts.application_updates++;
                } else {
                    counts.system_alerts++;
                }
            }
        });

        return counts;
    } catch (error) {
        console.error('Error fetching notification counts:', error);
        return {};
    }
}

async function fetchAllCounts(profileId) {
    const [appCounts, notifCounts] = await Promise.all([
        fetchApplicationCounts(profileId),
        fetchNotificationCounts(profileId)
    ]);

    return { ...appCounts, ...notifCounts };
}

// ================================================================
// REALTIME SUBSCRIPTIONS
// ================================================================

function setupRealtimeSubscriptions(profileId) {
    // Subscribe to applications changes
    const appSubscription = supabase
        .channel('applications-sidebar')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'applications',
                filter: `user_id=eq.${profileId}`
            },
            async () => {
                const appCounts = await fetchApplicationCounts(profileId);
                sidebarState.counts = { ...sidebarState.counts, ...appCounts };
                updateCountBadges();
            }
        )
        .subscribe();

    sidebarState.subscriptions.push(appSubscription);

    // Subscribe to notifications changes
    const notifSubscription = supabase
        .channel('notifications-sidebar')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${profileId}`
            },
            async () => {
                const notifCounts = await fetchNotificationCounts(profileId);
                sidebarState.counts = { ...sidebarState.counts, ...notifCounts };
                updateCountBadges();
            }
        )
        .subscribe();

    sidebarState.subscriptions.push(notifSubscription);
}

function cleanupSubscriptions() {
    sidebarState.subscriptions.forEach(subscription => {
        supabase.removeChannel(subscription);
    });
    sidebarState.subscriptions = [];
}

// ================================================================
// SIDEBAR RENDERING
// ================================================================

function renderSidebarHTML() {
    const currentPath = window.location.pathname;
    sidebarState.currentPage = currentPath;

    let html = `
        <aside class="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
            <!-- Profile Section -->
            <div class="p-4 border-b border-gray-200">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-semibold">
                        ${sidebarState.profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900 truncate">${sidebarState.profile?.full_name || 'Loading...'}</p>
                        <p class="text-xs text-gray-500 capitalize">${sidebarState.profile?.role || 'Trader'}</p>
                    </div>
                </div>
            </div>

            <!-- Navigation -->
            <nav class="flex-1 overflow-y-auto p-4 space-y-6">
    `;

    SIDEBAR_CONFIG.sections.forEach(section => {
        html += `
            <div class="sidebar-section">
                <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">${section.title}</h3>
                <ul class="space-y-1">
        `;

        section.items.forEach(item => {
            const isActive = item.path === currentPath;
            const count = item.countKey ? (sidebarState.counts[item.countKey] || 0) : 0;
            const countBadge = count > 0 ? `<span class="ml-auto bg-emerald-100 text-emerald-700 text-xs font-medium px-2 py-0.5 rounded-full">${count}</span>` : '';
            const activeClass = isActive ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-gray-50';

            if (item.action === 'logout') {
                html += `
                    <li>
                        <button onclick="handleLogout()" class="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <i class="${item.icon} text-lg"></i>
                            ${item.label}
                        </button>
                    </li>
                `;
            } else {
                html += `
                    <li>
                        <a href="${item.path}" class="flex items-center gap-3 px-3 py-2 text-sm font-medium ${activeClass} rounded-lg transition-colors">
                            <i class="${item.icon} text-lg"></i>
                            ${item.label}
                            ${countBadge}
                        </a>
                    </li>
                `;
            }
        });

        html += `
                </ul>
            </div>
        `;
    });

    html += `
            </nav>
        </aside>
    `;

    return html;
}

function updateCountBadges() {
    // Update count badges without re-rendering entire sidebar
    SIDEBAR_CONFIG.sections.forEach(section => {
        section.items.forEach(item => {
            if (item.countKey) {
                const count = sidebarState.counts[item.countKey] || 0;
                const badgeElement = document.querySelector(`[data-count-key="${item.countKey}"]`);
                if (badgeElement) {
                    badgeElement.textContent = count;
                    badgeElement.style.display = count > 0 ? 'inline' : 'none';
                }
            }
        });
    });
}

// ================================================================
// INITIALIZATION
// ================================================================

async function initializeTraderSidebar() {
    try {
        console.log('=== INITIALIZING TRADER SIDEBAR ===');

        // Render sidebar immediately with placeholder data
        const sidebarContainer = document.getElementById('trader-sidebar');
        if (sidebarContainer) {
            sidebarContainer.innerHTML = renderSidebarHTML();
        }

        // Verify authentication
        const user = await getCurrentUser();
        if (!user) {
            console.error('User not authenticated');
            window.location.href = '/auth/login.html';
            return;
        }

        // Load profile
        const profile = await getProfile();
        if (!profile || profile.role !== 'trader') {
            console.error('Invalid role or profile not found');
            window.location.href = '/auth/login.html';
            return;
        }

        sidebarState.profile = profile;

        // Fetch initial counts
        sidebarState.counts = await fetchAllCounts(profile.id);

        // Update sidebar with real data
        if (sidebarContainer) {
            sidebarContainer.innerHTML = renderSidebarHTML();
        }

        // Setup realtime subscriptions
        setupRealtimeSubscriptions(profile.id);

        console.log('Trader sidebar initialized successfully');
    } catch (error) {
        console.error('Error initializing trader sidebar:', error);
    }
}

// ================================================================
// CLEANUP
// ================================================================

function cleanupTraderSidebar() {
    cleanupSubscriptions();
    sidebarState = {
        profile: null,
        counts: {},
        subscriptions: [],
        currentPage: null
    };
}

// ================================================================
// LOGOUT HANDLER
// ================================================================

async function handleLogout() {
    try {
        await supabase.auth.signOut();
        localStorage.clear();
        window.location.href = '/auth/login.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// ================================================================
// EXPORTS
// ================================================================

export { initializeTraderSidebar, cleanupTraderSidebar, handleLogout };

// Auto-initialize if script is loaded directly
if (typeof window !== 'undefined') {
    window.handleLogout = handleLogout;
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeTraderSidebar);
    } else {
        initializeTraderSidebar();
    }
}
