// ================================================================
// AGENT CVET SERVICE
// ================================================================
// Handles CVET applications for Clearing Agents
// Uses only live Supabase data - no mocks, no localStorage
// ================================================================

import supabase from './supabase.js';
import { getUserProfile } from './auth.js';

// ================================================================
// FETCH CVET APPLICATIONS FOR AGENT
// ================================================================

export async function fetchAgentCVETApplications(options = {}) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        const profile = await getUserProfile();
        if (!profile) {
            return { success: false, error: 'User profile not found' };
        }

        if (profile.role !== 'agent') {
            return { success: false, error: 'User is not an agent' };
        }

        const agentId = profile.id;

        // Build query
        let query = supabase
            .from('applications')
            .select(`
                *,
                profiles!applications_user_id_fkey(
                    full_name,
                    organization,
                    email
                )
            `)
            .eq('agent_id', agentId)
            .eq('application_type', 'CVET');

        // Apply status filter if provided
        if (options.status) {
            if (Array.isArray(options.status)) {
                query = query.in('status', options.status);
            } else {
                query = query.eq('status', options.status);
            }
        }

        // Apply search if provided
        if (options.search) {
            const searchTerm = `%${options.search}%`;
            query = query.or(
                `application_number.ilike.${searchTerm},` +
                `trader_name.ilike.${searchTerm},` +
                `consignment_number.ilike.${searchTerm}`
            );
        }

        // Apply customs office filter if provided
        if (options.customsOffice) {
            query = query.eq('customs_office', options.customsOffice);
        }

        // Apply date range filter if provided
        if (options.startDate) {
            query = query.gte('created_at', options.startDate);
        }
        if (options.endDate) {
            query = query.lte('created_at', options.endDate);
        }

        // Apply ordering
        const orderBy = options.orderBy || { column: 'created_at', ascending: false };
        query = query.order(orderBy.column, { ascending: orderBy.ascending });

        // Apply limit
        if (options.limit) {
            query = query.limit(options.limit);
        }

        const { data, error } = await query;

        if (error) {
            console.error('=== CVET APPLICATIONS QUERY ERROR ===');
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            console.error('Error details:', error.details);
            console.error('Error hint:', error.hint);
            return { success: false, error: error.message, details: error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('=== CVET APPLICATIONS FETCH ERROR ===');
        console.error('Error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// FETCH CVET APPLICATION STATISTICS FOR AGENT
// ================================================================

export async function fetchAgentCVETStatistics() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        const profile = await getUserProfile();
        if (!profile || profile.role !== 'agent') {
            return { success: false, error: 'User is not an agent' };
        }

        const agentId = profile.id;

        // Count applications by status
        const [
            totalResult,
            draftResult,
            submittedResult,
            pendingReviewResult,
            underInspectionResult,
            approvedResult,
            paidResult,
            completedResult,
            rejectedResult,
            returnedResult
        ] = await Promise.all([
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('agent_id', agentId).eq('application_type', 'CVET'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('agent_id', agentId).eq('application_type', 'CVET').eq('status', 'draft'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('agent_id', agentId).eq('application_type', 'CVET').eq('status', 'submitted'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('agent_id', agentId).eq('application_type', 'CVET').eq('status', 'pending_review'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('agent_id', agentId).eq('application_type', 'CVET').eq('status', 'under_inspection'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('agent_id', agentId).eq('application_type', 'CVET').eq('status', 'approved'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('agent_id', agentId).eq('application_type', 'CVET').eq('status', 'paid'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('agent_id', agentId).eq('application_type', 'CVET').eq('status', 'completed'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('agent_id', agentId).eq('application_type', 'CVET').eq('status', 'rejected'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('agent_id', agentId).eq('application_type', 'CVET').eq('status', 'returned')
        ]);

        return {
            success: true,
            statistics: {
                total: totalResult.count || 0,
                draft: draftResult.count || 0,
                submitted: submittedResult.count || 0,
                pending_review: pendingReviewResult.count || 0,
                under_inspection: underInspectionResult.count || 0,
                approved: approvedResult.count || 0,
                paid: paidResult.count || 0,
                completed: completedResult.count || 0,
                rejected: rejectedResult.count || 0,
                returned: returnedResult.count || 0
            }
        };
    } catch (error) {
        console.error('=== CVET STATISTICS ERROR ===');
        console.error('Error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// FETCH SINGLE CVET APPLICATION
// ================================================================

export async function fetchAgentCVETApplication(applicationId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        const profile = await getUserProfile();
        if (!profile || profile.role !== 'agent') {
            return { success: false, error: 'User is not an agent' };
        }

        const agentId = profile.id;

        const { data, error } = await supabase
            .from('applications')
            .select(`
                *,
                profiles!applications_user_id_fkey(
                    full_name,
                    organization,
                    email
                ),
                payments(
                    *,
                    id,
                    invoice_number,
                    receipt_number,
                    amount,
                    status,
                    paid_at
                )
            `)
            .eq('id', applicationId)
            .eq('agent_id', agentId)
            .eq('application_type', 'CVET')
            .single();

        if (error) {
            console.error('=== CVET APPLICATION FETCH ERROR ===');
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            console.error('Error details:', error.details);
            console.error('Error hint:', error.hint);
            return { success: false, error: error.message, details: error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('=== CVET APPLICATION FETCH ERROR ===');
        console.error('Error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// SETUP REALTIME SUBSCRIPTION FOR AGENT CVET APPLICATIONS
// ================================================================

export function setupAgentCVETRealtime(agentId, callback) {
    const channelName = `agent-cvet-${agentId}`;
    
    const channel = supabase
        .channel(channelName)
        .on(
            'postgres_changes',
            {
                event: '*', // INSERT, UPDATE, DELETE
                schema: 'public',
                table: 'applications',
                filter: `agent_id=eq.${agentId}`
            },
            async (payload) => {
                console.log('=== AGENT CVET REALTIME EVENT ===');
                console.log('Event type:', payload.eventType);
                console.log('Application ID:', payload.new?.id || payload.old?.id);
                
                if (callback) {
                    await callback(payload);
                }
            }
        )
        .subscribe((status) => {
            console.log('=== CVET REALTIME SUBSCRIPTION STATUS ===');
            console.log('Channel:', channelName);
            console.log('Status:', status);
        });

    return channel;
}

// ================================================================
// CLEANUP REALTIME SUBSCRIPTION
// ================================================================

export function cleanupAgentCVETRealtime(channel) {
    if (channel) {
        supabase.removeChannel(channel);
        console.log('=== CVET REALTIME SUBSCRIPTION CLEANED UP ===');
    }
}

// ================================================================
// GET AVAILABLE FILTER OPTIONS
// ================================================================

export async function getCVETFilterOptions() {
    try {
        // Get unique customs offices
        const { data: customsOffices, error: officesError } = await supabase
            .from('applications')
            .select('customs_office')
            .not('customs_office', 'is', null)
            .limit(100);

        if (officesError) throw officesError;

        const uniqueOffices = [...new Set(customsOffices?.map(o => o.customs_office) || [])];

        return {
            success: true,
            options: {
                customsOffices: uniqueOffices,
                statuses: [
                    { value: 'draft', label: 'Draft' },
                    { value: 'submitted', label: 'Submitted' },
                    { value: 'pending_review', label: 'Pending Review' },
                    { value: 'under_inspection', label: 'Under Inspection' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'paid', label: 'Paid' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'rejected', label: 'Rejected' },
                    { value: 'returned', label: 'Returned' }
                ]
            }
        };
    } catch (error) {
        console.error('=== CVET FILTER OPTIONS ERROR ===');
        console.error('Error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

export function formatCVETStatus(status) {
    const labels = {
        draft: 'Draft',
        submitted: 'Submitted',
        pending_review: 'Pending Review',
        under_inspection: 'Under Inspection',
        approved: 'Approved',
        paid: 'Paid',
        completed: 'Completed',
        rejected: 'Rejected',
        returned: 'Returned'
    };
    return labels[status] || status;
}

export function getCVETStatusBadgeClass(status) {
    const classes = {
        draft: 'bg-gray-100 text-gray-700',
        submitted: 'bg-blue-100 text-blue-700',
        pending_review: 'bg-yellow-100 text-yellow-700',
        under_inspection: 'bg-orange-100 text-orange-700',
        approved: 'bg-green-100 text-green-700',
        paid: 'bg-emerald-100 text-emerald-700',
        completed: 'bg-purple-100 text-purple-700',
        rejected: 'bg-red-100 text-red-700',
        returned: 'bg-gray-100 text-gray-700'
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
}

export function formatCVETDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export function formatCVETCurrency(amount) {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}
