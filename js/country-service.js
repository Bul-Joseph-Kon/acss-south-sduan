import supabase from './supabase.js';

// ================================================================
// COUNTRY SERVICE
// ================================================================

/**
 * Fetch all countries from the database
 */
export async function fetchCountries() {
    try {
        const { data, error } = await supabase
            .from('countries')
            .select('*')
            .order('name', { ascending: true });
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching countries:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Search countries by code or name
 */
export async function searchCountries(query) {
    try {
        const { data, error } = await supabase
            .from('countries')
            .select('*')
            .or(`code.ilike.%${query}%,name.ilike.%${query}%`)
            .order('name', { ascending: true })
            .limit(10);
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error searching countries:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Subscribe to country changes via Realtime
 */
export function subscribeToCountries(callback) {
    const channel = supabase
        .channel('countries-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'countries'
            },
            (payload) => {
                console.log('Country change:', payload);
                callback(payload);
            }
        )
        .subscribe();
    
    return channel;
}
