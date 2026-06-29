// ================================================================
// SERVICES MODULE
// ================================================================
// Handles service-related operations
// ================================================================

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
