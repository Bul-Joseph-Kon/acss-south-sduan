import supabase from './supabase.js';

// ================================================================
// CURRENCY SERVICE
// ================================================================

/**
 * Fetch all currencies from the database
 */
export async function fetchCurrencies() {
    try {
        const { data, error } = await supabase
            .from('currencies')
            .select('*')
            .order('code', { ascending: true });
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching currencies:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Search currencies by code or name
 */
export async function searchCurrencies(query) {
    try {
        const { data, error } = await supabase
            .from('currencies')
            .select('*')
            .or(`code.ilike.%${query}%,name.ilike.%${query}%`)
            .order('code', { ascending: true })
            .limit(10);
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error searching currencies:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Subscribe to currency changes via Realtime
 */
export function subscribeToCurrencies(callback) {
    const channel = supabase
        .channel('currencies-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'currencies'
            },
            (payload) => {
                console.log('Currency change:', payload);
                callback(payload);
            }
        )
        .subscribe();
    
    return channel;
}
