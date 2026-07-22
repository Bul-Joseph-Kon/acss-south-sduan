import supabase from './supabase.js';

// ================================================================
// UNIT SERVICE
// ================================================================

/**
 * Fetch all units from the database
 */
export async function fetchUnits() {
    try {
        const { data, error } = await supabase
            .from('units')
            .select('*')
            .order('code', { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching units:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Search units by code or description
 */
export async function searchUnits(query) {
    try {
        const { data, error } = await supabase
            .from('units')
            .select('*')
            .or(`code.ilike.%${query}%,description.ilike.%${query}%`)
            .order('code', { ascending: true })
            .limit(10);

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error searching units:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get unit by code
 */
export async function getUnitByCode(code) {
    try {
        const { data, error } = await supabase
            .from('units')
            .select('*')
            .eq('code', code)
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching unit:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Subscribe to unit changes via Realtime
 */
export function subscribeToUnits(callback) {
    const channel = supabase
        .channel('units-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'units'
            },
            (payload) => {
                console.log('Unit change:', payload);
                callback(payload);
            }
        )
        .subscribe();

    return channel;
}
