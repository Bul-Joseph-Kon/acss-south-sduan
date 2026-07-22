import supabase from './supabase.js';

// ================================================================
// HS CODE SERVICE
// ================================================================

/**
 * Fetch all HS codes from the database
 */
export async function fetchHSCodes() {
    try {
        const { data, error } = await supabase
            .from('hs_codes')
            .select('*')
            .order('code', { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching HS codes:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Search HS codes by code or description
 */
export async function searchHSCodes(query) {
    try {
        const { data, error } = await supabase
            .from('hs_codes')
            .select('*')
            .or(`code.ilike.%${query}%,description.ilike.%${query}%`)
            .order('code', { ascending: true })
            .limit(10);

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error searching HS codes:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get HS code by code
 */
export async function getHSCodeByCode(code) {
    try {
        const { data, error } = await supabase
            .from('hs_codes')
            .select('*')
            .eq('code', code)
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching HS code:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Subscribe to HS code changes via Realtime
 */
export function subscribeToHSCodes(callback) {
    const channel = supabase
        .channel('hs-codes-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'hs_codes'
            },
            (payload) => {
                console.log('HS code change:', payload);
                callback(payload);
            }
        )
        .subscribe();

    return channel;
}
