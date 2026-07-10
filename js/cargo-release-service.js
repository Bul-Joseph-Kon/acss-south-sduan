// ================================================================
// CARGO RELEASE SERVICE
// ================================================================
// Handles cargo release document generation and CVET generation
// ================================================================

import supabase from './supabase.js';
import { getUserProfile } from './auth.js';
import { createActivityLog, createAuditLog, createNotification } from './logging-service.js';

// ================================================================
// CARGO RELEASE OPERATIONS
// ================================================================

/**
 * Generate cargo release document for a paid application
 */
export async function generateCargoReleaseDocument(applicationId) {
    try {
        const profile = await getUserProfile();
        if (!profile) {
            return { success: false, error: 'User profile not found' };
        }

        // Get application details
        const { data: application, error: fetchError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (fetchError) throw fetchError;
        if (!application) throw new Error('Application not found');

        if (application.status !== 'paid') {
            return { success: false, error: 'Application must be paid before generating cargo release' };
        }

        // Generate release number
        const releaseNumber = `CR-${Date.now().toString().slice(-8)}`;
        
        // Generate QR code (simplified - in production use a QR code library)
        const qrCode = `QR-${application.application_number}-${Date.now()}`;

        // Create cargo release document record
        const cargoReleaseData = {
            release_number: releaseNumber,
            qr_code: qrCode,
            release_date: new Date().toISOString(),
            application_number: application.application_number,
            trader_name: application.trader_name,
            agent_id: application.agent_id,
            goods_description: application.goods_data?.goods_description || 'N/A',
            declared_value: application.goods_data?.declared_value || 0,
            port_of_entry: application.declaration_data?.port_of_entry || 'N/A',
            vessel_name: application.goods_data?.vessel_name || 'N/A',
            status: 'released'
        };

        // Store cargo release data in application
        const { error: updateError } = await supabase
            .from('applications')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                inspection_report: {
                    ...application.inspection_report,
                    cargo_release: cargoReleaseData
                }
            })
            .eq('id', applicationId);

        if (updateError) throw updateError;

        // Log the cargo release
        await createActivityLog({
            user_id: profile.id,
            action: 'generate_cargo_release',
            entity_type: 'application',
            entity_id: applicationId,
            details: { release_number: releaseNumber, qr_code: qrCode }
        });

        await createAuditLog({
            user_id: profile.id,
            action: 'generate_cargo_release',
            entity_type: 'application',
            entity_id: applicationId,
            old_values: { status: 'paid' },
            new_values: { status: 'completed' },
            reason: 'Payment confirmed, cargo released'
        });

        // Notify the agent
        await createNotification({
            user_id: application.agent_id || application.user_id,
            type: 'cargo_released',
            title: 'Cargo Release Document Generated',
            message: `Cargo release document has been generated for application ${application.application_number}. Release Number: ${releaseNumber}`,
            entity_type: 'application',
            entity_id: applicationId,
            action_url: `/pages/agent/application-details.html?id=${applicationId}`,
            priority: 'high'
        });

        return { 
            success: true, 
            message: 'Cargo release document generated successfully',
            data: cargoReleaseData 
        };
    } catch (error) {
        console.error('Error generating cargo release document:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Generate CVET document
 */
export async function generateCVET(applicationId) {
    try {
        const profile = await getUserProfile();
        if (!profile) {
            return { success: false, error: 'User profile not found' };
        }

        // Get application details
        const { data: application, error: fetchError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (fetchError) throw fetchError;
        if (!application) throw new Error('Application not found');

        if (application.status !== 'completed' && application.status !== 'paid') {
            return { success: false, error: 'Application must be paid or completed to generate CVET' };
        }

        // CVET data structure
        const cvetData = {
            cvet_number: application.application_number,
            issue_date: new Date().toISOString(),
            expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days validity
            declarant: application.trader_name,
            agent_id: application.agent_id,
            declaration_type: application.declaration_data?.declaration_type,
            customs_office: application.declaration_data?.customs_office,
            goods: application.goods_data,
            transport: application.vehicle_data,
            total_value: application.goods_data?.declared_value || 0,
            status: 'valid'
        };

        // Store CVET data in application
        const { error: updateError } = await supabase
            .from('applications')
            .update({
                inspection_report: {
                    ...application.inspection_report,
                    cvet: cvetData
                }
            })
            .eq('id', applicationId);

        if (updateError) throw updateError;

        // Log CVET generation
        await createActivityLog({
            user_id: profile.id,
            action: 'generate_cvet',
            entity_type: 'application',
            entity_id: applicationId,
            details: { cvet_number: cvetData.cvet_number }
        });

        return { 
            success: true, 
            message: 'CVET generated successfully',
            data: cvetData 
        };
    } catch (error) {
        console.error('Error generating CVET:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Download cargo release document (returns data for download)
 */
export async function downloadCargoReleaseDocument(applicationId) {
    try {
        const { data: application, error } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (error) throw error;
        if (!application) throw new Error('Application not found');

        const cargoRelease = application.inspection_report?.cargo_release;
        if (!cargoRelease) {
            return { success: false, error: 'Cargo release document not found' };
        }

        return { 
            success: true, 
            data: cargoRelease 
        };
    } catch (error) {
        console.error('Error downloading cargo release document:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Download CVET document (returns data for download)
 */
export async function downloadCVET(applicationId) {
    try {
        const { data: application, error } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (error) throw error;
        if (!application) throw new Error('Application not found');

        const cvet = application.inspection_report?.cvet;
        if (!cvet) {
            // Generate CVET if not exists
            const result = await generateCVET(applicationId);
            if (!result.success) {
                return result;
            }
            return { success: true, data: result.data };
        }

        return { 
            success: true, 
            data: cvet 
        };
    } catch (error) {
        console.error('Error downloading CVET:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Download receipt (returns data for download)
 */
export async function downloadReceipt(applicationId) {
    try {
        const { data: payment, error } = await supabase
            .from('payments')
            .select('*')
            .eq('application_id', applicationId)
            .eq('status', 'paid')
            .single();

        if (error) throw error;
        if (!payment) throw new Error('Payment receipt not found');

        return { 
            success: true, 
            data: payment 
        };
    } catch (error) {
        console.error('Error downloading receipt:', error);
        return { success: false, error: error.message };
    }
}
