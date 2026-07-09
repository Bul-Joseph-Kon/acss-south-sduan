// ================================================================
// ESCALATION SERVICE MODULE
// ================================================================
// Handles all escalation-related operations
// ================================================================

import supabase from './supabase.js';
import { getUserProfile } from './auth.js';
import { sendInspectionEscalatedNotification } from './notifications.js';

// ================================================================
// CREATE ESCALATION CASE
// ================================================================

export async function createEscalationCase(applicationId, escalationData) {
    try {
        console.log('=== STEP 8: createEscalationCase ENTRY ===');
        console.log('Application ID:', applicationId);
        console.log('Escalation Data:', escalationData);

        const { data: { user } } = await supabase.auth.getUser();
        console.log('STEP 8.1: Auth user:', user);
        const profile = user ? await getUserProfile(user.id) : null;
        console.log('STEP 8.2: User profile:', profile);

        if (!profile) {
            throw new Error('User profile not found');
        }

        // Get application details
        console.log('STEP 8.3: Fetching application details');
        const { data: application, error: appError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (appError) throw appError;
        if (!application) throw new Error('Application not found');
        console.log('STEP 8.4: Application fetched:', application);

        // Insert into escalated_cases
        const escalationRecord = {
            application_id: applicationId,
            trader_id: application.user_id,
            assigned_officer_id: profile.id,
            reason: escalationData.reason || 'No reason provided',
            priority: escalationData.priority || 'medium',
            status: 'open',
            notes: escalationData.notes || null
        };

        console.log('STEP 9: INSERT payload for escalated_cases:', escalationRecord);
        const { data: escalatedCase, error: escalationError } = await supabase
            .from('escalated_cases')
            .insert(escalationRecord)
            .select()
            .single();

        if (escalationError) {
            console.log('STEP 10: INSERT FAILED - Full error object:', {
                code: escalationError.code,
                message: escalationError.message,
                details: escalationError.details,
                hint: escalationError.hint
            });
            throw escalationError;
        }

        console.log('STEP 10: INSERT SUCCESS - Escalation case created:', escalatedCase);

        // Verification query
        console.log('STEP 11: Running verification query');
        const verify = await supabase
            .from('escalated_cases')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);
        console.log('STEP 11.1: Verification result:', verify);

        // Update application status
        console.log('STEP 12: Updating application status');
        const { error: updateError } = await supabase
            .from('applications')
            .update({
                status: escalationData.applicationStatus || 'pending_review',
                escalation_reason: escalationData.reason,
                escalated_at: new Date().toISOString()
            })
            .eq('id', applicationId);

        if (updateError) {
            console.log('STEP 13: Application status update FAILED:', updateError);
            throw updateError;
        }
        console.log('STEP 13: Application status update SUCCESS');

        // Verify application status update
        console.log('STEP 14: Verifying application status update');
        const appVerify = await supabase
            .from('applications')
            .select('status, escalation_reason, escalated_at')
            .eq('id', applicationId)
            .single();
        console.log('STEP 14.1: Application status verification:', appVerify);

        // Create activity log
        console.log('STEP 15: Creating activity log');
        await createActivityLog(applicationId, profile.id, 'escalation', escalationData.reason);
        console.log('STEP 15.1: Activity log created');

        // Verify activity log
        console.log('STEP 16: Verifying activity log');
        const activityVerify = await supabase
            .from('activity_logs')
            .select('*')
            .eq('application_id', applicationId)
            .eq('action', 'escalation')
            .order('timestamp', { ascending: false })
            .limit(1);
        console.log('STEP 16.1: Activity log verification:', activityVerify);

        // Create audit log
        console.log('STEP 17: Creating audit log');
        await createAuditLog(applicationId, profile.id, 'escalation', escalationData);
        console.log('STEP 17.1: Audit log created');

        // Verify audit log
        console.log('STEP 18: Verifying audit log');
        const auditVerify = await supabase
            .from('audit_logs')
            .select('*')
            .eq('entity_id', applicationId)
            .eq('action', 'escalation_escalation')
            .order('timestamp', { ascending: false })
            .limit(1);
        console.log('STEP 18.1: Audit log verification:', auditVerify);

        // Send notification to supervisor
        console.log('STEP 19: Sending escalation notification');
        await sendEscalationNotification(applicationId, escalationData.reason, escalationData.priority);
        console.log('STEP 19.1: Notification sent');

        // Verify notification
        console.log('STEP 20: Verifying notification');
        const notificationVerify = await supabase
            .from('notifications')
            .select('*')
            .eq('reference_id', applicationId)
            .eq('reference_type', 'application')
            .eq('title', 'Application Escalated')
            .order('created_at', { ascending: false })
            .limit(1);
        console.log('STEP 20.1: Notification verification:', notificationVerify);

        console.log('STEP 21: Escalation workflow COMPLETE');
        return {
            success: true,
            data: escalatedCase,
            message: 'Escalation case created successfully'
        };
    } catch (error) {
        console.log('STEP ERROR: Full error object:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            stack: error.stack
        });
        return { success: false, error: error.message };
    }
}

// ================================================================
// RESOLVE ESCALATION CASE
// ================================================================

export async function resolveEscalationCase(escalationCaseId, resolutionData) {
    try {
        console.log('=== RESOLVING ESCALATION CASE ===');
        console.log('Escalation Case ID:', escalationCaseId);
        console.log('Resolution Data:', resolutionData);

        const { data: { user } } = await supabase.auth.getUser();
        const profile = user ? await getUserProfile(user.id) : null;

        if (!profile) {
            throw new Error('User profile not found');
        }

        // Get escalation case details
        const { data: escalationCase, error: fetchError } = await supabase
            .from('escalated_cases')
            .select('*')
            .eq('id', escalationCaseId)
            .single();

        if (fetchError) throw fetchError;
        if (!escalationCase) throw new Error('Escalation case not found');

        // Update escalation case
        const { data: updatedCase, error: updateError } = await supabase
            .from('escalated_cases')
            .update({
                status: 'resolved',
                resolution: resolutionData.resolution || 'Resolved',
                resolved_at: new Date().toISOString(),
                resolved_by: profile.id,
                notes: resolutionData.notes || escalationCase.notes
            })
            .eq('id', escalationCaseId)
            .select()
            .single();

        if (updateError) throw updateError;

        // Update application status
        const { error: appUpdateError } = await supabase
            .from('applications')
            .update({
                status: resolutionData.applicationStatus || 'approved',
                escalation_reason: null
            })
            .eq('id', escalationCase.application_id);

        if (appUpdateError) throw appUpdateError;

        // Create activity log
        await createActivityLog(escalationCase.application_id, profile.id, 'resolution', resolutionData.resolution);

        // Create audit log
        await createAuditLog(escalationCase.application_id, profile.id, 'resolution', resolutionData);

        console.log('Escalation case resolved:', updatedCase);

        return {
            success: true,
            data: updatedCase,
            message: 'Escalation case resolved successfully'
        };
    } catch (error) {
        console.error('Resolve escalation case error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// FETCH ESCALATION CASES
// ================================================================

export async function fetchEscalationCases(options = {}) {
    try {
        const filters = options.filters || {};
        const status = options.status || ['open', 'in_progress'];

        const { data, error } = await supabase
            .from('escalated_cases')
            .select(`
                *,
                applications (*),
                trader:profiles!escalated_cases_trader_id_fkey (full_name, email),
                officer:profiles!escalated_cases_assigned_officer_id_fkey (full_name, email),
                resolver:profiles!escalated_cases_resolved_by_fkey (full_name, email)
            `)
            .in('status', Array.isArray(status) ? status : [status])
            .order('created_at', { ascending: false })
            .limit(options.limit || 50);

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Fetch escalation cases error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// FETCH ESCALATION CASE BY APPLICATION ID
// ================================================================

export async function fetchEscalationCaseByApplicationId(applicationId) {
    try {
        const { data, error } = await supabase
            .from('escalated_cases')
            .select(`
                *,
                applications (*),
                trader:profiles!escalated_cases_trader_id_fkey (full_name, email),
                officer:profiles!escalated_cases_assigned_officer_id_fkey (full_name, email),
                resolver:profiles!escalated_cases_resolved_by_fkey (full_name, email)
            `)
            .eq('application_id', applicationId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No rows returned - no escalation case exists
                return { success: true, data: null };
            }
            throw error;
        }

        return { success: true, data };
    } catch (error) {
        console.error('Fetch escalation case by application ID error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// ACTIVITY LOGGING
// ================================================================

async function createActivityLog(applicationId, userId, action, details) {
    try {
        const payload = {
            user_id: userId,
            activity_type: action,
            description: details,
            metadata: JSON.stringify({ application_id: applicationId }),
            ip_address: null,
            created_at: new Date().toISOString()
        };

        console.log("=== BEFORE ACTIVITY INSERT ===");
        console.log(payload);

        const { data, error } = await supabase
            .from('activity_logs')
            .insert(payload)
            .select()
            .single();

        console.log("=== AFTER ACTIVITY INSERT ===");
        console.log(data);
        console.log(error);

        if (error) {
            console.error(error.code);
            console.error(error.message);
            console.error(error.details);
            console.error(error.hint);
            // Don't throw - activity log failure shouldn't break the main operation
        }
    } catch (error) {
        console.error('Create activity log error:', error);
    }
}

// ================================================================
// AUDIT LOGGING
// ================================================================

async function createAuditLog(applicationId, userId, action, details) {
    try {
        const { error } = await supabase
            .from('audit_logs')
            .insert({
                user_id: userId,
                action: `escalation_${action}`,
                entity_type: 'escalation_case',
                entity_id: applicationId,
                details: JSON.stringify(details),
                timestamp: new Date().toISOString()
            });

        if (error) {
            console.error('Create audit log error:', error);
            // Don't throw - audit log failure shouldn't break the main operation
        }
    } catch (error) {
        console.error('Create audit log error:', error);
    }
}

// ================================================================
// NOTIFICATION SENDING
// ================================================================

async function sendEscalationNotification(applicationId, reason, priority) {
    try {
        // Find supervisors to notify
        const { data: supervisors } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'supervisor')
            .eq('status', 'active');

        if (supervisors && supervisors.length > 0) {
            // Send notification to all supervisors
            for (const supervisor of supervisors) {
                await sendInspectionEscalatedNotification(supervisor.id, applicationId, reason);
            }
        }
    } catch (error) {
        console.error('Send escalation notification error:', error);
        // Don't throw - notification failure shouldn't break the main operation
    }
}

// ================================================================
// REALTIME SUBSCRIPTION
// ================================================================

export function subscribeToEscalatedCases(callback) {
    const channel = supabase
        .channel('escalated_cases_changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'escalated_cases'
            },
            (payload) => {
                console.log('Escalated cases change:', payload);
                callback(payload);
            }
        )
        .subscribe();

    return channel;
}

export function unsubscribeFromEscalatedCases(channel) {
    if (channel) {
        supabase.removeChannel(channel);
    }
}
