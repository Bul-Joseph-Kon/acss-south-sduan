// ================================================================
// APPLICATIONS MODULE
// ================================================================
// Handles all application-related operations
// ================================================================

import supabase from './supabase.js';
import { fetchTable, fetchById, insertRecord, updateRecord, deleteRecord, countRecords } from './database.js';
import { getUserProfile } from './auth.js';

// ================================================================
// FETCH APPLICATIONS
// ================================================================

export async function fetchApplications(options = {}) {
    const { data: { user } } = await supabase.auth.getUser();
    const profile = user ? await getUserProfile(user.id) : null;
    
    const filters = options.filters || {};
    if (profile && !options.includeAll) {
        filters.user_id = profile.id;
    }

    return fetchTable('applications', {
        filters,
        orderBy: options.orderBy || { column: 'created_at', ascending: false },
        limit: options.limit
    });
}

// ================================================================
// FETCH APPLICATION BY ID
// ================================================================

export async function fetchApplicationById(id) {
    return fetchById('applications', id);
}

// ================================================================
// FETCH APPLICATION BY NUMBER
// ================================================================

export async function fetchApplicationByNumber(applicationNumber) {
    try {
        const { data, error } = await supabase
            .from('applications')
            .select('*')
            .eq('application_number', applicationNumber)
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Fetch application by number error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// CREATE APPLICATION
// ================================================================

export async function createApplication(applicationData) {
    const { data: { user } } = await supabase.auth.getUser();
    const profile = user ? await getUserProfile(user.id) : null;
    
    const newApplication = {
        ...applicationData,
        user_id: profile?.id,
        status: 'draft'
    };

    return insertRecord('applications', newApplication);
}

// ================================================================
// UPDATE APPLICATION
// ================================================================

export async function updateApplication(id, updates) {
    return updateRecord('applications', id, updates);
}

// ================================================================
// SUBMIT APPLICATION
// ================================================================

export async function submitApplication(id) {
    return updateApplication(id, {
        status: 'submitted',
        submitted_at: new Date().toISOString()
    });
}

// ================================================================
// DELETE APPLICATION
// ================================================================

export async function deleteApplication(id) {
    return deleteRecord('applications', id);
}

// ================================================================
// FETCH APPLICATION ITEMS
// ================================================================

export async function fetchApplicationItems(applicationId) {
    try {
        const { data, error } = await supabase
            .from('application_items')
            .select('*')
            .eq('application_id', applicationId)
            .order('item_number', { ascending: true });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Fetch application items error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// ADD APPLICATION ITEM
// ================================================================

export async function addApplicationItem(applicationId, itemData) {
    try {
        const { data, error } = await supabase
            .from('application_items')
            .insert({
                application_id: applicationId,
                ...itemData
            })
            .select()
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Add application item error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// UPDATE APPLICATION ITEM
// ================================================================

export async function updateApplicationItem(id, updates) {
    return updateRecord('application_items', id, updates);
}

// ================================================================
// DELETE APPLICATION ITEM
// ================================================================

export async function deleteApplicationItem(id) {
    return deleteRecord('application_items', id);
}

// ================================================================
// FETCH APPLICATION STATISTICS
// ================================================================

export async function fetchApplicationStatistics() {
    const { data: { user } } = await supabase.auth.getUser();
    const profile = user ? await getUserProfile(user.id) : null;
    
    const filters = profile ? { user_id: profile.id } : {};

    const [totalResult, pendingResult, approvedResult, rejectedResult] = await Promise.all([
        countRecords('applications', filters),
        countRecords('applications', { ...filters, status: 'pending_review' }),
        countRecords('applications', { ...filters, status: 'approved' }),
        countRecords('applications', { ...filters, status: 'rejected' })
    ]);

    return {
        total: totalResult.success ? totalResult.count : 0,
        pending: pendingResult.success ? pendingResult.count : 0,
        approved: approvedResult.success ? approvedResult.count : 0,
        rejected: rejectedResult.success ? rejectedResult.count : 0
    };
}

// ================================================================
// SEARCH APPLICATIONS
// ================================================================

export async function searchApplications(searchTerm) {
    try {
        const { data, error } = await supabase
            .from('applications')
            .select('*')
            .or(`application_number.ilike.%${searchTerm}%,application_type.ilike.%${searchTerm}%`);

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Search applications error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// FETCH APPLICATIONS BY STATUS
// ================================================================

export async function fetchApplicationsByStatus(status, options = {}) {
    return fetchTable('applications', {
        filters: { status },
        orderBy: options.orderBy || { column: 'created_at', ascending: false },
        limit: options.limit
    });
}

// ================================================================
// ASSIGN OFFICER TO APPLICATION
// ================================================================

export async function assignOfficer(applicationId, officerId) {
    return updateApplication(applicationId, {
        officer_id: officerId,
        status: 'pending_review'
    });
}

// ================================================================
// ASSIGN INSPECTOR TO APPLICATION
// ================================================================

export async function assignInspector(applicationId, inspectorId) {
    return updateApplication(applicationId, {
        inspector_id: inspectorId,
        status: 'under_inspection'
    });
}

// ================================================================
// UPDATE APPLICATION STATUS
// ================================================================

export async function updateApplicationStatus(applicationId, status, reason = null) {
    const updates = { status };
    
    if (status === 'approved') {
        updates.approved_at = new Date().toISOString();
    } else if (status === 'rejected') {
        updates.rejection_reason = reason;
    } else if (status === 'returned') {
        updates.return_reason = reason;
    }

    return updateApplication(applicationId, updates);
}
