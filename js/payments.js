// ================================================================
// PAYMENTS MODULE
// ================================================================
// Handles all payment-related operations
// ================================================================

import supabase from './supabase.js';
import { fetchTable, fetchById, insertRecord, updateRecord, deleteRecord, countRecords } from './database.js';
import { getUserProfile } from './auth.js';

// ================================================================
// FETCH PAYMENTS
// ================================================================

export async function fetchPayments(options = {}) {
    const { data: { user } } = await supabase.auth.getUser();
    const profile = user ? await getUserProfile(user.id) : null;
    
    const filters = options.filters || {};
    if (profile && !options.includeAll) {
        filters.user_id = profile.id;
    }

    return fetchTable('payments', {
        filters,
        orderBy: options.orderBy || { column: 'created_at', ascending: false },
        limit: options.limit
    });
}

// ================================================================
// FETCH PAYMENT BY ID
// ================================================================

export async function fetchPaymentById(id) {
    return fetchById('payments', id);
}

// ================================================================
// FETCH PAYMENTS BY APPLICATION ID
// ================================================================

export async function fetchPaymentsByApplication(applicationId) {
    try {
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('application_id', applicationId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Fetch payments by application error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// CREATE PAYMENT
// ================================================================

export async function createPayment(paymentData) {
    const { data: { user } } = await supabase.auth.getUser();
    const profile = user ? await getUserProfile(user.id) : null;
    
    const newPayment = {
        ...paymentData,
        user_id: profile?.id,
        status: 'pending'
    };

    return insertRecord('payments', newPayment);
}

// ================================================================
// UPDATE PAYMENT
// ================================================================

export async function updatePayment(id, updates) {
    return updateRecord('payments', id, updates);
}

// ================================================================
// UPDATE PAYMENT STATUS
// ================================================================

export async function updatePaymentStatus(paymentId, status, transactionId = null) {
    const updates = { status };
    
    if (status === 'paid') {
        updates.paid_at = new Date().toISOString();
        if (transactionId) {
            updates.transaction_id = transactionId;
        }
    } else if (status === 'failed') {
        updates.failed_at = new Date().toISOString();
    }

    return updatePayment(paymentId, updates);
}

// ================================================================
// DELETE PAYMENT
// ================================================================

export async function deletePayment(id) {
    return deleteRecord('payments', id);
}

// ================================================================
// FETCH PAYMENT STATISTICS
// ================================================================

export async function fetchPaymentStatistics() {
    const { data: { user } } = await supabase.auth.getUser();
    const profile = user ? await getUserProfile(user.id) : null;
    
    const filters = profile ? { user_id: profile.id } : {};

    const [totalResult, pendingResult, paidResult, failedResult] = await Promise.all([
        countRecords('payments', filters),
        countRecords('payments', { ...filters, status: 'pending' }),
        countRecords('payments', { ...filters, status: 'paid' }),
        countRecords('payments', { ...filters, status: 'failed' })
    ]);

    return {
        total: totalResult.success ? totalResult.count : 0,
        pending: pendingResult.success ? pendingResult.count : 0,
        paid: paidResult.success ? paidResult.count : 0,
        failed: failedResult.success ? failedResult.count : 0
    };
}

// ================================================================
// CALCULATE TOTAL PAYMENTS
// ================================================================

export async function calculateTotalPayments(filters = {}) {
    try {
        let query = supabase
            .from('payments')
            .select('amount');

        Object.keys(filters).forEach(key => {
            query = query.eq(key, filters[key]);
        });

        const { data, error } = await query;

        if (error) throw error;

        const total = data.reduce((sum, payment) => sum + (payment.amount || 0), 0);

        return { success: true, total };
    } catch (error) {
        console.error('Calculate total payments error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// PROCESS PAYMENT
// ================================================================

export async function processPayment(paymentId, paymentMethod, transactionDetails = {}) {
    try {
        console.log('=== PROCESSING PAYMENT ===');
        console.log('Payment ID:', paymentId);
        console.log('Payment Method:', paymentMethod);

        // Get payment details
        const { data: payment, error: fetchError } = await supabase
            .from('payments')
            .select('*')
            .eq('id', paymentId)
            .single();

        if (fetchError) throw fetchError;
        if (!payment) throw new Error('Payment not found');

        // Simulate payment processing
        // In production, this would integrate with a payment gateway
        const paymentSuccess = Math.random() > 0.1; // 90% success rate for simulation

        if (paymentSuccess) {
            // Update payment status to paid
            const { data, error } = await supabase
                .from('payments')
                .update({
                    status: 'paid',
                    payment_method: paymentMethod,
                    transaction_id: transactionDetails.transactionId || `TXN-${Date.now()}`,
                    paid_at: new Date().toISOString(),
                    payment_details: JSON.stringify(transactionDetails)
                })
                .eq('id', paymentId)
                .select()
                .single();

            if (error) throw error;

            // Log activity for successful payment
            const payload = {
                user_id: payment.user_id,
                activity_type: 'payment_processed',
                description: `Payment processed successfully: ${payment.amount} ${payment.currency}`,
                metadata: JSON.stringify({
                    payment_id: paymentId,
                    application_id: payment.application_id,
                    amount: payment.amount,
                    payment_method: paymentMethod
                }),
                ip_address: null,
                created_at: new Date().toISOString()
            };

            console.log("=== BEFORE ACTIVITY INSERT ===");
            console.log(payload);

            const { data: activityData, error: activityError } = await supabase
                .from('activity_logs')
                .insert(payload)
                .select()
                .single();

            console.log("=== AFTER ACTIVITY INSERT ===");
            console.log(activityData);
            console.log(activityError);

            if (activityError) {
                console.error(activityError.code);
                console.error(activityError.message);
                console.error(activityError.details);
                console.error(activityError.hint);
            }

            console.log('Payment processed successfully:', data);
            return { success: true, data };
        } else {
            // Update payment status to failed
            const { data, error } = await supabase
                .from('payments')
                .update({
                    status: 'failed',
                    failed_at: new Date().toISOString(),
                    failure_reason: 'Payment processing failed'
                })
                .eq('id', paymentId)
                .select()
                .single();

            if (error) throw error;

            // Log activity for failed payment
            const payload = {
                user_id: payment.user_id,
                activity_type: 'payment_failed',
                description: 'Payment processing failed',
                metadata: JSON.stringify({
                    payment_id: paymentId,
                    application_id: payment.application_id,
                    amount: payment.amount
                }),
                ip_address: null,
                created_at: new Date().toISOString()
            };

            console.log("=== BEFORE ACTIVITY INSERT ===");
            console.log(payload);

            const { data: activityData, error: activityError } = await supabase
                .from('activity_logs')
                .insert(payload)
                .select()
                .single();

            console.log("=== AFTER ACTIVITY INSERT ===");
            console.log(activityData);
            console.log(activityError);

            if (activityError) {
                console.error(activityError.code);
                console.error(activityError.message);
                console.error(activityError.details);
                console.error(activityError.hint);
            }

            console.log('Payment processing failed:', data);
            return { success: false, error: 'Payment processing failed', data };
        }
    } catch (error) {
        console.error('Process payment error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// REFUND PAYMENT
// ================================================================

export async function refundPayment(paymentId, reason = null) {
    try {
        console.log('=== REFUNDING PAYMENT ===');
        console.log('Payment ID:', paymentId);

        // Get payment details
        const { data: payment, error: fetchError } = await supabase
            .from('payments')
            .select('*')
            .eq('id', paymentId)
            .single();

        if (fetchError) throw fetchError;
        if (!payment) throw new Error('Payment not found');

        if (payment.status !== 'paid') {
            throw new Error('Only paid payments can be refunded');
        }

        // Update payment status to refunded
        const { data, error } = await supabase
            .from('payments')
            .update({
                status: 'refunded',
                refunded_at: new Date().toISOString(),
                refund_reason: reason
            })
            .eq('id', paymentId)
            .select()
            .single();

        if (error) throw error;

        console.log('Payment refunded successfully:', data);
        return { success: true, data };
    } catch (error) {
        console.error('Refund payment error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// GENERATE PAYMENT RECEIPT
// ================================================================

export async function generatePaymentReceipt(paymentId) {
    try {
        console.log('=== GENERATING PAYMENT RECEIPT ===');
        console.log('Payment ID:', paymentId);

        // Get payment details with application info
        const { data: payment, error: fetchError } = await supabase
            .from('payments')
            .select(`
                *,
                applications (
                    application_number,
                    application_type
                )
            `)
            .eq('id', paymentId)
            .single();

        if (fetchError) throw fetchError;
        if (!payment) throw new Error('Payment not found');

        // Generate receipt data
        const receipt = {
            receipt_number: `RCP-${Date.now()}`,
            payment_id: payment.id,
            application_number: payment.applications?.application_number,
            application_type: payment.applications?.application_type,
            amount: payment.amount,
            currency: payment.currency || 'USD',
            payment_date: payment.paid_at,
            payment_method: payment.payment_method,
            transaction_id: payment.transaction_id,
            status: payment.status
        };

        console.log('Receipt generated:', receipt);
        return { success: true, data: receipt };
    } catch (error) {
        console.error('Generate receipt error:', error);
        return { success: false, error: error.message };
    }
}
