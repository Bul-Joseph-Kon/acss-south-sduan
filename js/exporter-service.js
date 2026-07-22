import supabase from './supabase.js';

/**
 * Fetch all exporters from the database
 */
export async function fetchExporters() {
    try {
        const { data, error } = await supabase
            .from('exporters')
            .select('*')
            .order('exporter_name', { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching exporters:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Search exporters by name or company
 */
export async function searchExporters(query) {
    try {
        const { data, error } = await supabase
            .from('exporters')
            .select('*')
            .or(`exporter_name.ilike.%${query}%,company.ilike.%${query}%`)
            .order('exporter_name', { ascending: true })
            .limit(50);

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error searching exporters:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get exporter by ID
 */
export async function getExporterById(id) {
    try {
        const { data, error } = await supabase
            .from('exporters')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching exporter:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Create a new exporter
 */
export async function createExporter(exporterData) {
    try {
        const { data, error } = await supabase
            .from('exporters')
            .insert({
                exporter_name: exporterData.exporter_name,
                company: exporterData.company || null,
                country: exporterData.country,
                address: exporterData.address || null,
                phone: exporterData.phone || null,
                email: exporterData.email || null
            })
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error creating exporter:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update an existing exporter
 */
export async function updateExporter(id, exporterData) {
    try {
        const { data, error } = await supabase
            .from('exporters')
            .update({
                exporter_name: exporterData.exporter_name,
                company: exporterData.company || null,
                country: exporterData.country,
                address: exporterData.address || null,
                phone: exporterData.phone || null,
                email: exporterData.email || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error updating exporter:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Subscribe to exporters table changes (Realtime)
 */
export function subscribeToExporters(callback) {
    const channel = supabase
        .channel('exporters-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'exporters'
            },
            (payload) => {
                callback(payload);
            }
        )
        .subscribe();

    return channel;
}
