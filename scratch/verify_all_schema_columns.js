import { createClient } from '@supabase/supabase-js';

const url = 'https://avpoufxsjiecbsxvngip.supabase.co';
const key = 'sb_publishable_XZ7BUTHNhF1ojqoxlJq7Bg_cqn9o8HE';
const supabase = createClient(url, key);

const columnsToCheck = [
    { table: 'applications', column: 'ai_validation_results' },
    { table: 'applications', column: 'ai_validation_passed' },
    { table: 'applications', column: 'returned_at' },
    { table: 'applications', column: 'validated_at' },
    { table: 'applications', column: 'validation' },
    { table: 'applications', column: 'tax_calculation_verified' },
    { table: 'applications', column: 'tax_calculation_verified_at' },
    { table: 'applications', column: 'total_payable' },
    { table: 'applications', column: 'invoice_id' },
    { table: 'applications', column: 'invoice_number' },
    { table: 'payments', column: 'payment_details' },
    { table: 'payments', column: 'failed_at' },
    { table: 'payments', column: 'failure_reason' },
    { table: 'payments', column: 'refunded_at' },
    { table: 'payments', column: 'refund_reason' },
    { table: 'system_settings', column: 'updated_by' }
];

async function verifyColumns() {
    console.log('=== VERIFYING DATABASE COLUMNS VIA DIRECT SELECT ===');
    const results = [];

    for (const item of columnsToCheck) {
        const { data, error } = await supabase
            .from(item.table)
            .select(item.column)
            .limit(1);
            
        if (error) {
            results.push({
                table: item.table,
                column: item.column,
                exists: false,
                errorMessage: error.message,
                errorCode: error.code
            });
        } else {
            results.push({
                table: item.table,
                column: item.column,
                exists: true,
                errorMessage: null,
                errorCode: null
            });
        }
    }
    
    console.log('\n=== COLUMN VERIFICATION RESULTS ===');
    results.forEach(r => {
        console.log(`[${r.table}.${r.column}] -> ${r.exists ? '✅ EXISTS' : '❌ MISSING (' + r.errorMessage + ')'}`);
    });
}

verifyColumns();
