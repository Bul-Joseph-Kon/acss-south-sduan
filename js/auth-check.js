// ================================================================
// SHARED AUTHENTICATION CHECK MODULE
// ================================================================
// This module provides shared authentication and role verification
// for all sub-pages across the application
// ================================================================

import { checkAuth, verifyRoleAccess, redirectToDashboard, getCurrentUser, getUserProfile } from './auth.js';
import supabase from './supabase.js';

// ================================================================
// PAGE AUTHENTICATION CHECK
// ================================================================

export async function checkPageAuth(requiredRole) {
    console.log('=== CHECKING PAGE AUTHENTICATION ===');
    console.log('Required role:', requiredRole);

    // Check if user is authenticated
    const isAuthenticated = await checkAuth();
    console.log('Is authenticated:', isAuthenticated);

    if (!isAuthenticated) {
        console.log('Not authenticated, redirecting to login');
        window.location.href = '../../auth/login.html';
        return false;
    }

    // Get session to ensure Supabase client is authenticated
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    console.log('=== SESSION CHECK IN AUTH-CHECK ===');
    console.log('Session Data:', sessionData);
    console.log('Session Error:', sessionError);
    console.log('Session User ID:', sessionData?.session?.user?.id);

    if (sessionError || !sessionData?.session) {
        console.log('No session, redirecting to login');
        window.location.href = '../../auth/login.html';
        return false;
    }

    // Get user's actual role from database (single source of truth)
    const user = sessionData.session.user;
    console.log('User ID from session:', user.id);

    const profile = await getUserProfile(user.id);
    console.log('=== PROFILE FROM DATABASE ===');
    console.log('Profile:', profile);
    console.log('Profile role:', profile?.role);

    if (!profile || !profile.role) {
        console.log('No profile or role found, redirecting to login');
        window.location.href = '../../auth/login.html';
        return false;
    }

    const userRole = profile.role;
    console.log('User role from database:', userRole);

    // Update localStorage with fresh data from database
    localStorage.setItem('userRole', userRole);
    localStorage.setItem('userName', profile.full_name || user.email);
    localStorage.setItem('userIdentifier', profile.id || user.id);
    localStorage.setItem('userId', profile.user_id || user.id);

    // Verify role access
    const hasAccess = await verifyRoleAccess(requiredRole);
    console.log('Has role access:', hasAccess);

    if (!hasAccess) {
        console.log('Unauthorized access attempt, redirecting to correct dashboard');
        
        // Get user's actual role and redirect to their dashboard
        if (profile && profile.role) {
            console.log('Redirecting to user dashboard:', profile.role);
            const dashboardUrl = redirectToDashboard(profile.role);
            window.location.href = dashboardUrl;
            return false;
        }
        
        // Fallback to login
        window.location.href = '../../auth/login.html';
        return false;
    }

    console.log('Authentication check passed');
    await updatePageProfileUI(requiredRole);
    return true;
}

// ================================================================
// LOAD USER PROFILE DATA
// ================================================================

export async function loadUserProfile() {
    const user = await getCurrentUser();
    if (!user) return null;

    const profile = await getUserProfile(user.id);
    return profile;
}

async function updatePageProfileUI(requiredRole) {
    const user = await getCurrentUser();
    const profile = user ? await getUserProfile(user.id) : null;
    const displayName = profile?.full_name || localStorage.getItem('userName') || user?.email || 'User';
    const displayRole = formatRole(profile?.role || localStorage.getItem('userRole') || requiredRole);

    document.querySelectorAll('[data-user-name], #agentProfileName, #traderProfileName').forEach(el => {
        el.textContent = displayName;
    });

    document.querySelectorAll('[data-user-role], #agentProfileRole, #traderProfileRole').forEach(el => {
        el.textContent = displayRole;
    });

    document.querySelectorAll('#agentHeaderRole, #traderHeaderRole, .header-profile-btn span.hidden').forEach(el => {
        el.textContent = displayName;
    });

    document.querySelectorAll('.text-center h3').forEach(el => {
        if (/^(agent|trader|john trader|clearing agent|user)$/i.test(el.textContent.trim())) {
            el.textContent = displayName;
        }
    });

    document.querySelectorAll('.text-center p').forEach(el => {
        if (/^(agent|trader|licensed agent|user)$/i.test(el.textContent.trim())) {
            el.textContent = displayRole;
        }
    });

    const welcomeTitle = document.getElementById('agentWelcomeTitle') || document.getElementById('traderWelcomeTitle');
    if (welcomeTitle) {
        welcomeTitle.textContent = `Welcome back, ${displayName}!`;
    }
}

function formatRole(role) {
    const labels = {
        agent: 'Agent',
        trader: 'Trader',
        officer: 'Officer',
        inspector: 'Inspector',
        supervisor: 'Supervisor',
        revenue: 'Revenue Officer',
        revenue_officer: 'Revenue Officer',
        administrator: 'Administrator',
        admin: 'Administrator'
    };

    return labels[String(role || '').toLowerCase()] || 'User';
}

// ================================================================
// INITIALIZE PAGE WITH AUTH CHECK
// ================================================================

export async function initPage(requiredRole, callback) {
    const authCheck = await checkPageAuth(requiredRole);
    
    if (authCheck && callback) {
        await callback();
    }
}
