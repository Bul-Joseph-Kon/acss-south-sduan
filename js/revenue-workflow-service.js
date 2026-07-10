// ================================================================
// REVENUE OFFICER WORKFLOW SERVICE
// ================================================================
// Handles Revenue Officer workflow operations for invoices and payments
// ================================================================

import supabase from './supabase.js';
import { getUserProfile } from './auth.js';
import { logPaymentConfirmation } from './logging-service.js';

// ================================================================
// REVENUE OFFICER OPERATIONS
// ================================================================

/**
 * Generate invoice for an approved application
 */
export async function generateInvoice(applicationId, dutyAmount, taxAmount, totalAmount) {
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

        // Generate invoice number
        const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;

        // Create invoice record
        const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .insert({
                application_id: applicationId,
                user_id: application.agent_id || application.user_id,
                invoice_number: invoiceNumber,
                duty_amount: dutyAmount,
                tax_amount: taxAmount,
                total_amount: totalAmount,
                status: 'pending',
                due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (paymentError) throw paymentError;

        // Update application status to awaiting payment
        const { error: updateError } = await supabase
            .from('applications')
            .update({
                status: 'awaiting_payment',
                approved_at: new Date().toISOString()
            })
            .eq('id', applicationId);

        if (updateError) throw updateError;

        return { 
            success: true, 
            message: 'Invoice generated successfully',
            data: payment 
        };
    } catch (error) {
        console.error('Error generating invoice:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Confirm payment for an invoice
 */
export async function confirmPayment(paymentId, paymentMethod, transactionReference = '') {
    try {
        const profile = await getUserProfile();
        if (!profile) {
            return { success: false, error: 'User profile not found' };
        }

        // Get payment details
        const { data: payment, error: fetchError } = await supabase
            .from('payments')
            .select('*, applications (*)')
            .eq('id', paymentId)
            .single();

        if (fetchError) throw fetchError;
        if (!payment) throw new Error('Payment not found');

        if (payment.status === 'paid') {
            return { success: false, error: 'Payment already confirmed' };
        }

        // Generate receipt number
        const receiptNumber = `RCP-${Date.now().toString().slice(-8)}`;

        // Update payment status
        const { error: updateError } = await supabase
            .from('payments')
            .update({
                status: 'paid',
                payment_method: paymentMethod,
                transaction_reference: transactionReference,
                receipt_number: receiptNumber,
                paid_at: new Date().toISOString(),
                paid_by: profile.id
            })
            .eq('id', paymentId);

        if (updateError) throw updateError;

        // Update application status to paid
        const { error: appUpdateError } = await supabase
            .from('applications')
            .update({
                status: 'paid',
                completed_at: new Date().toISOString()
            })
            .eq('id', payment.application_id);

        if (appUpdateError) throw appUpdateError;

        // Log the payment confirmation
        await logPaymentConfirmation(
            payment.application_id,
            payment.user_id,
            payment.applications?.application_number || 'Unknown',
            paymentId,
            payment.total_amount
        );

        return { 
            success: true, 
            message: 'Payment confirmed successfully',
            receiptNumber: receiptNumber 
        };
    } catch (error) {
        console.error('Error confirming payment:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update invoice details
 */
export async function updateInvoice(paymentId, dutyAmount, taxAmount, totalAmount) {
    try {
        const profile = await getUserProfile();
        if (!profile) {
            return { success: false, error: 'User profile not found' };
        }

        const { error } = await supabase
            .from('payments')
            .update({
                duty_amount: dutyAmount,
                tax_amount: taxAmount,
                total_amount: totalAmount,
                updated_at: new Date().toISOString()
            })
            .eq('id', paymentId);

        if (error) throw error;

        return { success: true, message: 'Invoice updated successfully' };
    } catch (error) {
        console.error('Error updating invoice:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetch approved applications awaiting invoice
 */
export async function fetchApprovedApplications() {
    try {
        const profile = await getUserProfile();
        if (!profile) {
            return { success: false, error: 'User profile not found' };
        }

        const { data, error } = await supabase
            .from('applications')
            .select('*')
            .eq('status', 'approved')
            .order('approved_at', { ascending: false });

        if (error) throw error;

        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error fetching approved applications:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetch applications awaiting payment
 */
export async function fetchAwaitingPaymentApplications() {
    try {
        const profile = await getUserProfile();
        if (!profile) {
            return { success: false, error: 'User profile not found' };
        }

        const { data, error } = await supabase
            .from('applications')
            .select('*, payments (*)')
            .eq('status', 'awaiting_payment')
            .order('approved_at', { ascending: false });

        if (error) throw error;

        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error fetching awaiting payment applications:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetch paid applications
 */
export async function fetchPaidApplications() {
    try {
        const profile = await getUserProfile();
        if (!profile) {
            return { success: false, error: 'User profile not found' };
        }

        const { data, error } = await supabase
            .from('applications')
            .select('*, payments (*)')
            .eq('status', 'paid')
            .order('completed_at', { ascending: false });

        if (error) throw error;

        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error fetching paid applications:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get payment by ID
 */
export async function getPaymentById(paymentId) {
    try {
        const { data, error } = await supabase
            .from('payments')
            .select('*, applications (*)')
            .eq('id', paymentId)
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Error fetching payment:', error);
        return { success: false, error: error.message };
    }
}
