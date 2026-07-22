// ================================================================
// AUTH GUARD MODULE
// ================================================================
// Protects pages by checking authentication status
// ================================================================

import { checkAuth, getCurrentUser, getUserProfile, redirectToDashboard } from './auth.js';

export async function requireAuth() {
    const isAuthenticated = await checkAuth();
    
    if (!isAuthenticated) {
        // Store the current URL for redirect after login
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
        window.location.href = '/auth/login.html';
        return false;
    }
    
    return true;
}

export async function requireRole(allowedRoles) {
    const isAuthenticated = await requireAuth();
    if (!isAuthenticated) return false;
    
    const user = await getCurrentUser();
    if (!user) {
        window.location.href = '/auth/login.html';
        return false;
    }
    
    const profile = await getUserProfile(user.id);
    const userRole = profile?.role || 'trader';
    const normalizedRole = userRole === 'admin' ? 'administrator' : userRole === 'revenue_officer' ? 'revenue' : userRole;
    const normalizedAllowed = allowedRoles.map(r => r === 'admin' ? 'administrator' : r === 'revenue_officer' ? 'revenue' : r);

    if (!normalizedAllowed.includes(normalizedRole)) {
        console.warn(`Access denied for role '${userRole}' to path '${window.location.pathname}'. Redirecting to dashboard.`);
        const dashboardUrl = redirectToDashboard(userRole);
        if (dashboardUrl && window.location.pathname !== dashboardUrl) {
            window.location.href = dashboardUrl;
        }
        return false;
    }
    
    return true;
}

export async function initAuthGuard() {
    const path = window.location.pathname.toLowerCase();
    const isPublicPage = path.includes('/auth/') || path.includes('/index.html') || path.endsWith('/') || path.includes('/setup-admin.html');

    if (isPublicPage) {
        return true;
    }

    // Check authentication on protected page load
    const isAuthenticated = await checkAuth();
    
    if (!isAuthenticated) {
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
        window.location.href = '/auth/login.html?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
        return false;
    }
    
    const user = await getCurrentUser();
    const profile = await getUserProfile(user?.id);
    const userRole = profile?.role || 'trader';
    const normalizedRole = userRole === 'admin' ? 'administrator' : userRole === 'revenue_officer' ? 'revenue' : userRole;

    // Route path authorization mapping
    let allowedRoles = null;
    if (path.includes('/pages/agent/') || path.includes('/pages/trader/')) {
        allowedRoles = ['agent', 'trader'];
    } else if (path.includes('/pages/officer/')) {
        allowedRoles = ['officer'];
    } else if (path.includes('/pages/inspector/')) {
        allowedRoles = ['inspector'];
    } else if (path.includes('/pages/supervisor/')) {
        allowedRoles = ['supervisor'];
    } else if (path.includes('/pages/revenue/')) {
        allowedRoles = ['revenue', 'revenue_officer'];
    } else if (path.includes('/pages/admin/')) {
        allowedRoles = ['administrator', 'admin'];
    }

    if (allowedRoles && !allowedRoles.includes(normalizedRole)) {
        console.warn(`User role '${userRole}' is not allowed on '${window.location.pathname}'. Redirecting.`);
        const dashboardUrl = redirectToDashboard(userRole);
        if (dashboardUrl && window.location.pathname !== dashboardUrl) {
            window.location.href = dashboardUrl;
        }
        return false;
    }

    // Update UI with user info
    updateAuthUI(profile);
    
    return true;
}

function updateAuthUI(profile) {
    // Update user name display
    const userNameElements = document.querySelectorAll('[data-user-name]');
    userNameElements.forEach(el => {
        el.textContent = profile?.full_name || 'User';
    });
    
    // Update user email display
    const userEmailElements = document.querySelectorAll('[data-user-email]');
    userEmailElements.forEach(el => {
        el.textContent = profile?.email || '';
    });
    
    // Update user role display
    const userRoleElements = document.querySelectorAll('[data-user-role]');
    userRoleElements.forEach(el => {
        el.textContent = profile?.role || 'trader';
    });
    
    // Update avatar
    const avatarElements = document.querySelectorAll('[data-user-avatar]');
    avatarElements.forEach(el => {
        if (profile?.avatar) {
            el.src = profile.avatar;
        } else {
            // Show initials
            const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
            el.textContent = initials;
        }
    });
}

// Auto-initialize on DOMContentLoaded if not explicitly disabled
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initAuthGuard();
    });
} else {
    initAuthGuard();
}

