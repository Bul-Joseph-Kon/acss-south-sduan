import fs from 'fs';

const url = 'https://avpoufxsjiecbsxvngip.supabase.co';
const key = 'sb_publishable_XZ7BUTHNhF1ojqoxlJq7Bg_cqn9o8HE';

async function run() {
    console.log('=== Fetching OpenAPI Spec from Supabase (with authorization headers) ===');
    try {
        const response = await fetch(`${url}/rest/v1/`, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Accept': 'application/openapi+json' // Or 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} (${response.statusText})`);
        }
        const data = await response.json();
        
        console.log('OpenAPI Spec fetched successfully.');
        fs.writeFileSync('scratch/openapi_spec.json', JSON.stringify(data, null, 2), 'utf8');
        console.log('Spec written to scratch/openapi_spec.json');
        
        // Let's print all definition keys (tables)
        const tables = Object.keys(data.definitions || {});
        console.log('Tables defined in OpenAPI spec:', tables);
        
        // Let's check columns for 'applications'
        if (data.definitions && data.definitions.applications) {
            console.log('\n=== Columns in "applications" Table ===');
            console.log(Object.keys(data.definitions.applications.properties));
        }
        
        // Let's check columns for 'payments'
        if (data.definitions && data.definitions.payments) {
            console.log('\n=== Columns in "payments" Table ===');
            console.log(Object.keys(data.definitions.payments.properties));
        }
        
        // Let's check columns for 'system_settings'
        if (data.definitions && data.definitions.system_settings) {
            console.log('\n=== Columns in "system_settings" Table ===');
            console.log(Object.keys(data.definitions.system_settings.properties));
        }
        
        // Let's check columns for 'tax_calculations'
        if (data.definitions && data.definitions.tax_calculations) {
            console.log('\n=== Columns in "tax_calculations" Table ===');
            console.log(Object.keys(data.definitions.tax_calculations.properties));
        }
    } catch (e) {
        console.error('Error fetching spec:', e.message);
    }
}

run();
