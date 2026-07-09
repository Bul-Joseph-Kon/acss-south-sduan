// js/profile-loader.js - Dynamically load current user profile and expose to global scope
import { getProfile, getCurrentUser } from './profile-store.js';

export async function loadCurrentUserProfile() {
    try {
        const user = await getCurrentUser();
        const profile = await getProfile();
        
        if (profile) {
            if (!localStorage.getItem('userRole')) localStorage.setItem('userRole', profile.role);
            if (!localStorage.getItem('userName')) localStorage.setItem('userName', profile.full_name);
            if (!localStorage.getItem('userId')) localStorage.setItem('userId', profile.user_id);
            if (!localStorage.getItem('userIdentifier')) localStorage.setItem('userIdentifier', profile.id);
        }
        return { user, profile };
    } catch (error) {
        console.error('Error in loadCurrentUserProfile:', error);
    }
    return { user: null, profile: null };
}
