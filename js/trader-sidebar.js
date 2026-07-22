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
            label: 'Dashboard',
            icon: 'ri-dashboard-line',
            path: '/pages/trader/overview.html',
            type: 'link'
        },
        {
            id: 'services',
            label: 'Services',
            icon: 'ri-service-line',
            type: 'menu',
            items: [
                { id: 'cvet-dashboard', label: 'CVET Dashboard', icon: 'ri-file-list-3-line', path: '/pages/trader/declaration-details.html' },
                { id: 'direct-assessment', label: 'Direct Assessment', icon: 'ri-calculator-line', path: '/pages/trader/create-assessment.html' },
                { id: 'vehicle-query', label: 'Vehicle Query', icon: 'ri-search-line', path: '/pages/trader/search-vehicle.html' }
            ]
        },
        {
            id: 'applications',
            label: 'Applications',
            icon: 'ri-folder-line',
            type: 'menu',
            items: [
                { id: 'drafts', label: 'Drafts', icon: 'ri-draft-line', path: '/pages/trader/draft.html', countKey: 'draft' },
                { id: 'submitted', label: 'Submitted', icon: 'ri-paper-plane-line', path: '/pages/trader/submitted.html', countKey: 'submitted' },
                { id: 'under-review', label: 'Under Review', icon: 'ri-time-line', path: '/pages/trader/under-review.html', countKey: 'under_review' },
                { id: 'approved', label: 'Approved', icon: 'ri-checkbox-circle-line', path: '/pages/trader/approved.html', countKey: 'approved' },
                { id: 'rejected', label: 'Rejected', icon: 'ri-arrow-go-back-line', path: '/pages/trader/rejected.html', countKey: 'rejected' },
                { id: 'completed', label: 'Completed', icon: 'ri-flag-2-line', path: '/pages/trader/completed.html', countKey: 'completed' }
            ]
        },
        {
            id: 'notifications',
            label: 'Notifications',
            icon: 'ri-notification-3-line',
            path: '/pages/trader/recent-notifications.html',
            type: 'link',
            countKey: 'unread_notifications'
        }
    ]
};

// ================================================================
// STATE MANAGEMENT
// ================================================================

let sidebarState = {
    profile: null,
    counts: {
        draft: 0,
        submitted: 0,
        under_review: 0,
        approved: 0,
        rejected: 0,
        completed: 0,
        unread_notifications: 0
    },
    subscriptions: [],
    currentPage: null,
    observer: null,
    expandedMenus: new Set()
};

// ================================================================
// SUPABASE QUERIES FOR LIVE COUNTS
// ================================================================

async function fetchAllCounts(profileId) {
    try {
        const [
            draftsRes, submittedRes, underReviewRes, approvedRes, rejectedRes, completedRes, notifRes
        ] = await Promise.all([
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', profileId).eq('status', 'draft'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', profileId).eq('status', 'submitted'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', profileId).eq('status', 'under_review'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', profileId).eq('status', 'approved'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', profileId).eq('status', 'rejected'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', profileId).eq('status', 'completed'),
            supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', profileId).eq('read', false),
        ]);

        return {
            draft: draftsRes.count || 0,
            submitted: submittedRes.count || 0,
            under_review: underReviewRes.count || 0,
            approved: approvedRes.count || 0,
            rejected: rejectedRes.count || 0,
            completed: completedRes.count || 0,
            unread_notifications: notifRes.count || 0
        };
    } catch (error) {
        console.error('Error fetching trader sidebar counts:', error);
        return sidebarState.counts;
    }
}

// ================================================================
// REALTIME SUBSCRIPTIONS
// ================================================================

function setupRealtimeSubscriptions(profileId) {
    const tables = ['applications', 'notifications', 'payments', 'documents', 'invoices', 'cvet_certificates', 'cargo_release_documents'];

    tables.forEach(table => {
        const channel = supabase
            .channel(`trader-sidebar-${table}`)
            .on('postgres_changes', { event: '*', schema: 'public', table }, async () => {
                const freshCounts = await fetchAllCounts(profileId);
                sidebarState.counts = freshCounts;
                updateCountBadges();
            })
            .subscribe();

        sidebarState.subscriptions.push(channel);
    });
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

    const profile = sidebarState.profile;
    const counts = sidebarState.counts;

    // Determine which menu should be expanded based on current path
    determineActiveMenu(currentPath);

    const navItems = SIDEBAR_CONFIG.sections.map(section => {
        if (section.type === 'link') {
            // Direct link (Dashboard)
            const isActive = currentPath.includes(section.id) || currentPath.endsWith(section.path.split('/').pop());
            const activeClass = isActive ? 'bg-blue-50 text-blue-800 font-semibold' : 'text-gray-600 hover:bg-gray-50';
            const count = section.countKey ? (counts[section.countKey] || 0) : 0;
            const badge = section.countKey && count > 0
                ? `<span class="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] h-4 flex items-center justify-center" data-count-key="${section.countKey}">${count > 99 ? '99+' : count}</span>`
                : '';
            
            return `
                <a href="${section.path}" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${activeClass}">
                    <i class="${section.icon} text-base w-5 text-center flex-shrink-0"></i>
                    <span class="flex-1">${section.label}</span>
                    ${badge}
                </a>
            `;
        } else if (section.type === 'menu') {
            // Expandable menu
            const isExpanded = sidebarState.expandedMenus.has(section.id);
            const hasActiveSubmenu = section.items.some(item => 
                currentPath.includes(item.id) || currentPath.endsWith(item.path?.split('/').pop())
            );
            const parentActiveClass = hasActiveSubmenu ? 'bg-blue-50 text-blue-800 font-semibold' : 'text-gray-600 hover:bg-gray-50';
            const chevronClass = isExpanded ? 'rotate-180' : '';

            const submenuItems = section.items.map(item => {
                const isActive = currentPath.includes(item.id) || currentPath.endsWith(item.path?.split('/').pop());
                const activeClass = isActive ? 'bg-blue-100 text-blue-900 font-semibold' : 'text-gray-600 hover:bg-gray-50';
                const count = item.countKey ? (counts[item.countKey] || 0) : 0;
                const badge = item.countKey && count > 0
                    ? `<span class="mr-2 flex-shrink-0 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] h-4 flex items-center justify-center" data-count-key="${item.countKey}">${count > 99 ? '99+' : count}</span>`
                    : (item.countKey ? `<span class="mr-2 flex-shrink-0 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] h-4 flex items-center justify-center hidden" data-count-key="${item.countKey}">0</span>` : '');

                return `
                    <a href="${item.path}" class="flex items-center gap-2 px-3 py-2.5 pl-8 rounded-xl text-sm transition-all duration-200 ${activeClass} min-w-0">
                        <i class="${item.icon} text-base w-5 text-center flex-shrink-0"></i>
                        ${badge}
                        <span class="flex-1 min-w-0 truncate">${item.label}</span>
                    </a>
                `;
            }).join('');

            return `
                <div class="menu-section">
                    <button 
                        data-menu-toggle="${section.id}"
                        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${parentActiveClass}"
                    >
                        <i class="${section.icon} text-base w-5 text-center flex-shrink-0"></i>
                        <span class="flex-1 text-left">${section.label}</span>
                        <i class="ri-arrow-down-s-line transition-transform duration-200 ${chevronClass}"></i>
                    </button>
                    <div class="submenu overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}">
                        <div class="space-y-1 mt-1">
                            ${submenuItems}
                        </div>
                    </div>
                </div>
            `;
        }
    }).join('');

    return `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-200/70 p-4 sticky top-6 flex flex-col max-h-[calc(100vh-2rem)]">
            <!-- Profile Section -->
            <div class="text-center mb-5 pb-4 border-b border-gray-100 flex-shrink-0">
                <div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md" style="background: linear-gradient(135deg, #1e3a5f 0%, #2a5f8f 100%);">
                    <i class="ri-user-line text-white text-2xl"></i>
                </div>
                <h3 class="text-sm font-bold text-gray-800 truncate">${profile?.full_name || 'Loading...'}</h3>
                <p class="text-gray-400 text-xs mt-0.5">Trader</p>
                <span class="inline-block mt-1.5 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">● Active</span>
            </div>

            <!-- Navigation -->
            <nav class="space-y-1 flex-1 overflow-y-auto" id="sidebar-nav">
                ${navItems}
            </nav>

            <!-- Logout Button -->
            <div class="mt-auto pt-4 border-t border-gray-100 flex-shrink-0">
                <button onclick="handleLogout()" class="w-full bg-red-50 text-red-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-100 transition flex items-center justify-center gap-2">
                    <i class="ri-logout-box-line"></i> Logout
                </button>
            </div>
        </div>
    `;
}

function updateCountBadges() {
    const counts = sidebarState.counts;
    Object.keys(counts).forEach(key => {
        const badge = document.querySelector(`[data-count-key="${key}"]`);
        if (badge) {
            const count = counts[key] || 0;
            badge.textContent = count > 99 ? '99+' : count;
            badge.classList.toggle('hidden', count === 0);
        }
    });
}

// ================================================================
// INITIALIZATION
// ================================================================

async function initializeTraderSidebar() {
    try {
        console.log('=== INITIALIZING TRADER SIDEBAR ===');

        const container = document.getElementById('trader-sidebar');
        if (!container) {
            console.error('Sidebar container not found');
            return;
        }

        console.log('Sidebar container found, rendering...');
        
        // Render skeleton immediately
        container.innerHTML = renderSidebarHTML();
        console.log('Sidebar HTML rendered');

        // Load real data
        const user = await getCurrentUser();
        if (!user) {
            window.location.href = '/auth/login.html';
            return;
        }

        const profile = await getProfile();
        if (!profile || profile.role !== 'trader') {
            console.error('Invalid role:', profile?.role);
            window.location.href = '/auth/login.html';
            return;
        }

        sidebarState.profile = profile;
        sidebarState.counts = await fetchAllCounts(profile.id);
        console.log('Counts loaded:', sidebarState.counts);

        // Re-render with real data
        container.innerHTML = renderSidebarHTML();
        console.log('Sidebar re-rendered with real data');

        // Setup event delegation for menu toggles
        setupEventListeners();
        console.log('Event listeners setup');

        // Setup realtime
        setupRealtimeSubscriptions(profile.id);

        console.log('Trader sidebar initialized successfully');
    } catch (error) {
        console.error('Error initializing trader sidebar:', error);
    }
}

function determineActiveMenu(currentPath) {
    // Reset expanded menus
    sidebarState.expandedMenus.clear();

    // Check if current path matches any submenu item
    SIDEBAR_CONFIG.sections.forEach(section => {
        if (section.type === 'menu') {
            const hasActiveSubmenu = section.items.some(item => 
                currentPath.includes(item.id) || currentPath.endsWith(item.path?.split('/').pop())
            );
            if (hasActiveSubmenu) {
                sidebarState.expandedMenus.add(section.id);
            }
        }
    });

    // Don't expand any menu by default - user must click to expand
}

function toggleMenu(menuId) {
    const menuSection = document.querySelector(`[data-menu-toggle="${menuId}"]`)?.closest('.menu-section');
    if (!menuSection) return;

    const button = menuSection.querySelector('[data-menu-toggle]');
    const submenu = menuSection.querySelector('.submenu');
    const chevron = button.querySelector('.ri-arrow-down-s-line');

    if (sidebarState.expandedMenus.has(menuId)) {
        sidebarState.expandedMenus.delete(menuId);
        submenu.classList.remove('max-h-96', 'opacity-100');
        submenu.classList.add('max-h-0', 'opacity-0');
        chevron.classList.remove('rotate-180');
    } else {
        sidebarState.expandedMenus.add(menuId);
        submenu.classList.remove('max-h-0', 'opacity-0');
        submenu.classList.add('max-h-96', 'opacity-100');
        chevron.classList.add('rotate-180');
    }
}

function setupEventListeners() {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;

    nav.addEventListener('click', (e) => {
        const button = e.target.closest('[data-menu-toggle]');
        if (button) {
            const menuId = button.getAttribute('data-menu-toggle');
            toggleMenu(menuId);
        }
    });
}

// ================================================================
// CLEANUP
// ================================================================

function cleanupTraderSidebar() {
    cleanupSubscriptions();
    sidebarState = {
        profile: null,
        counts: { draft: 0, submitted: 0, under_review: 0, approved: 0, rejected: 0, completed: 0, unread_notifications: 0 },
        subscriptions: [],
        currentPage: null,
        observer: null,
        expandedMenus: new Set()
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

// Auto-initialize
if (typeof window !== 'undefined') {
    window.handleLogout = handleLogout;
    window.toggleMenu = toggleMenu;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeTraderSidebar);
    } else {
        initializeTraderSidebar();
    }
}

export { initializeTraderSidebar, handleLogout, cleanupTraderSidebar, toggleMenu };
