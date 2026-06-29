// ================================================================
// AUTHENTICATION MODULE
// ================================================================
// Handles all authentication operations with Supabase
// ================================================================

import supabase from './supabase.js';
import { SUPABASE_CONFIG, ERROR_MESSAGES, SUCCESS_MESSAGES, dashboardUrls } from './config.js';

// ================================================================
// SIGN IN
// ================================================================

export async function signIn(email, password) {
    try {
        console.log('=== SIGN IN ATTEMPT ===');
        console.log('Email:', email);
        console.log('Password length:', password.length);

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        console.log('=== SIGN IN RESPONSE ===');
        console.log('Data:', data);
        console.log('Error:', error);

        if (error) {
            console.error('Error details:', JSON.stringify(error, null, 2));
            throw error;
        }

        // Get user profile - handle gracefully if it doesn't exist
        let profile = null;
        try {
            profile = await getUserProfile(data.user.id);
            console.log('User profile:', profile);
        } catch (profileError) {
            console.warn('Profile not found, using defaults:', profileError);
            profile = {
                full_name: data.user.email,
                role: 'trader',
                id: data.user.id
            };
        }

        // Store in localStorage for compatibility
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userName', profile?.full_name || data.user.email);
        localStorage.setItem('userEmail', data.user.email);
        localStorage.setItem('userRole', profile?.role || 'trader');
        localStorage.setItem('userIdentifier', profile?.id || data.user.id);

        return { success: true, data, profile };
    } catch (error) {
        console.error('=== SIGN IN FAILED ===');
        console.error('Error:', error);
        console.error('Error message:', error.message);
        return { success: false, error: error.message || ERROR_MESSAGES.auth.invalidCredentials };
    }
}

// ================================================================
// SIGN UP
// ================================================================

export async function signUp(email, password, metadata = {}) {
    try {
        console.log('=== SIGN UP ATTEMPT ===');
        console.log('Email:', email);
        console.log('Metadata:', metadata);

        // Simple sign up (trigger is disabled, profile will be created manually)
        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });

        console.log('=== SIGN UP RESPONSE ===');
        console.log('Data:', JSON.stringify(data, null, 2));
        console.log('Error:', JSON.stringify(error, null, 2));

        if (error) {
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Error status:', error.status);
            throw error;
        }

        // Manually create profile after successful registration
        if (data.user) {
            console.log('Creating user profile manually...');
            try {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert({
                        user_id: data.user.id,
                        full_name: metadata?.full_name || `${metadata?.first_name || ''} ${metadata?.last_name || ''}`.trim() || 'User',
                        email: email,
                        phone: metadata?.phone || null,
                        nationality: metadata?.nationality || 'South Sudan',
                        role: metadata?.role || 'trader',
                        status: 'active'
                    });

                if (profileError) {
                    console.warn('Profile creation failed:', profileError);
                } else {
                    console.log('Profile created successfully');
                }
            } catch (profileError) {
                console.warn('Profile creation error:', profileError);
            }
        }

        return { success: true, data };
    } catch (error) {
        console.error('=== SIGN UP FAILED ===');
        console.error('Error:', error);
        console.error('Error type:', typeof error);
        console.error('Error keys:', Object.keys(error || {}));
        console.error('Error string:', String(error));

        let errorMsg = 'Registration failed';
        if (error.message) errorMsg = error.message;
        else if (error.status) errorMsg = `Error ${error.status}`;
        else if (typeof error === 'string') errorMsg = error;

        return { success: false, error: errorMsg };
    }
}

// ================================================================
// SIGN OUT
// ================================================================

export async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) throw error;

        // Clear localStorage
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userIdentifier');
        localStorage.removeItem('portal_session');

        return { success: true };
    } catch (error) {
        console.error('Sign out error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// RESET PASSWORD
// ================================================================

export async function resetPassword(email) {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/reset-password.html`
        });

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error('Reset password error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// UPDATE PASSWORD
// ================================================================

export async function updatePassword(newPassword) {
    try {
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error('Update password error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// UPDATE EMAIL
// ================================================================

export async function updateEmail(newEmail) {
    try {
        const { error } = await supabase.auth.updateUser({
            email: newEmail
        });

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error('Update email error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// GET USER PROFILE
// ================================================================

export async function getUserProfile(userId) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) throw error;

        return data;
    } catch (error) {
        console.error('Get profile error:', error);
        return null;
    }
}

// ================================================================
// UPDATE USER PROFILE
// ================================================================

export async function updateUserProfile(profileId, updates) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', profileId)
            .select()
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Update profile error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// REDIRECT BASED ON ROLE
// ================================================================

export function redirectToDashboard(role) {
    const dashboardUrl = dashboardUrls[role] || dashboardUrls.trader;
    window.location.href = dashboardUrl;
}

// ================================================================
// CHECK AUTHENTICATION
// ================================================================

export async function checkAuth() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return session !== null;
    } catch (error) {
        console.error('Check auth error:', error);
        return false;
    }
}

// ================================================================
// GET CURRENT USER
// ================================================================

export async function getCurrentUser() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    } catch (error) {
        console.error('Get current user error:', error);
        return null;
    }
}

// ================================================================
// AUTH STATE LISTENER
// ================================================================

export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
}
