// ================================================================
// AUTHENTICATION MODULE
// ================================================================
// Handles all authentication operations with Supabase
// ================================================================

import supabase from './supabase.js';
import { SUPABASE_CONFIG, ERROR_MESSAGES, SUCCESS_MESSAGES, dashboardUrls } from './config.js';

// Debug: Log dashboardUrls on import
console.log('=== AUTH.JS IMPORT DEBUG ===');
console.log('dashboardUrls imported:', dashboardUrls);
console.log('SUPABASE_CONFIG.dashboardUrls:', SUPABASE_CONFIG?.dashboardUrls);

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

        console.log('=== AUTHENTICATED USER ===');
        console.log('User ID:', data.user.id);
        console.log('User Email:', data.user.email);
        console.log('Session:', data.session);
        console.log('Access Token:', data.session?.access_token?.substring(0, 20) + '...');

        // Get the session to ensure Supabase client is authenticated
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        console.log('=== SESSION CHECK ===');
        console.log('Session Data:', sessionData);
        console.log('Session Error:', sessionError);
        console.log('Session User ID:', sessionData?.session?.user?.id);

        if (sessionError || !sessionData?.session) {
            console.error('Failed to get session after sign-in');
            return { success: false, error: 'Failed to establish session' };
        }

        // Get user profile from database - this is the single source of truth for role
        let profile = null;
        try {
            profile = await getUserProfile(sessionData.session.user.id);
            console.log('=== PROFILE FETCHED FROM DATABASE ===');
            console.log('Profile:', profile);
            console.log('Profile role:', profile?.role);
        } catch (profileError) {
            console.error('=== PROFILE FETCH FAILED ===');
            console.error('Error:', profileError);
            console.error('Error name:', profileError.name);
            console.error('Error message:', profileError.message);
            console.error('Error code:', profileError.code);
            // Return the actual error instead of a generic message
            return { success: false, error: profileError.message || 'Failed to fetch user profile' };
        }

        // Verify profile exists and has a role
        if (!profile) {
            console.error('=== PROFILE IS NULL ===');
            console.error('This means the query returned no data or there was an error');
            console.error('User ID used for query:', sessionData.session.user.id);
            return { success: false, error: 'User profile not found in database. Please ensure your profile exists in the profiles table.' };
        }

        if (!profile.role) {
            console.error('=== PROFILE HAS NO ROLE ===');
            console.error('Profile:', profile);
            return { success: false, error: 'User profile has no role assigned. Please contact administrator.' };
        }

        console.log('=== STORING PROFILE DATA ===');
        console.log('User ID:', sessionData.session.user.id);
        console.log('Profile ID:', profile.id);
        console.log('Profile user_id:', profile.user_id);
        console.log('Profile role:', profile.role);
        console.log('Profile full_name:', profile.full_name);

        // Store in localStorage for compatibility
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userName', profile.full_name || sessionData.session.user.email);
        localStorage.setItem('userEmail', sessionData.session.user.email);
        localStorage.setItem('userRole', profile.role);
        localStorage.setItem('userIdentifier', profile.id || sessionData.session.user.id);
        localStorage.setItem('userId', profile.user_id || sessionData.session.user.id);

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

        // Sign up with email confirmation
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/login.html`
            }
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
            console.log('User ID:', data.user.id);

            try {
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .insert({
                        user_id: data.user.id,
                        full_name: metadata?.full_name || `${metadata?.first_name || ''} ${metadata?.last_name || ''}`.trim() || 'User',
                        email: email,
                        phone: metadata?.phone || null,
                        nationality: metadata?.nationality || 'South Sudan',
                        role: metadata?.role || 'trader',
                        status: 'active'
                    })
                    .select()
                    .single();

                if (profileError) {
                    console.error('Profile creation failed:', profileError);
                    console.error('Profile error details:', JSON.stringify(profileError, null, 2));
                } else {
                    console.log('Profile created successfully:', profileData);
                }
            } catch (profileError) {
                console.error('Profile creation error:', profileError);
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
        console.log('=== SIGN OUT ===');
        const { error } = await supabase.auth.signOut();

        if (error) throw error;

        // Clear all localStorage and sessionStorage
        console.log('Clearing localStorage and sessionStorage');
        localStorage.clear();
        sessionStorage.clear();

        // Redirect to main dashboard
        console.log('Redirecting to index.html');
        window.location.href = '/index.html';

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
        console.log('=== getUserProfile ===');
        console.log('Querying profiles table with user_id:', userId);
        
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        console.log('Profile query result:', { data, error });

        if (error) {
            console.error('=== PROFILE QUERY ERROR ===');
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            console.error('Error details:', error.details);
            console.error('Error hint:', error.hint);
            
            // Check for RLS permission errors
            if (error.code === '42501' || error.message.includes('permission denied')) {
                console.error('RLS PERMISSION ERROR: The profiles table has Row Level Security enabled but the current user does not have permission to read profiles.');
                console.error('SOLUTION: Add an RLS policy to the profiles table:');
                console.error('CREATE POLICY "Users can view own profile" ON profiles');
                console.error('  FOR SELECT USING (auth.uid() = user_id);');
                throw new Error('Permission denied. Please ensure RLS policies allow authenticated users to read their own profile.');
            }
            
            throw error;
        }

        console.log('Profile found:', data);
        return data;
    } catch (error) {
        console.error('Get profile error:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
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
    console.log('redirectToDashboard called with role:', role);
    console.log('Available dashboard URLs:', dashboardUrls);
    
    // Fallback dashboard URLs in case import fails
    const fallbackUrls = {
        trader: 'pages/trader/dashboard-trader.html',
        agent: 'pages/agent/dashboard-agent.html',
        officer: 'pages/officer/dashboard-officer.html',
        inspector: 'pages/inspector/dashboard-inspector.html',
        supervisor: 'pages/supervisor/dashboard-supervisor.html',
        revenue: 'pages/revenue/dashboard-revenue.html',
        administrator: 'pages/admin/dashboard-admin.html'
    };
    
    // Use imported dashboardUrls or fallback
    const urls = dashboardUrls || fallbackUrls;
    console.log('Using URLs:', urls);
    
    // Normalize role - handle various role name variations
    const roleMap = {
        'admin': 'administrator',
        'administrator': 'administrator',
        'trader': 'trader',
        'agent': 'agent',
        'officer': 'officer',
        'inspector': 'inspector',
        'supervisor': 'supervisor',
        'revenue': 'revenue',
        'revenue_officer': 'revenue'
    };
    
    const normalizedRole = roleMap[role] || role;
    console.log('Normalized role:', normalizedRole);
    
    const dashboardUrl = urls[normalizedRole];
    console.log('Resolved dashboard URL:', dashboardUrl);
    
    // If still undefined, return trader dashboard as fallback
    if (!dashboardUrl) {
        console.warn('No dashboard URL found for role:', normalizedRole, 'using trader dashboard as fallback');
        return fallbackUrls.trader;
    }
    
    return dashboardUrl;
}

// ================================================================
// VERIFY USER ROLE FOR DASHBOARD ACCESS
// ================================================================

export async function verifyRoleAccess(requiredRole) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const profile = await getUserProfile(user.id);
        if (!profile) return false;

        // Admin can access all dashboards
        if (profile.role === 'admin' || profile.role === 'administrator') {
            return true;
        }

        // Check if user's role matches the required role
        return profile.role === requiredRole;
    } catch (error) {
        console.error('Role verification error:', error);
        return false;
    }
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

// ================================================================
// CHECK IF ANY ADMIN EXISTS
// ================================================================

export async function checkAdminExists() {
    try {
        console.log('=== CHECKING IF ADMIN EXISTS ===');
        const { data, error } = await supabase
            .from('profiles')
            .select('id, role')
            .eq('role', 'administrator')
            .limit(1);

        console.log('Admin check result:', { data, error });

        if (error) {
            console.error('Database error checking admin:', error);
            // If there's a database error, assume no admin exists to allow first admin creation
            return false;
        }

        const exists = data && data.length > 0;
        console.log('Admin exists:', exists);
        return exists;
    } catch (error) {
        console.error('Check admin exists error:', error);
        // On any error, return false to allow first admin creation
        return false;
    }
}

// ================================================================
// CREATE USER (ADMIN FUNCTION)
// ================================================================

export async function createUser(email, password, fullName, role, phone = null, nationality = 'South Sudan', applicantType = 'not_applicable', identityDocumentType = 'not_applicable', identityDocumentNumber = null, employeeId = null, department = null, customsOffice = null) {
    try {
        console.log('=== CREATING USER ===');
        console.log('Email:', email);
        console.log('Role:', role);
        console.log('Full Name:', fullName);

        // Create auth user
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role: role,
                    phone: phone,
                    nationality: nationality,
                    applicant_type: applicantType,
                    identity_document_type: identityDocumentType,
                    identity_document_number: identityDocumentNumber,
                    employee_id: employeeId,
                    department: department,
                    customs_office: customsOffice
                }
            }
        });

        if (error) throw error;

        console.log('Auth user created:', data.user);

        // Create profile
        if (data.user) {
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .insert({
                    user_id: data.user.id,
                    full_name: fullName,
                    email: email,
                    phone: phone,
                    nationality: nationality,
                    applicant_type: applicantType,
                    identity_document_type: identityDocumentType,
                    identity_document_number: identityDocumentNumber,
                    role: role,
                    status: 'active',
                    employee_id: employeeId,
                    department: department,
                    customs_office: customsOffice
                })
                .select()
                .single();

            if (profileError) throw profileError;

            console.log('Profile created:', profileData);
            return { success: true, data: profileData };
        }

        return { success: false, error: 'Failed to create user' };
    } catch (error) {
        console.error('Create user error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// UPDATE USER ROLE
// ================================================================

export async function updateUserRole(userId, newRole) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Update user role error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// UPDATE USER STATUS
// ================================================================

export async function updateUserStatus(userId, status) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .update({ status: status })
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Update user status error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// DELETE USER
// ================================================================

export async function deleteUser(userId) {
    try {
        // Delete profile first
        const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('user_id', userId);

        if (profileError) throw profileError;

        // Delete auth user
        const { error: authError } = await supabase.auth.admin.deleteUser(userId);

        if (authError) throw authError;

        return { success: true };
    } catch (error) {
        console.error('Delete user error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// GET ALL USERS (ADMIN FUNCTION)
// ================================================================

export async function getAllUsers(filters = {}) {
    try {
        let query = supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        // Apply filters
        if (filters.role) {
            query = query.eq('role', filters.role);
        }

        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        if (filters.search) {
            query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
        }

        const { data, error } = await query;

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Get all users error:', error);
        return { success: false, error: error.message };
    }
}
