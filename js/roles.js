// ================================================================
// ROLES MODULE
// ================================================================
// Handles all role-related operations
// ================================================================

import supabase from './supabase.js';
import { fetchTable, fetchById, insertRecord, updateRecord, deleteRecord } from './database.js';

// ================================================================
// FETCH ROLES
// ================================================================

export async function fetchRoles(options = {}) {
    return fetchTable('roles', {
        filters: options.filters || {},
        orderBy: options.orderBy || { column: 'name', ascending: true },
        limit: options.limit
    });
}

// ================================================================
// FETCH ROLE BY ID
// ================================================================

export async function fetchRoleById(id) {
    return fetchById('roles', id);
}

// ================================================================
// FETCH ROLE BY NAME
// ================================================================

export async function fetchRoleByName(name) {
    try {
        const { data, error } = await supabase
            .from('roles')
            .select('*')
            .eq('name', name)
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Fetch role by name error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// CREATE ROLE
// ================================================================

export async function createRole(roleData) {
    const newRole = {
        ...roleData,
        status: roleData.status || 'active',
        created_at: new Date().toISOString()
    };

    return insertRecord('roles', newRole);
}

// ================================================================
// UPDATE ROLE
// ================================================================

export async function updateRole(id, updates) {
    return updateRecord('roles', id, updates);
}

// ================================================================
// DELETE ROLE
// ================================================================

export async function deleteRole(id) {
    return deleteRecord('roles', id);
}

// ================================================================
// UPDATE ROLE STATUS
// ================================================================

export async function updateRoleStatus(roleId, status) {
    return updateRole(roleId, { status });
}

// ================================================================
// GET ACTIVE ROLES
// ================================================================

export async function getActiveRoles() {
    return fetchTable('roles', {
        filters: { status: 'active' },
        orderBy: { column: 'name', ascending: true }
    });
}

// ================================================================
// SEARCH ROLES
// ================================================================

export async function searchRoles(searchTerm) {
    try {
        const { data, error } = await supabase
            .from('roles')
            .select('*')
            .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Search roles error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// GET ROLE PERMISSIONS
// ================================================================

export async function getRolePermissions(roleId) {
    try {
        const { data, error } = await supabase
            .from('roles')
            .select('permissions')
            .eq('id', roleId)
            .single();

        if (error) throw error;

        return { success: true, data: data?.permissions || [] };
    } catch (error) {
        console.error('Get role permissions error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// UPDATE ROLE PERMISSIONS
// ================================================================

export async function updateRolePermissions(roleId, permissions) {
    return updateRole(roleId, { permissions });
}

// ================================================================
// GET USERS BY ROLE
// ================================================================

export async function getUsersByRole(roleName) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', roleName)
            .eq('status', 'active');

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Get users by role error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// GET ROLE USER COUNT
// ================================================================

export async function getRoleUserCount(roleName) {
    try {
        const { count, error } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', roleName)
            .eq('status', 'active');

        if (error) throw error;

        return { success: true, count };
    } catch (error) {
        console.error('Get role user count error:', error);
        return { success: false, error: error.message };
    }
}
