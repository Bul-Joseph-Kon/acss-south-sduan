// ================================================================
// OFFICER SIDEBAR MODULE
// ================================================================
// Shared sidebar component for all customs officer pages
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
                { id: 'dashboard-officer', label: 'Dashboard', icon: 'ri-dashboard-line', path: '/pages/officer/dashboard-officer.html' }
            ]
        },
        {
            id: 'queues',
            title: 'REVIEW QUEUES',
            items: [
                { id: 'cvet-review-queue', label: 'CVET Review Queue', icon: 'ri-file-invoice-line', path: '/pages/officer/cvet-review-queue.html', countKey: 'cvet_queue' },
                { id: 'direct-assessment-queue', label: 'Direct Assessment', icon: 'ri-file-search-line', path: '/pages/officer/direct-assessment-queue.html', countKey: 'da_queue' },
                { id: 'agent-license-review', label: 'Agent License Review', icon: 'ri-id-card-line', path: '/pages/officer/agent-license-review.html' },
                { id: 'risk-assessment-queue', label: 'Risk Assessment', icon: 'ri-shield-line', path: '/pages/officer/risk-assessment-queue.html' },
                { id: 'inspection-requests', label: 'Inspection Requests', icon: 'ri-clipboard-line', path: '/pages/officer/inspection-requests.html' }
            ]
        },
        {
            id: 'system',
            title: 'SYSTEM',
            items: [
                { id: 'notifications', label: 'Notifications', icon: 'ri-notification-3-line', path: '/pages/officer/notifications.html', countKey: 'unread_notifications' },
                { id: 'reports', label: 'Reports', icon: 'ri-file-chart-line', path: '/pages/officer/reports.html' }
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
        cvet_queue: 0,
        da_queue: 0,
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
        // 1. Pending CVET Reviews (submitted/pending_review applications where service_type is cvet, CVET Declaration, or null)
        const { count: cvetCount, error: cvetError } = await supabase
            .from('applications')
            .select('*', { count: 'exact', head: true })
            .in('status', ['submitted', 'pending_review'])
            .or('service_type.eq.cvet,service_type.eq.CVET Declaration,service_type.is.null');

        // 2. Pending Direct Assessment Reviews
        const { count: daCount, error: daError } = await supabase
            .from('applications')
            .select('*', { count: 'exact', head: true })
            .in('status', ['submitted', 'pending_review'])
            .eq('service_type', 'direct_assessment');

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
            cvet_queue: cvetCount || 0,
            da_queue: daCount || 0,
            unread_notifications: notifCount
        };
    } catch (error) {
        console.error('Error fetching officer counts:', error);
        return { cvet_queue: 0, da_queue: 0, unread_notifications: 0 };
    }
}

// ================================================================
// SIDEBAR RENDERING
// ================================================================

function determineCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'dashboard-officer.html';
    
    // Find matching item
    for (const section of SIDEBAR_CONFIG.sections) {
        for (const item of section.items) {
            if (item.path && item.path.includes(filename)) {
                return item.id;
            }
        }
    }
    return 'dashboard-officer';
}

function renderSidebarHTML() {
    const activePage = determineCurrentPage();
    let html = `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-200/70 p-5 sticky top-6">
            <div class="text-center mb-5">
                <div class="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-md gradient-bg">
                    <i class="ri-user-line text-white text-3xl"></i>
                </div>
                <h3 class="text-lg font-bold text-gray-800">${sidebarState.profile?.full_name || 'Customs Officer'}</h3>
                <p class="text-gray-500 text-sm capitalize">${sidebarState.profile?.role || 'Officer'}</p>
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
    const appChannel = supabase
        .channel('officer-sidebar-apps')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, async () => {
            const freshCounts = await fetchCounts();
            sidebarState.counts.cvet_queue = freshCounts.cvet_queue;
            sidebarState.counts.da_queue = freshCounts.da_queue;
            updateCountBadges();
        })
        .subscribe();

    const notifChannel = supabase
        .channel('officer-sidebar-notifs')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, async () => {
            const freshCounts = await fetchCounts();
            sidebarState.counts.unread_notifications = freshCounts.unread_notifications;
            updateCountBadges();
        })
        .subscribe();

    sidebarState.subscriptions.push(appChannel, notifChannel);
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

async function initializeOfficerSidebar() {
    try {
        console.log('=== INITIALIZING OFFICER SIDEBAR ===');

        const user = await getCurrentUser();
        if (!user) return;

        const profile = await getProfile();
        if (!profile || profile.role !== 'officer') return;

        sidebarState.profile = profile;
        sidebarState.counts = await fetchCounts();

        const sidebarContainer = document.getElementById('officer-sidebar');
        if (sidebarContainer) {
            sidebarContainer.innerHTML = renderSidebarHTML();
        }

        setupRealtimeSubscriptions();
        console.log('Officer sidebar initialized successfully');
    } catch (error) {
        console.error('Error initializing officer sidebar:', error);
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
        document.addEventListener('DOMContentLoaded', initializeOfficerSidebar);
    } else {
        initializeOfficerSidebar();
    }
}

export { initializeOfficerSidebar, handleLogout };
