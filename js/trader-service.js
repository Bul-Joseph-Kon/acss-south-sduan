// ================================================================
// TRADER SERVICE MODULE
// ================================================================
// Unified service for all trader operations
// Aggregates functionality from applications, payments, notifications, and database modules
// ================================================================

import supabase from './supabase.js';
import { getUserProfile } from './auth.js';
import {
    fetchApplications,
    fetchApplicationById,
    createApplication,
    updateApplication,
    submitApplication,
    fetchApplicationsByStatus,
    fetchApplicationStatistics
} from './applications.js';
import {
    fetchPayments,
    fetchPaymentById,
    fetchPaymentsByApplication,
    createPayment,
    updatePayment,
    updatePaymentStatus,
    processPayment,
    fetchPaymentStatistics
} from './payments.js';
import {
    fetchNotifications,
    fetchUnreadNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getUnreadCount
} from './notifications.js';
import { fetchTable, fetchById, insertRecord, updateRecord, countRecords } from './database.js';
import { realtimeManager } from './realtime.js';

// ================================================================
// TRADER DASHBOARD DATA
// ================================================================

export async function fetchTraderDashboardData() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Not authenticated' };

        const profile = await getUserProfile(user.id);
        if (!profile) return { success: false, error: 'Profile not found' };

        // Fetch all dashboard data in parallel
        const [
            applicationsResult,
            paymentsResult,
            notificationsResult,
            unreadCountResult
        ] = await Promise.all([
            fetchApplications({
                filters: { user_id: profile.id },
                orderBy: { column: 'created_at', ascending: false },
                limit: 10
            }),
            fetchPayments({
                filters: { user_id: profile.id },
                orderBy: { column: 'created_at', ascending: false },
                limit: 5
            }),
            fetchNotifications({
                filters: { user_id: profile.id },
                orderBy: { column: 'created_at', ascending: false },
                limit: 10
            }),
            getUnreadCount()
        ]);

        // Get statistics
        const [totalApps, draftApps, submittedApps, underReviewApps, approvedApps, rejectedApps, completedApps] = await Promise.all([
            countRecords('applications', { user_id: profile.id }),
            countRecords('applications', { user_id: profile.id, status: 'draft' }),
            countRecords('applications', { user_id: profile.id, status: 'submitted' }),
            countRecords('applications', { user_id: profile.id, status: 'under_review' }),
            countRecords('applications', { user_id: profile.id, status: 'approved' }),
            countRecords('applications', { user_id: profile.id, status: 'rejected' }),
            countRecords('applications', { user_id: profile.id, status: 'completed' })
        ]);

        const [pendingPayments, paidPayments] = await Promise.all([
            countRecords('payments', { user_id: profile.id, status: 'pending' }),
            countRecords('payments', { user_id: profile.id, status: 'paid' })
        ]);

        return {
            success: true,
            data: {
                profile,
                applications: applicationsResult.success ? applicationsResult.data : [],
                payments: paymentsResult.success ? paymentsResult.data : [],
                notifications: notificationsResult.success ? notificationsResult.data : [],
                statistics: {
                    totalApplications: totalApps.success ? totalApps.count : 0,
                    draftApplications: draftApps.success ? draftApps.count : 0,
                    submittedApplications: submittedApps.success ? submittedApps.count : 0,
                    underReviewApplications: underReviewApps.success ? underReviewApps.count : 0,
                    approvedApplications: approvedApps.success ? approvedApps.count : 0,
                    rejectedApplications: rejectedApps.success ? rejectedApps.count : 0,
                    completedApplications: completedApps.success ? completedApps.count : 0,
                    pendingPayments: pendingPayments.success ? pendingPayments.count : 0,
                    paidPayments: paidPayments.success ? paidPayments.count : 0,
                    unreadNotifications: unreadCountResult.success ? unreadCountResult.count : 0
                }
            }
        };
    } catch (error) {
        console.error('Fetch trader dashboard data error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// APPLICATION MANAGEMENT
// ================================================================

export async function fetchTraderApplications(options = {}) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const profile = await getUserProfile(user.id);
    const filters = options.filters || {};
    filters.user_id = profile.id;

    return fetchApplications({
        filters,
        orderBy: options.orderBy || { column: 'created_at', ascending: false },
        limit: options.limit
    });
}

export async function fetchTraderApplicationsByStatus(status, options = {}) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const profile = await getUserProfile(user.id);

    return fetchApplications({
        filters: {
            user_id: profile.id,
            status
        },
        orderBy: options.orderBy || { column: 'created_at', ascending: false },
        limit: options.limit
    });
}

export async function fetchTraderApplicationById(applicationId) {
    try {
        const { data, error } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Fetch application by ID error:', error);
        return { success: false, error: error.message };
    }
}

export async function createTraderApplication(applicationData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const profile = await getUserProfile(user.id);

    const newApplication = {
        ...applicationData,
        user_id: profile.id,
        status: 'draft',
        created_at: new Date().toISOString()
    };

    return createApplication(newApplication);
}

export async function updateTraderApplication(applicationId, updates) {
    return updateApplication(applicationId, updates);
}

export async function submitTraderApplication(applicationId) {
    return submitApplication(applicationId);
}

export async function deleteTraderApplication(applicationId) {
    try {
        const { error } = await supabase
            .from('applications')
            .delete()
            .eq('id', applicationId);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error('Delete application error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// CVET DECLARATION WORKFLOW
// ================================================================

export async function createCVETDeclaration(declarationData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const profile = await getUserProfile(user.id);

    const declaration = {
        ...declarationData,
        user_id: profile.id,
        application_type: 'CVET',
        declaration_type: declarationData.declaration_type || 'import',
        status: 'draft',
        created_at: new Date().toISOString()
    };

    return createApplication(declaration);
}

export async function updateCVETDeclaration(applicationId, updates) {
    return updateApplication(applicationId, updates);
}

export async function submitCVETDeclaration(applicationId) {
    return submitApplication(applicationId);
}

export async function fetchCVETDeclarations(options = {}) {
    return fetchTraderApplications({
        ...options,
        filters: { ...options.filters, application_type: 'CVET' }
    });
}

// ================================================================
// DIRECT ASSESSMENT WORKFLOW
// ================================================================

export async function createDirectAssessment(assessmentData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const profile = await getUserProfile(user.id);

    const assessment = {
        ...assessmentData,
        user_id: profile.id,
        application_type: 'Direct Assessment',
        status: 'draft',
        created_at: new Date().toISOString()
    };

    return createApplication(assessment);
}

export async function updateDirectAssessment(applicationId, updates) {
    return updateApplication(applicationId, updates);
}

export async function submitDirectAssessment(applicationId) {
    return submitApplication(applicationId);
}

export async function fetchDirectAssessments(options = {}) {
    return fetchTraderApplications({
        ...options,
        filters: { ...options.filters, application_type: 'Direct Assessment' }
    });
}

// ================================================================
// VEHICLE QUERY
// ================================================================

export async function searchVehicleByChassis(chassisNumber) {
    try {
        const { data, error } = await supabase
            .from('vehicles')
            .select('*')
            .eq('chassis_number', chassisNumber)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return { success: false, error: 'Vehicle not found' };
            }
            throw error;
        }

        return { success: true, data };
    } catch (error) {
        console.error('Search vehicle error:', error);
        return { success: false, error: error.message };
    }
}

export async function searchVehicleByRegistration(registrationNumber) {
    try {
        const { data, error } = await supabase
            .from('vehicles')
            .select('*')
            .eq('registration_number', registrationNumber)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return { success: false, error: 'Vehicle not found' };
            }
            throw error;
        }

        return { success: true, data };
    } catch (error) {
        console.error('Search vehicle error:', error);
        return { success: false, error: error.message };
    }
}

export async function fetchVehicleApplications(vehicleId) {
    try {
        const { data, error } = await supabase
            .from('applications')
            .select('*')
            .eq('vehicle_id', vehicleId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Fetch vehicle applications error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// PAYMENT OPERATIONS
// ================================================================

export async function fetchTraderPayments(options = {}) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const profile = await getUserProfile(user.id);
    const filters = options.filters || {};
    filters.user_id = profile.id;

    return fetchPayments({
        filters,
        orderBy: options.orderBy || { column: 'created_at', ascending: false },
        limit: options.limit
    });
}

export async function createTraderPayment(paymentData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const profile = await getUserProfile(user.id);

    const payment = {
        ...paymentData,
        user_id: profile.id,
        status: 'pending',
        created_at: new Date().toISOString()
    };

    return createPayment(payment);
}

export async function processTraderPayment(paymentId, paymentMethod, transactionDetails = {}) {
    return processPayment(paymentId, paymentMethod, transactionDetails);
}

// ================================================================
// NOTIFICATION OPERATIONS
// ================================================================

export async function fetchTraderNotifications(options = {}) {
    return fetchNotifications(options);
}

export async function fetchTraderUnreadNotifications() {
    return fetchUnreadNotifications();
}

export async function markTraderNotificationAsRead(notificationId) {
    return markNotificationAsRead(notificationId);
}

export async function markAllTraderNotificationsAsRead() {
    return markAllNotificationsAsRead();
}

export async function getTraderUnreadCount() {
    return getUnreadCount();
}

// ================================================================
// DOCUMENT OPERATIONS
// ================================================================

export async function uploadDocument(file, applicationId, documentType) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Not authenticated' };

        const profile = await getUserProfile(user.id);
        const fileExt = file.name.split('.').pop();
        const fileName = `${applicationId}-${documentType}-${Date.now()}.${fileExt}`;
        const filePath = `${profile.id}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('documents')
            .getPublicUrl(filePath);

        // Save document record
        const documentRecord = {
            application_id: applicationId,
            user_id: profile.id,
            document_type: documentType,
            document_name: file.name,
            file_path: filePath,
            file_url: publicUrl,
            file_size: file.size,
            mime_type: file.type,
            uploaded_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('documents')
            .insert(documentRecord)
            .select()
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Upload document error:', error);
        return { success: false, error: error.message };
    }
}

export async function fetchApplicationDocuments(applicationId) {
    try {
        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('application_id', applicationId)
            .order('uploaded_at', { ascending: false });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Fetch documents error:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteDocument(documentId) {
    try {
        // Get document info
        const { data: document, error: fetchError } = await supabase
            .from('documents')
            .select('*')
            .eq('id', documentId)
            .single();

        if (fetchError) throw fetchError;

        // Delete from storage
        const { error: storageError } = await supabase.storage
            .from('documents')
            .remove([document.file_path]);

        if (storageError) console.warn('Storage deletion failed:', storageError);

        // Delete record
        const { error: deleteError } = await supabase
            .from('documents')
            .delete()
            .eq('id', documentId);

        if (deleteError) throw deleteError;

        return { success: true };
    } catch (error) {
        console.error('Delete document error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// TRACKING
// ================================================================

export async function trackApplication(applicationNumber) {
    try {
        const { data, error } = await supabase
            .from('applications')
            .select(`
                *,
                payments (*),
                documents (*)
            `)
            .eq('application_number', applicationNumber)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return { success: false, error: 'Application not found' };
            }
            throw error;
        }

        return { success: true, data };
    } catch (error) {
        console.error('Track application error:', error);
        return { success: false, error: error.message };
    }
}

export async function getApplicationTimeline(applicationId) {
    try {
        const { data: application, error: appError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (appError) throw appError;

        // Build timeline from application status changes
        const timeline = [
            {
                status: 'Draft',
                date: application.created_at,
                description: 'Application created as draft'
            }
        ];

        if (application.submitted_at) {
            timeline.push({
                status: 'Submitted',
                date: application.submitted_at,
                description: 'Application submitted for review'
            });
        }

        if (application.approved_at) {
            timeline.push({
                status: 'Approved',
                date: application.approved_at,
                description: 'Application approved'
            });
        }

        if (application.rejected_at) {
            timeline.push({
                status: 'Rejected',
                date: application.rejected_at,
                description: application.rejection_reason || 'Application rejected'
            });
        }

        if (application.completed_at) {
            timeline.push({
                status: 'Completed',
                date: application.completed_at,
                description: 'Application completed'
            });
        }

        return { success: true, data: timeline };
    } catch (error) {
        console.error('Get timeline error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// STATISTICS
// ================================================================

export async function fetchTraderStatistics() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const profile = await getUserProfile(user.id);
    const filters = { user_id: profile.id };

    const [
        totalResult,
        draftResult,
        submittedResult,
        underReviewResult,
        approvedResult,
        rejectedResult,
        completedResult
    ] = await Promise.all([
        countRecords('applications', filters),
        countRecords('applications', { ...filters, status: 'draft' }),
        countRecords('applications', { ...filters, status: 'submitted' }),
        countRecords('applications', { ...filters, status: 'under_review' }),
        countRecords('applications', { ...filters, status: 'approved' }),
        countRecords('applications', { ...filters, status: 'rejected' }),
        countRecords('applications', { ...filters, status: 'completed' })
    ]);

    // Get monthly data for charts
    const { data: monthlyData } = await supabase
        .from('applications')
        .select('created_at')
        .eq('user_id', profile.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const monthlyStats = {};
    monthlyData?.forEach(app => {
        const month = new Date(app.created_at).toLocaleString('default', { month: 'short' });
        monthlyStats[month] = (monthlyStats[month] || 0) + 1;
    });

    return {
        success: true,
        data: {
            total: totalResult.success ? totalResult.count : 0,
            draft: draftResult.success ? draftResult.count : 0,
            submitted: submittedResult.success ? submittedResult.count : 0,
            underReview: underReviewResult.success ? underReviewResult.count : 0,
            approved: approvedResult.success ? approvedResult.count : 0,
            rejected: rejectedResult.success ? rejectedResult.count : 0,
            completed: completedResult.success ? completedResult.count : 0,
            monthlyData: monthlyStats
        }
    };
}

// ================================================================
// REALTIME SUBSCRIPTIONS
// ================================================================

export function subscribeToTraderDashboard(callbacks, pageKey = 'trader-dashboard') {
    const userId = localStorage.getItem('userIdentifier') || localStorage.getItem('userId');

    if (!userId) {
        console.error('Cannot subscribe: No authenticated user');
        return null;
    }

    return realtimeManager.registerPage(pageKey, 'trader', userId, callbacks);
}

export function unsubscribeFromTraderDashboard(pageKey) {
    realtimeManager.unregisterPage(pageKey);
}

// ================================================================
// SEARCH AND FILTER
// ================================================================

export async function searchTraderApplications(searchTerm) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const profile = await getUserProfile(user.id);

    try {
        const { data, error } = await supabase
            .from('applications')
            .select('*')
            .eq('user_id', profile.id)
            .or(`application_number.ilike.%${searchTerm}%,application_type.ilike.%${searchTerm}%,status.ilike.%${searchTerm}%`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Search applications error:', error);
        return { success: false, error: error.message };
    }
}

export async function filterTraderApplications(filters) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const profile = await getUserProfile(user.id);
    const allFilters = { ...filters, user_id: profile.id };

    return fetchApplications({
        filters: allFilters,
        orderBy: { column: 'created_at', ascending: false }
    });
}

// ================================================================
// PAGINATION
// ================================================================

export async function fetchPaginatedApplications(options = {}) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const profile = await getUserProfile(user.id);
    const { page = 1, pageSize = 10, filters = {} } = options;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    try {
        let query = supabase
            .from('applications')
            .select('*', { count: 'exact' })
            .eq('user_id', profile.id);

        Object.keys(filters).forEach(key => {
            if (Array.isArray(filters[key])) {
                query = query.in(key, filters[key]);
            } else {
                query = query.eq(key, filters[key]);
            }
        });

        query = query
            .order('created_at', { ascending: false })
            .range(from, to);

        const { data, error, count } = await query;

        if (error) throw error;

        return {
            success: true,
            data,
            pagination: {
                page,
                pageSize,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / pageSize)
            }
        };
    } catch (error) {
        console.error('Paginated fetch error:', error);
        return { success: false, error: error.message };
    }
}
