// ================================================================
// AGENT SIDEBAR MODULE
// ================================================================
// Shared sidebar component for all agent pages
// Features:
// - Flat navigation (no dropdowns)
// - Live counts from Supabase
// - Realtime updates
// - Active page highlighting
// - Authentication & role verification
// ================================================================

import supabase from './supabase.js';
import { getCurrentUser, getUserProfile } from './auth.js';

// ================================================================
// SIDEBAR CONFIGURATION
// ================================================================

const SIDEBAR_CONFIG = {
    sections: [
        {
            id: 'main',
            title: '',
            items: [
                { id: 'dashboard-agent', label: 'Dashboard', icon: 'ri-dashboard-line', path: '/pages/agent/dashboard-agent.html' },
                { id: 'agent-license', label: 'Agent License', icon: 'ri-id-card-line', path: '/pages/agent/dashboard.html', countKey: 'agent_license' },
                { id: 'cvet', label: 'CVET', icon: 'ri-file-invoice-line', path: '/pages/agent/create-declaration.html', countKey: 'cvet' },
                { id: 'direct-assessment', label: 'Direct Assessment', icon: 'ri-file-search-line', path: '/pages/agent/direct-assessment.html', countKey: 'direct_assessment' },
                { id: 'vehicle-query', label: 'Vehicle Query', icon: 'ri-car-line', path: '/pages/agent/search-vehicle.html' },
                { id: 'drafts', label: 'Drafts', icon: 'ri-pen-line', path: '/pages/agent/draft.html', countKey: 'drafts' },
                { id: 'submitted', label: 'Submitted', icon: 'ri-paper-plane-line', path: '/pages/agent/submitted.html', countKey: 'submitted' },
                { id: 'under-review', label: 'Under Review', icon: 'ri-search-line', path: '/pages/agent/under-review.html', countKey: 'under_review' },
                { id: 'pending-payment', label: 'Pending Payment', icon: 'ri-bank-card-line', path: '/pages/agent/pending-payment.html', countKey: 'pending_payment' },
                { id: 'approved', label: 'Approved', icon: 'ri-check-circle-line', path: '/pages/agent/approved.html', countKey: 'approved' },
                { id: 'rejected', label: 'Rejected', icon: 'ri-close-circle-line', path: '/pages/agent/rejected.html', countKey: 'rejected' },
                { id: 'completed', label: 'Completed', icon: 'ri-flag-checkered-line', path: '/pages/agent/completed.html', countKey: 'completed' },
                { id: 'payment-required', label: 'Payment Required', icon: 'ri-bank-card-line', path: '/pages/agent/payment-required.html' },
                { id: 'license-issued', label: 'License Issued', icon: 'ri-id-card-line', path: '/pages/agent/license-issued.html' },
                { id: 'cvet-ready', label: 'CVET Ready', icon: 'ri-file-invoice-line', path: '/pages/agent/cvet-ready.html' },
                { id: 'cargo-released', label: 'Cargo Released', icon: 'ri-truck-line', path: '/pages/agent/cargo-released.html' },
                { id: 'system-alerts', label: 'System Alerts', icon: 'ri-server-line', path: '/pages/agent/system-alerts.html', countKey: 'unread_notifications' }
            ]
        },
        {
            id: 'account',
            title: '',
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
        drafts: 0,
        submitted: 0,
        under_review: 0,
        pending_payment: 0,
        approved: 0,
        rejected: 0,
        completed: 0,
        agent_license: 0,
        cvet: 0,
        direct_assessment: 0,
        unread_notifications: 0
    },
    subscriptions: [],
    currentPage: null,
    observer: null
};

// ================================================================
// SUPABASE QUERIES FOR LIVE COUNTS
// ================================================================

async function fetchAllCounts(userId) {
    try {
        // Fetch application counts by status where agent_id = userId
        const [draftsResult, submittedResult, underReviewResult, pendingPaymentResult, approvedResult, rejectedResult, completedResult, agentLicenseResult, cvetResult, directResult] = await Promise.all([
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('agent_id', userId).eq('status', 'draft'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('agent_id', userId).eq('status', 'submitted'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('agent_id', userId).in('status', ['pending_review', 'under_review', 'under_inspection']),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('agent_id', userId).eq('status', 'awaiting_payment'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('agent_id', userId).eq('status', 'approved'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('agent_id', userId).eq('status', 'rejected'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('agent_id', userId).eq('status', 'completed'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('application_type', 'agent_license'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('agent_id', userId).eq('application_type', 'cvet'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('agent_id', userId).eq('application_type', 'direct_assessment')
        ]);

        // Fetch unread notifications
        const { count: notifCount } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('read', false);

        return {
            drafts: draftsResult.count || 0,
            submitted: submittedResult.count || 0,
            under_review: underReviewResult.count || 0,
            pending_payment: pendingPaymentResult.count || 0,
            approved: approvedResult.count || 0,
            rejected: rejectedResult.count || 0,
            completed: completedResult.count || 0,
            agent_license: agentLicenseResult.count || 0,
            cvet: cvetResult.count || 0,
            direct_assessment: directResult.count || 0,
            unread_notifications: notifCount || 0
        };
    } catch (error) {
        console.error('Error fetching agent counts:', error);
        return {
            drafts: 0,
            submitted: 0,
            under_review: 0,
            pending_payment: 0,
            approved: 0,
            rejected: 0,
            completed: 0,
            agent_license: 0,
            cvet: 0,
            direct_assessment: 0,
            unread_notifications: 0
        };
    }
}

// ================================================================
// SIDEBAR RENDERING
// ================================================================

function renderSidebarHTML() {
    const currentPath = window.location.pathname;
    sidebarState.currentPage = currentPath;

    let html = `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-200/70 p-5 sticky top-6">
            <!-- Profile Section -->
            <div class="text-center mb-5">
                <div class="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-md" style="background: linear-gradient(135deg, #1e3a5f 0%, #2a5f8f 100%);">
                    <i class="ri-user-line text-white text-3xl"></i>
                </div>
                <h3 class="text-lg font-bold text-gray-800">${sidebarState.profile?.full_name || 'Loading...'}</h3>
                <p class="text-gray-500 text-sm capitalize">${sidebarState.profile?.role || 'Agent'}</p>
                <span class="inline-block mt-1 text-xs bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-medium">● Active</span>
                ${sidebarState.profile?.license_number ? `<div class="mt-1 text-xs text-gray-400">License: ${sidebarState.profile.license_number}</div>` : ''}
            </div>

            <!-- Navigation -->
            <nav class="space-y-1 mb-4">
    `;

    SIDEBAR_CONFIG.sections.forEach(section => {
        section.items.forEach(item => {
            if (item.action === 'logout') {
                html += `
                    <button onclick="handleLogout()" class="mt-4 w-full bg-red-50 text-red-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-100 transition flex items-center justify-center gap-2">
                        <i class="${item.icon}"></i> ${item.label}
                    </button>
                `;
            } else {
                const isActive = item.path === currentPath;
                const activeClass = isActive ? 'active' : '';
                
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

function setupRealtimeSubscriptions(userId) {
    const appChannel = supabase
        .channel('agent-sidebar-apps')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, async () => {
            const freshCounts = await fetchAllCounts(userId);
            sidebarState.counts = freshCounts;
            updateCountBadges();
        })
        .subscribe();

    const notifChannel = supabase
        .channel('agent-sidebar-notifs')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, async () => {
            const freshCounts = await fetchAllCounts(userId);
            sidebarState.counts = freshCounts;
            updateCountBadges();
        })
        .subscribe();

    sidebarState.subscriptions.push(appChannel, notifChannel);
}

function cleanupSubscriptions() {
    sidebarState.subscriptions.forEach(subscription => {
        supabase.removeChannel(subscription);
    });
    sidebarState.subscriptions = [];
}

// ================================================================
// INITIALIZATION
// ================================================================

async function initializeAgentSidebar() {
    try {
        console.log('=== INITIALIZING AGENT SIDEBAR ===');

        const sidebarContainer = document.getElementById('agent-sidebar');
        if (sidebarContainer) {
            // Render sidebar immediately
            sidebarContainer.innerHTML = renderSidebarHTML();
            
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        const target = mutation.target;
                        if (target.id === 'agent-sidebar') {
                            if (target.children.length === 0) {
                                console.log('Agent sidebar was cleared, re-rendering...');
                                target.innerHTML = renderSidebarHTML();
                            }
                        }
                    }
                });
            });
            
            observer.observe(sidebarContainer, { childList: true, subtree: true });
            sidebarState.observer = observer;
        }

        // Load real data in background
        const user = await getCurrentUser();
        if (!user) {
            console.error('User not authenticated');
            window.location.href = '/auth/login.html';
            return;
        }

        const profile = await getUserProfile(user.id);
        if (!profile || profile.role !== 'agent') {
            console.error('Invalid role or profile not found');
            window.location.href = '/auth/login.html';
            return;
        }

        sidebarState.profile = profile;

        sidebarState.counts = await fetchAllCounts(profile.id);

        // Update sidebar with real data
        if (sidebarContainer) {
            sidebarContainer.innerHTML = renderSidebarHTML();
        }

        setupRealtimeSubscriptions(profile.id);

        console.log('Agent sidebar initialized successfully');
    } catch (error) {
        console.error('Error initializing agent sidebar:', error);
    }
}

// ================================================================
// CLEANUP
// ================================================================

function cleanupAgentSidebar() {
    if (sidebarState.observer) {
        sidebarState.observer.disconnect();
        sidebarState.observer = null;
    }
    cleanupSubscriptions();
    sidebarState = {
        profile: null,
        counts: {
            drafts: 0,
            submitted: 0,
            under_review: 0,
            pending_payment: 0,
            approved: 0,
            rejected: 0,
            completed: 0,
            agent_license: 0,
            cvet: 0,
            unread_notifications: 0
        },
        subscriptions: [],
        currentPage: null,
        observer: null
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

// Auto-initialize when loaded in browser
if (typeof window !== 'undefined') {
    window.handleLogout = handleLogout;
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAgentSidebar);
    } else {
        initializeAgentSidebar();
    }
}

export { initializeAgentSidebar, handleLogout, cleanupAgentSidebar };
