import fs from 'fs';
import path from 'path';

// Define the schema as understood from schema.sql and migrations
const schema = {
    profiles: [
        'id', 'user_id', 'full_name', 'email', 'phone', 'nationality', 
        'applicant_type', 'organization', 'company', 'avatar', 'role', 
        'status', 'created_at', 'updated_at', 'employee_id', 'department', 'customs_office'
    ],
    roles: [
        'id', 'name', 'description', 'permissions', 'created_at', 'updated_at'
    ],
    applications: [
        'id', 'application_number', 'user_id', 'agent_id', 'officer_id', 
        'inspector_id', 'supervisor_id', 'application_type', 'service_type', 
        'status', 'declaration_data', 'goods_data', 'vehicle_data', 
        'inspection_report', 'inspection_completed_at', 'declared_value', 
        'inspection_type', 'submitted_at', 'reviewed_at', 'inspected_at', 
        'approved_at', 'completed_at', 'notes', 'rejection_reason', 
        'return_reason', 'created_at', 'updated_at', 'risk_level', 'rejected_at'
        // ai_validation_results is missing!
    ],
    application_items: [
        'id', 'application_id', 'item_number', 'description', 'hs_code', 
        'quantity', 'unit', 'unit_price', 'total_value', 'weight', 
        'origin_country', 'tariff_rate', 'duty_amount', 'tax_amount', 
        'total_duty', 'created_at', 'updated_at'
    ],
    documents: [
        'id', 'application_id', 'user_id', 'document_name', 'document_type', 
        'file_path', 'file_size', 'mime_type', 'storage_bucket', 
        'storage_path', 'uploaded_at', 'verified', 'verified_at', 'verified_by'
    ],
    notifications: [
        'id', 'user_id', 'title', 'message', 'type', 'link', 
        'reference_id', 'reference_type', 'read', 'read_at', 'created_at'
    ],
    payments: [
        'id', 'application_id', 'user_id', 'payment_number', 'amount', 
        'currency', 'status', 'payment_method', 'transaction_id', 
        'receipt_number', 'paid_at', 'created_at', 'updated_at'
    ],
    audit_logs: [
        'id', 'user_id', 'action', 'table_name', 'record_id', 'old_values', 
        'new_values', 'ip_address', 'user_agent', 'status', 'error_message', 'created_at'
    ],
    activity_logs: [
        'id', 'user_id', 'activity_type', 'description', 'metadata', 'ip_address', 'created_at'
    ],
    ai_audit_logs: [
        'id', 'user_id', 'action_type', 'application_id', 'details', 'timestamp'
    ],
    system_settings: [
        'id', 'key', 'value', 'description', 'category', 'created_at', 'updated_at'
    ],
    services: [
        'id', 'name', 'code', 'description', 'category', 'fee_amount', 
        'fee_currency', 'processing_days', 'required_documents', 'form_schema', 
        'is_active', 'created_at', 'updated_at'
    ],
    departments: [
        'id', 'name', 'code', 'description', 'head_id', 'created_at', 'updated_at'
    ],
    offices: [
        'id', 'department_id', 'name', 'code', 'location', 'address', 
        'phone', 'email', 'operating_hours', 'is_active', 'created_at', 'updated_at'
    ],
    countries: [
        'id', 'name', 'code', 'iso3', 'is_active', 'created_at'
    ],
    ports: [
        'id', 'name', 'code', 'country_id', 'port_type', 'location', 'is_active', 'created_at'
    ],
    tariff_codes: [
        'id', 'hs_code', 'description', 'duty_rate', 'tax_rate', 
        'category', 'chapter', 'effective_from', 'effective_to', 'is_active', 'created_at', 'updated_at'
    ],
    currencies: [
        'id', 'code', 'name', 'symbol', 'exchange_rate', 'base_currency', 'is_active', 'created_at', 'updated_at'
    ],
    escalated_cases: [
        'id', 'application_id', 'trader_id', 'assigned_officer_id', 'reason', 
        'priority', 'status', 'resolution', 'resolved_at', 'resolved_by', 'notes', 'created_at', 'updated_at'
    ],
    compliance_reviews: [
        'id', 'application_id', 'reviewer_id', 'review_type', 'status', 
        'findings', 'risk_assessment', 'compliance_score', 'notes', 'completed_at', 'created_at', 'updated_at'
    ]
};

const queryMismatches = [];

// Helper to scan JS files for queries
function scanJsFiles(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            scanJsFiles(fullPath);
        } else if (file.endsWith('.js')) {
            checkQueriesInFile(fullPath);
        }
    });
}

function checkQueriesInFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
    
    // Pattern 1: .from('table_name')
    const fromMatches = content.matchAll(/\.from\(['"](\w+)['"]\)/g);
    for (const match of fromMatches) {
        const tableName = match[1];
        if (!schema[tableName]) {
            queryMismatches.push({
                file: relPath,
                line: getLineNumber(content, match.index),
                type: 'missing_table',
                details: `Table "${tableName}" is queried but not defined in the system schema.`
            });
        }
    }

    // Pattern 2: select('col1, col2, ...') or update({ col1: val }) or insert({ col1: val })
    // Let's search for .insert({ ... }) or .update({ ... })
    const writeMatches = content.matchAll(/\.(?:insert|update)\(\s*\{([\s\S]*?)\}\s*\)/g);
    for (const match of writeMatches) {
        const keysText = match[1];
        const tableNameMatch = content.substring(0, match.index).match(/\.from\(['"](\w+)['"]\)/);
        if (tableNameMatch) {
            const tableName = tableNameMatch[1];
            if (schema[tableName]) {
                const keys = keysText.matchAll(/(\w+)\s*:/g);
                for (const keyMatch of keys) {
                    const colName = keyMatch[1];
                    // Skip if it is a js local syntax like 'role' check inside object
                    if (!schema[tableName].includes(colName)) {
                        queryMismatches.push({
                            file: relPath,
                            line: getLineNumber(content, match.index),
                            type: 'missing_column_write',
                            details: `Column "${colName}" is written to table "${tableName}" but does not exist in schema.`
                        });
                    }
                }
            }
        }
    }
}

function getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
}

console.log('Scanning shared JS modules for database mismatches...');
scanJsFiles('js');
console.log(`Scan completed. Found ${queryMismatches.length} query mismatches.`);

console.log('\n=== Query Mismatches Found ===');
queryMismatches.forEach(m => {
    console.log(`[${m.file}:${m.line}] [${m.type}]: ${m.details}`);
});

fs.writeFileSync('scratch/query_mismatches.json', JSON.stringify(queryMismatches, null, 2), 'utf8');
