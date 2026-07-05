// ================================================================
// DEPARTMENTS MODULE
// ================================================================
// Handles all department-related operations
// ================================================================

import supabase from './supabase.js';
import { fetchTable, fetchById, insertRecord, updateRecord, deleteRecord } from './database.js';

// ================================================================
// FETCH DEPARTMENTS
// ================================================================

export async function fetchDepartments(options = {}) {
    return fetchTable('departments', {
        filters: options.filters || {},
        orderBy: options.orderBy || { column: 'name', ascending: true },
        limit: options.limit
    });
}

// ================================================================
// FETCH DEPARTMENT BY ID
// ================================================================

export async function fetchDepartmentById(id) {
    return fetchById('departments', id);
}

// ================================================================
// CREATE DEPARTMENT
// ================================================================

export async function createDepartment(departmentData) {
    const newDepartment = {
        ...departmentData,
        status: departmentData.status || 'active',
        created_at: new Date().toISOString()
    };

    return insertRecord('departments', newDepartment);
}

// ================================================================
// UPDATE DEPARTMENT
// ================================================================

export async function updateDepartment(id, updates) {
    return updateRecord('departments', id, updates);
}

// ================================================================
// DELETE DEPARTMENT
// ================================================================

export async function deleteDepartment(id) {
    return deleteRecord('departments', id);
}

// ================================================================
// UPDATE DEPARTMENT STATUS
// ================================================================

export async function updateDepartmentStatus(departmentId, status) {
    return updateDepartment(departmentId, { status });
}

// ================================================================
// GET ACTIVE DEPARTMENTS
// ================================================================

export async function getActiveDepartments() {
    return fetchTable('departments', {
        filters: { status: 'active' },
        orderBy: { column: 'name', ascending: true }
    });
}

// ================================================================
// SEARCH DEPARTMENTS
// ================================================================

export async function searchDepartments(searchTerm) {
    try {
        const { data, error } = await supabase
            .from('departments')
            .select('*')
            .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Search departments error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// GET DEPARTMENT STAFF COUNT
// ================================================================

export async function getDepartmentStaffCount(departmentId) {
    try {
        const { count, error } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('department', departmentId)
            .eq('status', 'active');

        if (error) throw error;

        return { success: true, count };
    } catch (error) {
        console.error('Get department staff count error:', error);
        return { success: false, error: error.message };
    }
}
