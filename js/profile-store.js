// js/profile-store.js - Centralized Profile Store with In-Memory Caching
import supabase from './supabase.js';

let cachedProfile = null;
let cachedUser = null;
let profilePromise = null;
let userPromise = null;

/**
 * Get authenticated user, cached in-memory
 */
export async function getCurrentUser() {
    if (cachedUser) return cachedUser;
    if (userPromise) return userPromise;

    userPromise = (async () => {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) throw error;
            cachedUser = user;
            return user;
        } catch (error) {
            console.error('ProfileStore: Error getting user:', error);
            return null;
        } finally {
            userPromise = null;
        }
    })();

    return userPromise;
}

/**
 * Get profile from profiles table, cached in-memory and collapsed to a single promise
 */
export async function getProfile(forceRefresh = false) {
    if (cachedProfile && !forceRefresh) return cachedProfile;
    if (profilePromise && !forceRefresh) return profilePromise;

    profilePromise = (async () => {
        try {
            const user = await getCurrentUser();
            if (!user) return null;

            console.warn('=== ProfileStore: PERFORMING PROFILE DATABASE QUERY ===');
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error) throw error;
            cachedProfile = data;
            
            // Sync to window for compatibility with legacy page scripts
            window.profile = data;
            window.user = user;
            
            return data;
        } catch (error) {
            console.error('ProfileStore: Error getting user profile:', error);
            return null;
        } finally {
            profilePromise = null;
        }
    })();

    return profilePromise;
}

/**
 * Clear in-memory profile and user caches
 */
export function clearCache() {
    console.log('ProfileStore: Clearing cache');
    cachedProfile = null;
    cachedUser = null;
    profilePromise = null;
    userPromise = null;
    window.profile = null;
    window.user = null;
}

let hasInitialized = false;

// Auto-listen to auth state changes to keep the store fresh
supabase.auth.onAuthStateChange((event, session) => {
    console.log('ProfileStore: Auth State Changed:', event);
    if (event === 'SIGNED_OUT') {
        clearCache();
        hasInitialized = false;
    } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
            cachedUser = session.user;
            if (!hasInitialized || event === 'USER_UPDATED') {
                hasInitialized = true;
                getProfile(true); // pre-fetch and cache
            }
        }
    }
});
