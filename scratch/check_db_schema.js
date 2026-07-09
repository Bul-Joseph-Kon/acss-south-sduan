import { createClient } from '@supabase/supabase-js';

const url = 'https://avpoufxsjiecbsxvngip.supabase.co';
const key = 'sb_publishable_XZ7BUTHNhF1ojqoxlJq7Bg_cqn9o8HE';
const supabase = createClient(url, key);

async function run() {
    console.log('=== Dumping Remote Column Names ===');
    const tables = [
        'applications', 
        'payments', 
        'system_settings', 
        'tax_calculations', 
        'invoices', 
        'vehicles', 
        'vehicle_verifications'
    ];
    
    for (const table of tables) {
        // We select the first row to inspect columns
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1);
            
        if (error) {
            console.log(`Table "${table}" error:`, error.message);
        } else if (data && data.length > 0) {
            console.log(`Table "${table}" columns:`, Object.keys(data[0]));
        } else {
            // If table has no rows, we can't inspect via select * limit 1.
            // Let's try inserting a dummy row with rollback? No, we can't rollback easily in REST API.
            // But wait, the supabase JS client might return empty array but how can we get columns?
            // We can query postgrest OpenAPI or do a fetch from the swagger spec:
            // `${url}/rest/v1/?apikey=${key}`
            console.log(`Table "${table}" is empty, cannot inspect columns via select`);
        }
    }
}

run();
