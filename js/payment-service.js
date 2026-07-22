// ================================================================
// PAYMENT SERVICE
// ================================================================
// Handles payment processing, receipt generation, and
// automatic cargo document generation after successful payment
// ================================================================

import supabase from './supabase.js';
import { getCurrentUser, getUserProfile } from './auth.js';

// ================================================================
// GENERATE INVOICE
// ================================================================

async function generateInvoice(applicationId) {
    try {
        // Get application details with goods
        const { data: application, error: appError } = await supabase
            .from('applications')
            .select('*, application_goods(*)')
            .eq('id', applicationId)
            .single();

        if (appError) throw appError;
        if (!application) throw new Error('Application not found');

        // Get AI validation results for tax calculation
        const aiValidation = application.ai_validation_results || {};
        const taxCalculation = aiValidation.tax_calculation?.results || {};

        // Calculate totals
        const customsDuty = taxCalculation.customs_duty || 0;
        const vat = taxCalculation.vat || 0;
        const exciseDuty = taxCalculation.excise_duty || 0;
        const subtotal = customsDuty + vat + exciseDuty;
        const totalAmount = taxCalculation.total_payable || subtotal;

        // Generate invoice number
        const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;

        // Create invoice
        const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .insert({
                application_id: applicationId,
                invoice_number: invoiceNumber,
                subtotal: subtotal,
                tax_amount: vat,
                total_amount: totalAmount,
                currency: 'SSP',
                status: 'pending',
                items: taxCalculation.tax_details || [],
                generated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (invoiceError) throw invoiceError;

        // Update application status to awaiting_payment
        const { error: updateError } = await supabase
            .from('applications')
            .update({
                status: 'awaiting_payment',
                updated_at: new Date().toISOString()
            })
            .eq('id', applicationId);

        if (updateError) throw updateError;

        // Create activity log
        await createActivityLog(
            application.agent_id || application.user_id,
            'invoice_generated',
            `Invoice ${invoiceNumber} generated for application ${application.application_number}`,
            { application_id: applicationId, invoice_id: invoice.id, amount: totalAmount }
        );

        // Create audit log
        await createAuditLog(
            application.agent_id || application.user_id,
            'INSERT',
            'invoices',
            invoice.id,
            null,
            { status: 'pending', total_amount: totalAmount }
        );

        // Notify agent
        await createNotification(
            application.agent_id || application.user_id,
            'Invoice Generated',
            `Invoice ${invoiceNumber} has been generated for declaration ${application.application_number}. Total: ${totalAmount.toLocaleString()} SSP`,
            'info',
            applicationId,
            'application'
        );

        console.log('Invoice generated:', invoiceNumber);
        return { success: true, data: invoice };
    } catch (error) {
        console.error('Error generating invoice:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// PROCESS PAYMENT
// ================================================================

async function processPayment(applicationId, paymentData = {}) {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        // Fetch application + invoice
        const { data: application, error: appError } = await supabase
            .from('applications')
            .select(`*, invoices(id, invoice_number, total_amount, status)`)
            .eq('id', applicationId)
            .single();

        if (appError) throw appError;
        if (!application) throw new Error('Application not found');

        const invoice = application.invoices?.[0] || application.invoices;
        if (!invoice) throw new Error('No invoice found for this application');

        const amount = paymentData.amount || invoice.total_amount;
        const paymentNumber = await generatePaymentNumber();
        const receiptNumber = await generateReceiptNumber();

        // Create payment record
        const { data: payment, error: payError } = await supabase
            .from('payments')
            .insert({
                application_id: applicationId,
                user_id: profile.id,
                payment_number: paymentNumber,
                amount: amount,
                currency: 'SSP',
                status: 'completed',
                payment_method: paymentData.payment_method || 'bank_transfer',
                transaction_id: paymentData.transaction_id || generateTransactionId(),
                receipt_number: receiptNumber,
                paid_at: new Date().toISOString(),
                receipt_data: {
                    application_number: application.application_number,
                    invoice_number: invoice.invoice_number,
                    amount: amount,
                    currency: 'SSP',
                    payment_method: paymentData.payment_method || 'bank_transfer',
                    paid_at: new Date().toISOString(),
                    agent_name: profile.full_name,
                    receipt_number: receiptNumber
                }
            })
            .select()
            .single();

        if (payError) throw payError;

        // Update invoice status to paid
        await supabase
            .from('invoices')
            .update({ status: 'paid', paid_at: new Date().toISOString(), payment_id: payment.id })
            .eq('id', invoice.id);

        // Update application status to paid
        const { error: updateError } = await supabase
            .from('applications')
            .update({
                status: 'paid',
                payment_id: payment.id,
                updated_at: new Date().toISOString()
            })
            .eq('id', applicationId);

        if (updateError) throw updateError;

        // Log workflow transition
        await supabase.from('workflow_logs').insert({
            application_id: applicationId,
            from_status: 'payment_required',
            to_status: 'paid',
            action: 'payment_completed',
            notes: `Payment ${paymentNumber} completed`,
            performed_by: profile.id
        });

        // Create activity log
        await createActivityLog(profile.id, 'payment_completed',
            `Payment ${paymentNumber} completed for application ${application.application_number}`,
            { application_id: applicationId, payment_id: payment.id, amount, receipt_number: receiptNumber });

        // Create audit log
        await createAuditLog(profile.id, 'INSERT', 'payments', payment.id,
            null, { status: 'completed', amount, application_id: applicationId });

        // Notify agent
        await createNotification(profile.id,
            'Payment Successful',
            `Payment of ${amount.toLocaleString()} SSP received for ${application.application_number}. Awaiting revenue officer verification.`,
            'success', applicationId, 'application');

        // Notify revenue officers
        await notifyRevenueOfficers(applicationId, application.application_number, amount);

        console.log('Payment processed:', paymentNumber);

        return { success: true, data: payment, receipt_number: receiptNumber };
    } catch (error) {
        console.error('Error processing payment:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// GET PAYMENT STATUS
// ================================================================

async function getApplicationPaymentStatus(applicationId) {
    try {
        const { data: payment, error } = await supabase
            .from('payments')
            .select('*')
            .eq('application_id', applicationId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        return { success: true, data: payment };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ================================================================
// GET INVOICE FOR APPLICATION
// ================================================================

async function getInvoiceForApplication(applicationId) {
    try {
        const { data, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('application_id', applicationId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ================================================================
// NUMBER GENERATORS
// ================================================================

async function generatePaymentNumber() {
    const ts = Date.now().toString().slice(-8);
    return `PAY-${ts}`;
}

async function generateReceiptNumber() {
    const ts = Date.now().toString().slice(-8);
    return `RCP-${ts}`;
}

function generateTransactionId() {
    return 'TXN' + Date.now().toString(36).toUpperCase();
}

// ================================================================
// UTILITY FUNCTIONS
// ================================================================

async function createNotification(userId, title, message, type = 'info', referenceId = null, referenceType = null) {
    try {
        await supabase.from('notifications').insert({
            user_id: userId, title, message, type,
            reference_id: referenceId, reference_type: referenceType
        });
    } catch (err) {
        console.error('Error creating notification:', err);
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
    generateInvoice,
    processPayment,
    getApplicationPaymentStatus,
    getInvoiceForApplication
};
