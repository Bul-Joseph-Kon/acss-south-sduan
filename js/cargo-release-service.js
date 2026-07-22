// ================================================================
// CARGO RELEASE SERVICE
// ================================================================
// Auto-generates all cargo release documents after payment:
//   - CVET Certificate
//   - Cargo Release Order
//   - Clearance Certificate
//   - QR Code
// Updates application status to 'completed'
// ================================================================

import supabase from './supabase.js';
import { getUserProfile } from './auth.js';

// ================================================================
// MAIN: GENERATE ALL CARGO DOCUMENTS
// ================================================================

async function generateCargoDocuments(applicationId, generatedByProfileId) {
    try {
        console.log('=== GENERATING CARGO DOCUMENTS FOR:', applicationId, '===');

        // Fetch application with all related data
        const { data: application, error: appError } = await supabase
            .from('applications')
            .select('*, payments(id, receipt_number, amount, paid_at), invoices(id, invoice_number, total_amount)')
            .eq('id', applicationId)
            .single();

        if (appError) throw appError;
        if (!application) throw new Error('Application not found');

        const releaseDate = new Date().toISOString();
        const releaseNumber = generateReleaseNumber();
        const cvetNumber = generateCVETNumber();
        const clearanceNumber = generateClearanceNumber();

        // 1. Generate CVET Certificate
        const cvetResult = await generateCVETCertificate(application, cvetNumber, generatedByProfileId);

        // 2. Generate Cargo Release Order
        const cargoReleaseResult = await generateCargoReleaseOrder(application, releaseNumber, releaseDate, generatedByProfileId);

        // 3. Generate Clearance Certificate
        const clearanceResult = await generateClearanceCertificate(application, clearanceNumber, generatedByProfileId);

        // 4. Update application with release info and set to completed
        const { error: updateError } = await supabase
            .from('applications')
            .update({
                status: 'completed',
                release_number: releaseNumber,
                release_date: releaseDate,
                cvet_generated_at: releaseDate,
                cargo_release_generated_at: releaseDate,
                clearance_certificate_generated_at: releaseDate,
                completed_at: releaseDate,
                updated_at: releaseDate
            })
            .eq('id', applicationId);

        if (updateError) throw updateError;

        // 5. Create activity log
        await createActivityLog(generatedByProfileId, 'cargo_documents_generated',
            `Cargo release documents generated for ${application.application_number}`,
            {
                application_id: applicationId,
                release_number: releaseNumber,
                cvet_number: cvetNumber,
                clearance_number: clearanceNumber
            });

        // 6. Create audit log
        await createAuditLog(generatedByProfileId, 'UPDATE', 'applications', applicationId,
            { status: 'paid' }, { status: 'completed', release_number: releaseNumber });

        // 7. Notify agent
        await notifyAgent(applicationId, application.agent_id,
            '🎉 Cargo Release Approved',
            `Your cargo has been cleared! Release No: ${releaseNumber}. Download your CVET, Cargo Release Order, and Clearance Certificate from the Completed section.`,
            'success');

        console.log('=== CARGO DOCUMENTS GENERATED SUCCESSFULLY ===', {
            releaseNumber, cvetNumber, clearanceNumber
        });

        return {
            success: true,
            release_number: releaseNumber,
            cvet_number: cvetNumber,
            clearance_number: clearanceNumber,
            cvet: cvetResult,
            cargo_release: cargoReleaseResult,
            clearance: clearanceResult
        };
    } catch (error) {
        console.error('Error generating cargo documents:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// CVET CERTIFICATE GENERATION
// ================================================================

async function generateCVETCertificate(application, cvetNumber, generatedById) {
    try {
        const declarationData = application.declaration_data || {};
        const goodsData = application.goods_data || {};

        const certificateData = {
            certificate_number: cvetNumber,
            application_number: application.application_number,
            importer: declarationData.importer_exporter?.importer_name || 'N/A',
            exporter: declarationData.importer_exporter?.exporter_name || 'N/A',
            goods_description: goodsData.description || 'General Merchandise',
            hs_code: goodsData.hs_code || 'N/A',
            declared_value: application.declared_value || 0,
            port_of_entry: declarationData.customs?.port_of_entry || declarationData.port_of_entry || 'N/A',
            country_of_origin: goodsData.country_of_origin || declarationData.consignment?.country_of_origin || 'N/A',
            country_of_destination: goodsData.country_of_destination || 'South Sudan',
            issued_date: new Date().toISOString(),
            qr_code: generateQRCode(cvetNumber),
            currency: 'SSP'
        };

        // Store in cvet_certificates table
        const { data, error } = await supabase
            .from('cvet_certificates')
            .insert({
                application_id: application.id,
                certificate_number: cvetNumber,
                qr_code: certificateData.qr_code,
                issued_by: generatedById,
                issued_at: new Date().toISOString(),
                valid_from: new Date().toISOString().split('T')[0],
                valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                certificate_data: certificateData,
                status: 'active'
            })
            .select()
            .single();

        if (error && !error.message.includes('duplicate')) throw error;

        // Record in documents_generated
        await supabase.from('documents_generated').insert({
            application_id: application.id,
            document_type: 'cvet',
            document_number: cvetNumber,
            generated_by: generatedById,
            generated_at: new Date().toISOString(),
            metadata: certificateData
        });

        return { success: true, certificate_number: cvetNumber, data: certificateData };
    } catch (error) {
        console.error('Error generating CVET:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// CARGO RELEASE ORDER GENERATION
// ================================================================

async function generateCargoReleaseOrder(application, releaseNumber, releaseDate, generatedById) {
    try {
        const declarationData = application.declaration_data || {};
        const goodsData = application.goods_data || {};

        const releaseData = {
            release_number: releaseNumber,
            application_number: application.application_number,
            port_of_release: declarationData.customs?.port_of_entry || 'N/A',
            cargo_description: goodsData.description || 'General Merchandise',
            quantity: goodsData.quantity || 0,
            unit: goodsData.unit || 'units',
            importer: declarationData.importer_exporter?.importer_name || 'N/A',
            release_conditions: 'Released after full payment of duties and taxes',
            release_date: releaseDate,
            authorized_by: 'SSRA Customs Authority'
        };

        // Store in cargo_release_documents
        const { data, error } = await supabase
            .from('cargo_release_documents')
            .insert({
                application_id: application.id,
                release_number: releaseNumber,
                release_order_number: `CRO-${releaseNumber.split('-')[1]}`,
                port_of_release: releaseData.port_of_release,
                release_date: releaseDate,
                released_by: generatedById,
                cargo_description: releaseData.cargo_description,
                quantity: releaseData.quantity,
                unit: releaseData.unit,
                release_conditions: { notes: releaseData.release_conditions },
                status: 'released'
            })
            .select()
            .single();

        if (error && !error.message.includes('duplicate')) throw error;

        // Record in documents_generated
        await supabase.from('documents_generated').insert({
            application_id: application.id,
            document_type: 'cargo_release',
            document_number: releaseNumber,
            generated_by: generatedById,
            generated_at: releaseDate,
            metadata: releaseData
        });

        return { success: true, release_number: releaseNumber, data: releaseData };
    } catch (error) {
        console.error('Error generating cargo release order:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// CLEARANCE CERTIFICATE GENERATION
// ================================================================

async function generateClearanceCertificate(application, clearanceNumber, generatedById) {
    try {
        const clearanceData = {
            clearance_number: clearanceNumber,
            application_number: application.application_number,
            issued_date: new Date().toISOString(),
            status: 'cleared',
            authority: 'South Sudan Revenue Authority - Customs Division'
        };

        await supabase.from('documents_generated').insert({
            application_id: application.id,
            document_type: 'clearance_certificate',
            document_number: clearanceNumber,
            generated_by: generatedById,
            generated_at: new Date().toISOString(),
            metadata: clearanceData
        });

        return { success: true, clearance_number: clearanceNumber, data: clearanceData };
    } catch (error) {
        console.error('Error generating clearance certificate:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// DOCUMENT RETRIEVAL
// ================================================================

async function getCargoDocuments(applicationId) {
    try {
        const [cvetRes, cargoRes, docsRes] = await Promise.all([
            supabase.from('cvet_certificates').select('*').eq('application_id', applicationId).maybeSingle(),
            supabase.from('cargo_release_documents').select('*').eq('application_id', applicationId).maybeSingle(),
            supabase.from('documents_generated').select('*').eq('application_id', applicationId).order('created_at', { ascending: false })
        ]);

        return {
            success: true,
            cvet: cvetRes.data,
            cargo_release: cargoRes.data,
            all_documents: docsRes.data || []
        };
    } catch (error) {
        console.error('Error fetching cargo documents:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// NUMBER GENERATORS
// ================================================================

function generateReleaseNumber() {
    const ts = Date.now().toString().slice(-8);
    return `CRO-${ts}`;
}

function generateCVETNumber() {
    const ts = Date.now().toString().slice(-8);
    return `CVET-${ts}`;
}

function generateClearanceNumber() {
    const ts = Date.now().toString().slice(-8);
    return `CLR-${ts}`;
}

function generateQRCode(data) {
    // Returns a data URL string that encodes the certificate number
    // In production this would use a QR library; here we store the reference string
    return `QR:${data}:${Date.now()}`;
}

// ================================================================
// UTILITY FUNCTIONS
// ================================================================

async function notifyAgent(applicationId, agentId, title, message, type = 'info') {
    try {
        await supabase.from('notifications').insert({
            user_id: agentId, title, message, type,
            reference_id: applicationId, reference_type: 'application'
        });
    } catch (err) {
        console.error('Error notifying agent:', err);
    }
}

async function createActivityLog(userId, activityType, description, metadata = {}) {
    try {
        await supabase.from('activity_logs').insert({
            user_id: userId, activity_type: activityType, description, metadata
        });
    } catch (error) {
        console.error('Error creating activity log:', error);
    }
}

async function createAuditLog(userId, action, tableName, recordId, oldValues, newValues) {
    try {
        await supabase.from('audit_logs').insert({
            user_id: userId, action, table_name: tableName,
            record_id: recordId, old_values: oldValues, new_values: newValues
        });
    } catch (error) {
        console.error('Error creating audit log:', error);
    }
}

export {
    generateCargoDocuments,
    generateCVETCertificate,
    generateCargoReleaseOrder,
    generateClearanceCertificate,
    getCargoDocuments
};
