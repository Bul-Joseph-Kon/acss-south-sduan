import supabase from './supabase.js';

// ================================================================
// GOODS SERVICE
// ================================================================

/**
 * Fetch all goods items for an application
 */
export async function fetchGoodsByApplication(applicationId) {
    try {
        const { data, error } = await supabase
            .from('application_goods')
            .select('*')
            .eq('application_id', applicationId)
            .order('item_number', { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching goods:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Create a new goods item
 */
export async function createGoodsItem(goodsData) {
    try {
        // Calculate customs value: (quantity * unit_price) + freight + insurance + other_charges
        const customsValue = (goodsData.quantity * goodsData.unit_price) + 
                            (goodsData.freight_cost || 0) + 
                            (goodsData.insurance_cost || 0) + 
                            (goodsData.other_charges || 0);

        const { data, error } = await supabase
            .from('application_goods')
            .insert([{
                ...goodsData,
                customs_value: customsValue
            }])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error creating goods item:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update an existing goods item
 */
export async function updateGoodsItem(goodsId, goodsData) {
    try {
        // Calculate customs value: (quantity * unit_price) + freight + insurance + other_charges
        const customsValue = (goodsData.quantity * goodsData.unit_price) + 
                            (goodsData.freight_cost || 0) + 
                            (goodsData.insurance_cost || 0) + 
                            (goodsData.other_charges || 0);

        const { data, error } = await supabase
            .from('application_goods')
            .update({
                ...goodsData,
                customs_value: customsValue
            })
            .eq('id', goodsId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error updating goods item:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete a goods item
 */
export async function deleteGoodsItem(goodsId) {
    try {
        const { error } = await supabase
            .from('application_goods')
            .delete()
            .eq('id', goodsId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting goods item:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get the next item number for an application
 */
export async function getNextItemNumber(applicationId) {
    try {
        const { data, error } = await supabase
            .from('application_goods')
            .select('item_number')
            .eq('application_id', applicationId)
            .order('item_number', { ascending: false })
            .limit(1);

        if (error) throw error;
        return { success: true, nextItemNumber: data.length > 0 ? data[0].item_number + 1 : 1 };
    } catch (error) {
        console.error('Error getting next item number:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Subscribe to goods changes for an application
 */
export function subscribeToGoods(applicationId, callback) {
    const channel = supabase
        .channel('goods-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'application_goods',
                filter: `application_id=eq.${applicationId}`
            },
            (payload) => {
                console.log('Goods change:', payload);
                callback(payload);
            }
        )
        .subscribe();

    return channel;
}

/**
 * Calculate goods summary for an application
 */
export async function calculateGoodsSummary(applicationId) {
    try {
        const { data, error } = await supabase
            .from('application_goods')
            .select('*')
            .eq('application_id', applicationId);

        if (error) throw error;

        const summary = {
            total_items: data.length,
            total_quantity: data.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0),
            total_gross_weight: data.reduce((sum, item) => sum + (parseFloat(item.gross_weight) || 0), 0),
            total_net_weight: data.reduce((sum, item) => sum + (parseFloat(item.net_weight) || 0), 0),
            total_customs_value: data.reduce((sum, item) => sum + (parseFloat(item.customs_value) || 0), 0)
        };

        return { success: true, summary };
    } catch (error) {
        console.error('Error calculating goods summary:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Search HS codes with auto-suggest
 */
export async function searchHSCodes(query) {
    try {
        if (!query || query.length < 2) {
            return { success: true, data: [] };
        }

        const { data, error } = await supabase
            .from('hs_codes')
            .select('hs_code, description, duty_rate, vat_rate, excise_rate')
            .ilike('description', `%${query}%`)
            .or(`hs_code.ilike.%${query}%`)
            .limit(20);

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error searching HS codes:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get tariff information for an HS code
 */
export async function getTariffInfo(hsCode) {
    try {
        const { data, error } = await supabase
            .from('hs_codes')
            .select('hs_code, description, duty_rate, vat_rate, excise_rate')
            .eq('hs_code', hsCode)
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error getting tariff info:', error);
        return { success: false, error: error.message };
    }
}
