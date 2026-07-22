import supabase from './supabase.js';

/**
 * Fetch all importers and exporters from the database
 */
export async function fetchImportersExporters() {
    try {
        const { data, error } = await supabase
            .from('importers_exporters')
            .select('*')
            .eq('status', 'active')
            .order('name', { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching importers/exporters:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetch importers only
 */
export async function fetchImporters() {
    try {
        const { data, error } = await supabase
            .from('importers_exporters')
            .select('*')
            .or('type.eq.importer,type.eq.both')
            .eq('status', 'active')
            .order('name', { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching importers:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetch exporters only
 */
export async function fetchExporters() {
    try {
        const { data, error } = await supabase
            .from('importers_exporters')
            .select('*')
            .or('type.eq.exporter,type.eq.both')
            .eq('status', 'active')
            .order('name', { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching exporters:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get importer/exporter by ID
 */
export async function getImporterExporterById(id) {
    try {
        const { data, error } = await supabase
            .from('importers_exporters')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching importer/exporter:', error);
        return { success: false, error: error.message };
    }
}
