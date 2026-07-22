// ================================================================
// INSPECTOR SERVICE
// ================================================================
// Handles inspection workflow: record inspection, upload evidence, approve, escalate
// ================================================================

import supabase from './supabase.js';
import { getCurrentUser, getUserProfile } from './auth.js';

// ================================================================
// INSPECTOR FUNCTIONS
// ================================================================

async function getInspectionQueue() {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'inspector') {
            throw new Error('User must be an inspector');
        }

        const { data, error } = await supabase
            .from('applications')
            .select(`
                *,
                agent_profile:profiles!agent_id(full_name, email, phone),
                officer_profile:profiles!officer_id(full_name)
            `)
            .eq('status', 'under_inspection')
            .order('assigned_at', { ascending: false });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Error fetching inspection queue:', error);
        return { success: false, error: error.message };
    }
}

async function recordInspection(applicationId, inspectionData) {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'inspector') {
            throw new Error('User must be an inspector');
        }

        // Get current application
        const { data: currentApp, error: fetchError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (fetchError) throw fetchError;

        // Create inspection report
        const { data: inspectionReport, error: reportError } = await supabase
            .from('inspection_reports')
            .insert({
                application_id: applicationId,
                inspector_id: profile.id,
                inspection_date: new Date().toISOString(),
                inspection_location: inspectionData.location || 'Customs Warehouse',
                container_number: inspectionData.container_number,
                findings_summary: inspectionData.findings_summary,
                discrepancies: inspectionData.discrepancies,
                violations: inspectionData.violations,
                recommendation: inspectionData.recommendation,
                recommendation_reason: inspectionData.recommendation_reason,
                supporting_documents: inspectionData.supporting_documents || [],
                status: 'submitted'
            })
            .select()
            .single();

        if (reportError) throw reportError;

        // Update application status to inspection_completed
        const { data: updatedApp, error } = await supabase
            .from('applications')
            .update({
                inspection_report_id: inspectionReport.id,
                status: 'inspection_completed',
                inspector_id: profile.id,
                inspected_at: new Date().toISOString()
            })
            .eq('id', applicationId)
            .select()
            .single();

        if (error) throw error;

        // Log workflow transition
        await supabase.from('workflow_logs').insert({
            application_id: applicationId,
            from_status: 'under_inspection',
            to_status: 'inspection_completed',
            action: 'inspection_completed',
            notes: `Inspection completed with recommendation: ${inspectionData.recommendation}`,
            performed_by: profile.id
        });

        // Create activity log
        await createActivityLog(
            profile.id,
            'inspection_completed',
            `Inspection completed for application ${updatedApp.application_number}`,
            { application_id: applicationId, inspection_report_id: inspectionReport.id }
        );

        // Create audit log
        await createAuditLog(
            profile.id,
            'INSERT',
            'inspection_reports',
            inspectionReport.id,
            null,
            { recommendation: inspectionData.recommendation }
        );

        // Notify customs officer
        await createNotification(
            currentApp.officer_id,
            'Inspection Completed',
            `Inspection report submitted for application ${updatedApp.application_number}. Recommendation: ${inspectionData.recommendation}`,
            'info',
            applicationId,
            'application'
        );

        console.log('Inspection recorded:', updatedApp.application_number);
        return { success: true, data: updatedApp };
    } catch (error) {
        console.error('Error recording inspection:', error);
        return { success: false, error: error.message };
    }
}

async function approveInspection(applicationId, notes) {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'inspector') {
            throw new Error('User must be an inspector');
        }

        // Get current application
        const { data: currentApp, error: fetchError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (fetchError) throw fetchError;

        // Update application status to approved
        const { data: updatedApp, error } = await supabase
            .from('applications')
            .update({
                status: 'approved',
                inspector_id: profile.id,
                inspected_at: new Date().toISOString(),
                approved_at: new Date().toISOString(),
                notes: notes || currentApp.notes
            })
            .eq('id', applicationId)
            .select()
            .single();

        if (error) throw error;

        // Create activity log
        await createActivityLog(
            profile.id,
            'inspection_approved',
            `Inspection approved for application ${updatedApp.application_number}`,
            { application_id: applicationId }
        );

        // Create audit log
        await createAuditLog(
            profile.id,
            'UPDATE',
            'applications',
            applicationId,
            { status: currentApp.status },
            { status: 'approved' }
        );

        // Notify agent
        await createNotification(
            updatedApp.agent_id,
            'Inspection Approved',
            `Your declaration ${updatedApp.application_number} has passed inspection. Proceed to payment.`,
            'success',
            applicationId,
            'application'
        );

        // Notify revenue officer
        await notifyRevenueOfficers(applicationId, updatedApp.application_number);

        console.log('Inspection approved:', updatedApp.application_number);
        return { success: true, data: updatedApp };
    } catch (error) {
        console.error('Error approving inspection:', error);
        return { success: false, error: error.message };
    }
}

async function escalateInspection(applicationId, escalationReason, escalationType, notes) {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'inspector') {
            throw new Error('User must be an inspector');
        }

        // Get current application
        const { data: currentApp, error: fetchError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (fetchError) throw fetchError;

        // Create escalated case record
        const { data: escalatedCase, error: escalationError } = await supabase
            .from('escalated_cases')
            .insert({
                application_id: applicationId,
                escalated_by: profile.id,
                escalation_reason: escalationReason,
                escalation_type: escalationType,
                priority: 'high',
                status: 'pending'
            })
            .select()
            .single();

        if (escalationError) throw escalationError;

        // Update application to indicate escalation
        const { data: updatedApp, error } = await supabase
            .from('applications')
            .update({
                notes: `Escalated to supervisor: ${escalationReason}. ${notes || ''}`
            })
            .eq('id', applicationId)
            .select()
            .single();

        if (error) throw error;

        // Create activity log
        await createActivityLog(
            profile.id,
            'inspection_escalated',
            `Inspection escalated for application ${updatedApp.application_number}: ${escalationReason}`,
            { application_id: applicationId, escalation_type, escalation_reason }
        );

        // Create audit log
        await createAuditLog(
            profile.id,
            'INSERT',
            'escalated_cases',
            escalatedCase.id,
            null,
            { application_id: applicationId, escalation_reason, escalation_type }
        );

        // Notify agent
        await createNotification(
            updatedApp.agent_id,
            'Inspection Escalated',
            `Your declaration ${updatedApp.application_number} inspection has been escalated to a supervisor.`,
            'warning',
            applicationId,
            'application'
        );

        // Notify supervisors
        await notifySupervisors(applicationId, updatedApp.application_number, escalationReason);

        console.log('Inspection escalated:', updatedApp.application_number);
        return { success: true, data: updatedApp, escalatedCase };
    } catch (error) {
        console.error('Error escalating inspection:', error);
        return { success: false, error: error.message };
    }
}

async function uploadInspectionEvidence(applicationId, evidenceData) {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'inspector') {
            throw new Error('User must be an inspector');
        }

        // Upload evidence to documents table
        const { data: document, error } = await supabase
            .from('documents')
            .insert({
                application_id: applicationId,
                user_id: profile.id,
                document_name: evidenceData.name,
                document_type: evidenceData.type || 'jpg',
                file_path: evidenceData.path,
                file_size: evidenceData.size,
                mime_type: evidenceData.mime_type,
                storage_bucket: 'inspection_evidence',
                storage_path: evidenceData.storage_path,
                uploaded_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        // Create activity log
        await createActivityLog(
            profile.id,
            'evidence_uploaded',
            `Inspection evidence uploaded for application ${applicationId}`,
            { application_id: applicationId, document_id: document.id }
        );

        console.log('Evidence uploaded:', document.id);
        return { success: true, data: document };
    } catch (error) {
        console.error('Error uploading evidence:', error);
        return { success: false, error: error.message };
    }
}

async function getApplicationById(applicationId) {
    try {
        const { data, error } = await supabase
            .from('applications')
            .select(`
                *,
                profiles:agent_id(full_name, email, phone),
                profiles:officer_id(full_name),
                documents(*)
            `)
            .eq('id', applicationId)
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Error fetching application:', error);
        return { success: false, error: error.message };
    }
}

async function getInspectorStatistics() {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'inspector') {
            throw new Error('User must be an inspector');
        }

        const [pendingResult, approvedResult, escalatedResult] = await Promise.all([
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'under_inspection'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('inspector_id', profile.id).eq('status', 'approved'),
            supabase.from('escalated_cases').select('*', { count: 'exact', head: true }).eq('escalated_by', profile.id).eq('status', 'pending')
        ]);

        return {
            success: true,
            statistics: {
                pending_inspection: pendingResult.count || 0,
                approved: approvedResult.count || 0,
                escalated: escalatedResult.count || 0
            }
        };
    } catch (error) {
        console.error('Error fetching inspector statistics:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

async function createActivityLog(userId, activityType, description, metadata) {
    try {
        await supabase.from('activity_logs').insert({
            user_id: userId,
            activity_type: activityType,
            description,
            metadata
        });
    } catch (error) {
        console.error('Error creating activity log:', error);
    }
}

async function createAuditLog(userId, action, tableName, recordId, oldValues, newValues) {
    try {
        await supabase.from('audit_logs').insert({
            user_id: userId,
            action,
            table_name: tableName,
            record_id: recordId,
            old_values,
            new_values
        });
    } catch (error) {
        console.error('Error creating audit log:', error);
    }
}

async function createNotification(userId, title, message, type, referenceId, referenceType) {
    try {
        await supabase.from('notifications').insert({
            user_id: userId,
            title,
            message,
            type,
            reference_id: referenceId,
            reference_type: referenceType
        });
    } catch (error) {
        console.error('Error creating notification:', error);
    }
}

async function notifyRevenueOfficers(applicationId, applicationNumber) {
    try {
        const { data: officers } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'supervisor');

        if (officers && officers.length > 0) {
            await Promise.all(officers.map(officer =>
                createNotification(
                    officer.id,
                    'Payment Required',
                    `Application ${applicationNumber} approved and awaiting payment generation.`,
                    'info',
                    applicationId,
                    'application'
                )
            ));
        }
    } catch (error) {
        console.error('Error notifying revenue officers:', error);
    }
}

async function notifySupervisors(applicationId, applicationNumber, escalationReason) {
    try {
        const { data: supervisors } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'supervisor');

        if (supervisors && supervisors.length > 0) {
            await Promise.all(supervisors.map(supervisor =>
                createNotification(
                    supervisor.id,
                    'Escalated Case',
                    `Application ${applicationNumber} escalated: ${escalationReason}`,
                    'warning',
                    applicationId,
                    'escalated_case'
                )
            ));
        }
    } catch (error) {
        console.error('Error notifying supervisors:', error);
    }
}

// ================================================================
// EXPORTS
// ================================================================

export {
    getInspectionQueue,
    recordInspection,
    approveInspection,
    escalateInspection,
    uploadInspectionEvidence,
    getApplicationById,
    getInspectorStatistics
};
