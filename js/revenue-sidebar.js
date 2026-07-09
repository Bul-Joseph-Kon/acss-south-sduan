// ================================================================
// REVENUE SIDEBAR MODULE
// ================================================================
// Shared sidebar component for all revenue officer pages
// Features:
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
                { id: 'dashboard-revenue', label: 'Dashboard', icon: 'ri-dashboard-line', path: '/pages/revenue/dashboard-revenue.html' }
            ]
        },
        {
            id: 'verification',
            title: 'VERIFICATION',
            items: [
                { id: 'duty-verification', label: 'Duty Verification', icon: 'ri-calculator-line', path: '/pages/revenue/duty-verification.html', countKey: 'duty_verification' },
                { id: 'payment-verification', label: 'Payment Verification', icon: 'ri-bank-card-line', path: '/pages/revenue/payment-verification.html', countKey: 'payment_verification' }
            ]
        },
        {
            id: 'analytics',
            title: 'ANALYTICS',
            items: [
                { id: 'revenue-monitoring', label: 'Revenue Monitoring', icon: 'ri-line-chart-line', path: '/pages/revenue/revenue-monitoring.html' },
                { id: 'tax-reports', label: 'Tax Reports', icon: 'ri-file-chart-line', path: '/pages/revenue/tax-reports.html' }
            ]
        },
        {
            id: 'notifications',
            title: 'NOTIFICATIONS',
            items: [
                { id: 'notifications', label: 'Notifications', icon: 'ri-notification-3-line', path: '/pages/revenue/notifications.html', countKey: 'unread_notifications' }
            ]
        },
        {
            id: 'account',
            title: 'ACCOUNT',
            items: [
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
    counts: {
        duty_verification: 0,
        payment_verification: 0,
        unread_notifications: 0
    },
    subscriptions: [],
    currentPage: null
};

// ================================================================
// SUPABASE QUERIES FOR LIVE COUNTS
// ================================================================

async function fetchCounts() {
    try {
        // 1. Pending Duty Verifications
        const { count: dutyCount, error: dutyError } = await supabase
            .from('applications')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'approved')
            .is('tax_calculation_verified', false);

        // 2. Pending Payment Verifications
        const { count: paymentCount, error: paymentError } = await supabase
            .from('payments')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        // 3. Unread Notifications for this user
        let notifCount = 0;
        if (sidebarState.profile) {
            const { count, error: notifError } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', sidebarState.profile.id)
                .eq('read', false);
            if (!notifError) notifCount = count || 0;
        }

        return {
            duty_verification: dutyCount || 0,
            payment_verification: paymentCount || 0,
            unread_notifications: notifCount
        };
    } catch (error) {
        console.error('Error fetching revenue counts:', error);
        return { duty_verification: 0, payment_verification: 0, unread_notifications: 0 };
    }
}

// ================================================================
// SIDEBAR RENDERING
// ================================================================

function determineCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'dashboard-revenue.html';
    
    // Find matching item
    for (const section of SIDEBAR_CONFIG.sections) {
        for (const item of section.items) {
            if (item.path.includes(filename)) {
                return item.id;
            }
        }
    }
    return 'dashboard-revenue';
}

function renderSidebarHTML() {
    const activePage = determineCurrentPage();
    let html = `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-200/70 p-5 sticky top-6">
            <div class="text-center mb-5">
                <div class="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-md gradient-bg">
                    <i class="ri-user-line text-white text-3xl"></i>
                </div>
                <h3 class="text-lg font-bold text-gray-800">${sidebarState.profile?.full_name || 'Revenue Officer'}</h3>
                <p class="text-gray-500 text-sm capitalize">${sidebarState.profile?.role || 'Revenue'}</p>
                <span class="inline-block mt-1 text-xs bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-medium">● Active</span>
            </div>
            <nav class="space-y-4">
    `;

    SIDEBAR_CONFIG.sections.forEach(section => {
        if (section.title !== 'Dashboard' && section.title !== 'ACCOUNT') {
            html += `<p class="text-xs font-semibold text-gray-400 tracking-wider uppercase mt-4 mb-2">${section.title}</p>`;
        }
        
        section.items.forEach(item => {
            if (item.action === 'logout') {
                html += `
                    <button onclick="handleLogout()" class="mt-4 w-full bg-red-50 text-red-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-100 transition flex items-center justify-center gap-2">
                        <i class="${item.icon}"></i> ${item.label}
                    </button>
                `;
            } else {
                const isActive = item.id === activePage;
                const activeClass = isActive ? 'active font-semibold' : '';
                
                let badgeHtml = '';
                if (item.countKey) {
                    const count = sidebarState.counts[item.countKey] || 0;
                    const display = count > 0 ? 'inline' : 'none';
                    badgeHtml = `<span class="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold" data-count-key="${item.countKey}" style="display: ${display}">${count}</span>`;
                }

                html += `
                    <a href="${item.path}" class="sidebar-link ${activeClass}">
                        <i class="${item.icon}"></i>
                        <span>${item.label}</span>
                        ${badgeHtml}
                    </a>
                `;
            }
        });
    });

    html += `
            </nav>
        </div>
    `;

    return html;
}

function updateCountBadges() {
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
// REALTIME SUBSCRIPTIONS
// ================================================================

function setupRealtimeSubscriptions() {
    // 1. Listen for application changes
    const appChannel = supabase
        .channel('revenue-sidebar-apps')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, async () => {
            const freshCounts = await fetchCounts();
            sidebarState.counts.duty_verification = freshCounts.duty_verification;
            updateCountBadges();
        })
        .subscribe();

    // 2. Listen for payment changes
    const paymentChannel = supabase
        .channel('revenue-sidebar-payments')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, async () => {
            const freshCounts = await fetchCounts();
            sidebarState.counts.payment_verification = freshCounts.payment_verification;
            updateCountBadges();
        })
        .subscribe();

    // 3. Listen for notification changes
    const notifChannel = supabase
        .channel('revenue-sidebar-notifs')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, async () => {
            const freshCounts = await fetchCounts();
            sidebarState.counts.unread_notifications = freshCounts.unread_notifications;
            updateCountBadges();
        })
        .subscribe();

    sidebarState.subscriptions.push(appChannel, paymentChannel, notifChannel);
}

function cleanupSubscriptions() {
    sidebarState.subscriptions.forEach(channel => {
        supabase.removeChannel(channel);
    });
    sidebarState.subscriptions = [];
}

// ================================================================
// INITIALIZATION
// ================================================================

async function initializeRevenueSidebar() {
    try {
        console.log('=== INITIALIZING REVENUE SIDEBAR ===');

        const user = await getCurrentUser();
        if (!user) return;

        const profile = await getProfile();
        if (!profile || profile.role !== 'revenue') return;

        sidebarState.profile = profile;
        sidebarState.counts = await fetchCounts();

        const sidebarContainer = document.getElementById('revenue-sidebar');
        if (sidebarContainer) {
            sidebarContainer.innerHTML = renderSidebarHTML();
        }

        setupRealtimeSubscriptions();
        console.log('Revenue sidebar initialized successfully');
    } catch (error) {
        console.error('Error initializing revenue sidebar:', error);
    }
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

// Auto-initialize when loaded in browser
if (typeof window !== 'undefined') {
    window.handleLogout = handleLogout;
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeRevenueSidebar);
    } else {
        initializeRevenueSidebar();
    }
}

export { initializeRevenueSidebar, handleLogout };
