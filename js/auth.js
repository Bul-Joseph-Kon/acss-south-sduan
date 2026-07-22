// ================================================================
// AUTHENTICATION MODULE
// ================================================================
// Handles all authentication operations with Supabase
// ================================================================

import supabase from './supabase.js';
import { SUPABASE_CONFIG, ERROR_MESSAGES, SUCCESS_MESSAGES, dashboardUrls } from './config.js';
import { realtimeManager } from './realtime.js';

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
        console.log('=== SUPABASE PROJECT VERIFICATION ===');
        console.log('supabase.supabaseUrl:', supabase.supabaseUrl);

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

        // Check profile status
        console.log('=== CHECKING PROFILE STATUS ===');
        console.log('Profile status:', profile.status);

        if (!profile.status) {
            console.error('=== PROFILE HAS NO STATUS ===');
            return { success: false, error: 'User profile has no status assigned. Please contact administrator.' };
        }

        if (profile.status === 'pending') {
            console.log('=== ACCOUNT PENDING APPROVAL ===');
            // Sign out the user immediately
            await supabase.auth.signOut();
            return {
                success: false,
                error: 'Your account is awaiting administrator approval. Please check back later.'
            };
        }

        if (profile.status === 'inactive') {
            console.log('=== ACCOUNT INACTIVE ===');
            // Sign out the user immediately
            await supabase.auth.signOut();
            return {
                success: false,
                error: 'Your account is inactive. Please contact the administrator.'
            };
        }

        if (profile.status === 'suspended') {
            console.log('=== ACCOUNT SUSPENDED ===');
            // Sign out the user immediately
            await supabase.auth.signOut();
            return {
                success: false,
                error: 'Your account has been suspended. Please contact the administrator.'
            };
        }

        if (profile.status !== 'active') {
            console.error('=== UNKNOWN PROFILE STATUS ===');
            console.error('Status:', profile.status);
            // Sign out the user immediately
            await supabase.auth.signOut();
            return {
                success: false,
                error: 'Your account has an unknown status. Please contact the administrator.'
            };
        }

        console.log('=== ACCOUNT STATUS ACTIVE - PROCEEDING ===');

        console.log('=== STORING PROFILE DATA ===');
        console.log('User ID:', sessionData.session.user.id);
        console.log('Profile ID:', profile.id);
        console.log('Profile user_id:', profile.user_id);
        console.log('Profile role:', profile.role);
        console.log('Profile full_name:', profile.full_name);

        // Log activity for successful login
        const payload = {
            user_id: sessionData.session.user.id,
            activity_type: 'user_login',
            description: 'User logged in successfully',
            metadata: JSON.stringify({
                email: email,
                role: profile.role
            }),
            ip_address: null,
            created_at: new Date().toISOString()
        };

        console.log("=== BEFORE ACTIVITY INSERT ===");
        console.log(payload);

        const { data: activityData, error: activityError } = await supabase
            .from('activity_logs')
            .insert(payload)
            .select()
            .single();

        console.log("=== AFTER ACTIVITY INSERT ===");
        console.log(activityData);
        console.log(activityError);

        if (activityError) {
            console.error(activityError.code);
            console.error(activityError.message);
            console.error(activityError.details);
            console.error(activityError.hint);
        }

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

                    // Log activity for successful registration
                    const payload = {
                        user_id: data.user.id,
                        activity_type: 'user_registration',
                        description: 'User registered successfully',
                        metadata: JSON.stringify({
                            email: email,
                            role: metadata?.role || 'trader'
                        }),
                        ip_address: null,
                        created_at: new Date().toISOString()
                    };

                    console.log("=== BEFORE ACTIVITY INSERT ===");
                    console.log(payload);

                    const { data: activityData, error: activityError } = await supabase
                        .from('activity_logs')
                        .insert(payload)
                        .select()
                        .single();

                    console.log("=== AFTER ACTIVITY INSERT ===");
                    console.log(activityData);
                    console.log(activityError);

                    if (activityError) {
                        console.error(activityError.code);
                        console.error(activityError.message);
                        console.error(activityError.details);
                        console.error(activityError.hint);
                    }
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
        
        // Cleanup Realtime subscriptions
        realtimeManager.cleanupOnSignOut();
        
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
        const { getProfile } = await import('./profile-store.js');
        const profile = await getProfile();
        if (profile && (!userId || profile.user_id === userId)) {
            console.log('=== getUserProfile (CACHED FROM PROFILE STORE) ===', profile);
            return profile;
        }
    } catch (e) {
        console.error('ProfileStore cache load failed, falling back to database query:', e);
    }

    try {
        // If userId not provided, get it from current session
        if (!userId) {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('No active session found');
            }
            userId = session.user.id;
        }

        console.log('=== getUserProfile (DATABASE QUERY) ===');
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
        console.log('=== updateUserProfile DEBUG ===');
        console.log('profileId:', profileId);
        console.log('updates:', updates);

        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', profileId)
            .select();

        console.log('Update result data:', data);
        console.log('Update result error:', error);
        console.log('Update result data length:', data?.length);

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
        trader: '/pages/trader/dashboard-trader.html',
        agent: '/pages/agent/dashboard-agent.html',
        officer: '/pages/officer/dashboard-officer.html',
        inspector: '/pages/inspector/dashboard-inspector.html',
        supervisor: '/pages/supervisor/dashboard-supervisor.html',
        revenue: '/pages/revenue/dashboard-revenue.html',
        administrator: '/pages/admin/dashboard-admin.html'
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
        console.log('=== CREATING USER VIA EDGE FUNCTION ===');
        console.log('Email:', email);
        console.log('Role:', role);
        console.log('Full Name:', fullName);

        // Get current session to send authorization header
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
            console.error('No active session:', sessionError);
            return { success: false, error: 'You must be logged in to create users' };
        }

        // Call the Edge Function
        const { data, error } = await supabase.functions.invoke('create-user', {
            body: {
                email,
                password,
                full_name: fullName,
                role,
                phone,
                nationality,
                applicant_type: applicantType,
                identity_document_type: identityDocumentType,
                identity_document_number: identityDocumentNumber,
                employee_id: employeeId,
                department,
                customs_office: customsOffice
            },
            headers: {
                Authorization: `Bearer ${session.access_token}`
            }
        });

        if (error) {
            console.error('Edge function error:', error);
            return { success: false, error: error.message || 'Failed to create user' };
        }

        console.log('User created successfully:', data);
        return { success: true, data: data.data };
    } catch (error) {
        console.error('Create user error:', error);
        return { success: false, error: error.message || 'Failed to create user' };
    }
}

// ================================================================
// UPDATE USER ROLE
// ================================================================

export async function updateUserRole(userId, newRole) {
    try {
        console.log('=== updateUserRole DEBUG ===');
        console.log('userId:', userId);
        console.log('newRole:', newRole);

        const { data, error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('user_id', userId)
            .select();

        console.log('Update result data:', data);
        console.log('Update result error:', error);
        console.log('Update result data length:', data?.length);

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
        console.log('=== updateUserStatus DEBUG ===');
        console.log('userId:', userId);
        console.log('status:', status);

        // Diagnostic: Check if record exists with this identifier
        const check = await supabase
            .from('profiles')
            .select('id, user_id, status')
            .or(`id.eq.${userId},user_id.eq.${userId}`);

        console.log('Lookup before update:', check.data);
        console.log('Lookup error:', check.error);
        if (check.data && check.data.length > 0) {
            console.log('Found record - id:', check.data[0].id, 'user_id:', check.data[0].user_id, 'status:', check.data[0].status);
        }

        const { data, error, count } = await supabase
            .from('profiles')
            .update({ status })
            .eq('user_id', userId)
            .select('id,user_id,status', { count: 'exact' });

        console.log('Updated rows:', count);
        console.log('Returned data:', data);
        console.log('Error:', error);

        // Verify database state after update
        const verify = await supabase
            .from('profiles')
            .select('id,user_id,status')
            .eq('user_id', userId);

        console.log('Database after update:', verify.data);

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
        // Call secure admin RPC to delete auth user (cascades to profiles table)
        const { data, error } = await supabase.rpc('delete_user_by_id', { target_user_id: userId });

        if (error) throw error;

        return { success: true, data };
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
        console.log('=== DEBUG: getAllUsers START ===');
        console.log('Input filters:', JSON.stringify(filters));
        console.log('filters.role:', filters.role);
        console.log('filters.status:', filters.status);
        console.log('filters.search:', filters.search);

        // JWT payload inspection
        const { data: { session } } = await supabase.auth.getSession();
        console.log('ACCESS TOKEN EXISTS:', !!session?.access_token);

        if (session?.access_token) {
            try {
                const payload = JSON.parse(atob(session.access_token.split('.')[1]));
                console.log('JWT PAYLOAD:', payload);
            } catch (e) {
                console.error('Failed to parse JWT:', e);
            }
        }

        // Direct query tests before main query
        console.log('=== DIAGNOSTIC: Direct admin_users query ===');
        const adminUsers = await supabase.from('admin_users').select('*');
        console.log('ADMIN USERS:', adminUsers);
        console.log('admin_users data:', adminUsers.data);
        console.log('admin_users error:', adminUsers.error);
        console.log('admin_users count:', adminUsers.data?.length);

        console.log('=== DIAGNOSTIC: Direct profiles query ===');
        const profiles = await supabase.from('profiles').select('*');
        console.log('PROFILES:', profiles);
        console.log('profiles data:', profiles.data);
        console.log('profiles error:', profiles.error);
        console.log('profiles count:', profiles.data?.length);

        console.log('=== DIAGNOSTIC: Direct own profile query ===');
        const ownProfile = await supabase.from('profiles').select('*').eq('user_id', session?.user?.id);
        console.log('OWN PROFILE:', ownProfile);
        console.log('ownProfile data:', ownProfile.data);
        console.log('ownProfile error:', ownProfile.error);

        let query = supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        console.log('Base query: SELECT * FROM profiles ORDER BY created_at DESC');

        // Apply filters
        if (filters.role) {
            console.log('Applying role filter:', filters.role);
            query = query.eq('role', filters.role);
            console.log('Query now includes: role =', filters.role);
        } else {
            console.log('No role filter applied (filters.role is falsy)');
        }

        if (filters.status) {
            console.log('Applying status filter:', filters.status);
            query = query.eq('status', filters.status);
            console.log('Query now includes: status =', filters.status);
        } else {
            console.log('No status filter applied (filters.status is falsy)');
        }

        if (filters.search) {
            console.log('Applying search filter:', filters.search);
            query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
            console.log('Query now includes search:', filters.search);
        } else {
            console.log('No search filter applied (filters.search is falsy)');
        }

        console.log('=== DEBUG: Executing Supabase query ===');
        const { data, error } = await query;

        console.log('=== DEBUG: Supabase response ===');
        console.log('Error:', error);
        console.log('Data length:', data ? data.length : 'null');
        console.log('Data:', data);
        console.log('Raw data array:', JSON.stringify(data));

        if (error) throw error;

        console.log('=== DEBUG: getAllUsers RETURN ===');
        console.log('Returning: success=true, data.length=', data.length);
        console.log('Returning data:', data);

        return { success: true, data };
    } catch (error) {
        console.error('=== DEBUG: getAllUsers ERROR ===');
        console.error('Error:', error);
        console.error('Error message:', error.message);
        console.error('Returning: success=false, error=', error.message);
        return { success: false, error: error.message };
    }
}

export { dashboardUrls };
