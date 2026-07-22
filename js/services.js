// ================================================================
// SERVICES MODULE
// ================================================================
// Handles service-related operations
// ================================================================

import supabase from './supabase.js';
import { fetchTable, fetchById } from './database.js';

// ================================================================
// FETCH ALL SERVICES
// ================================================================

export async function fetchServices(options = {}) {
    return fetchTable('services', {
        filters: options.filters || { is_active: true },
        orderBy: options.orderBy || { column: 'name', ascending: true },
        limit: options.limit
    });
}

// ================================================================
// FETCH SERVICE BY ID
// ================================================================

export async function fetchServiceById(id) {
    return fetchById('services', id);
}

// ================================================================
// FETCH SERVICE BY CODE
// ================================================================

export async function fetchServiceByCode(code) {
    try {
        const { data, error } = await supabase
            .from('services')
            .select('*')
            .eq('code', code)
            .eq('is_active', true)
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Fetch service by code error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// FETCH SERVICES BY CATEGORY
// ================================================================

export async function fetchServicesByCategory(category) {
    try {
        const { data, error } = await supabase
            .from('services')
            .select('*')
            .eq('category', category)
            .eq('is_active', true)
            .order('name', { ascending: true });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Fetch services by category error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// SEARCH SERVICES
// ================================================================

export async function searchServices(searchTerm) {
    try {
        const { data, error } = await supabase
            .from('services')
            .select('*')
            .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
            .eq('is_active', true);

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Search services error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// UPDATE SERVICE
// ================================================================

export async function updateService(id, updates) {
    try {
        const { data, error } = await supabase
            .from('services')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Update service error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// TOGGLE SERVICE STATUS
// ================================================================

export async function toggleServiceStatus(id) {
    try {
        // First fetch current service
        const { data: service, error: fetchError } = await supabase
            .from('services')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) {
            console.error('Fetch error:', fetchError);
            throw fetchError;
        }

        if (!service) {
            throw new Error('Service not found');
        }

        // Toggle is_active status only (status column doesn't exist in schema)
        const { data, error } = await supabase
            .from('services')
            .update({
                is_active: !service.is_active,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Update error:', error);
            throw error;
        }

        return { success: true, data };
    } catch (error) {
        console.error('Toggle service status error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// CREATE SERVICE
// ================================================================

export async function createService(serviceData) {
    try {
        const { data, error } = await supabase
            .from('services')
            .insert({
                ...serviceData,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Create service error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// DELETE SERVICE
// ================================================================

export async function deleteService(id) {
    try {
        const { error } = await supabase
            .from('services')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error('Delete service error:', error);
        return { success: false, error: error.message };
    }
}
