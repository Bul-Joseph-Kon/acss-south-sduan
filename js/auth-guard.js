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
    
    if (!allowedRoles.includes(userRole)) {
        // Redirect to appropriate dashboard based on role
        redirectToDashboard(userRole);
        return false;
    }
    
    return true;
}

export async function initAuthGuard() {
    // Check authentication on page load
    const isAuthenticated = await checkAuth();
    
    if (!isAuthenticated) {
        // Show login prompt or redirect
        window.location.href = '/auth/login.html?redirect=' + encodeURIComponent(window.location.pathname);
        return false;
    }
    
    // Get user info and update UI
    const user = await getCurrentUser();
    const profile = await getUserProfile(user.id);
    
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

// Auto-initialize on import if page has data-auth-guard attribute
if (document.currentScript && document.currentScript.hasAttribute('data-auto-init')) {
    document.addEventListener('DOMContentLoaded', initAuthGuard);
}
