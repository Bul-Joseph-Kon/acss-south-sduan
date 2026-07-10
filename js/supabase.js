// ================================================================
// SUPABASE CLIENT INITIALIZATION
// ================================================================
// This file initializes the Supabase client with the provided credentials
// ================================================================

import { SUPABASE_CONFIG } from './config.js';

console.log('=== SUPABASE CLIENT INITIALIZATION ===');
console.log('Supabase URL:', SUPABASE_CONFIG.url);
console.log('Supabase Key:', SUPABASE_CONFIG.key);
console.log('Key type:', SUPABASE_CONFIG.key.startsWith('sb_publishable_') ? 'Publishable key' : 'JWT token');

// Initialize Supabase client using global window.supabase (loaded from CDN)
let supabase;
if (window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
    console.log('Supabase client initialized successfully from CDN');
} else {
    console.error('Supabase CDN not loaded. Please include the Supabase CDN script in your HTML.');
}

// ================================================================
// EXPORT SUPABASE CLIENT
// ================================================================

export default supabase;

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Get current authenticated user
 */
export async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

/**
 * Get current session
 */
export async function getSession() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session;
    } catch (error) {
        console.error('Error getting session:', error);
        return null;
    }
}

/**
 * Get user profile from profiles table
 */
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
        console.error('Error getting user profile:', error);
        return null;
    }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated() {
    const session = await getSession();
    return session !== null;
}

/**
 * Handle Supabase errors
 */
export function handleSupabaseError(error) {
    console.error('Supabase error:', error);
    
    if (error.message) {
        return error.message;
    }
    
    if (error.code) {
        switch (error.code) {
            case '23505': // Unique violation
                return 'This record already exists';
            case '23503': // Foreign key violation
                return 'Referenced record does not exist';
            case '42501': // Insufficient privilege
                return 'You do not have permission to perform this action';
            default:
                return 'An error occurred. Please try again.';
        }
    }
    
    return 'An unexpected error occurred';
}

// ================================================================
// AUTH STATE LISTENER
// ================================================================

/**
 * Set up auth state change listener
 */
export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
}
