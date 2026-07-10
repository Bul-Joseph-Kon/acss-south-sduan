// ================================================================
// REVENUE OFFICER SERVICE
// ================================================================
// Handles invoice generation, payment confirmation, and receipt generation
// ================================================================

import supabase from './supabase.js';
import { getCurrentUser, getUserProfile } from './auth.js';

// ================================================================
// REVENUE OFFICER FUNCTIONS
// ================================================================

async function getApprovedApplications() {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'supervisor') {
            throw new Error('User must be a revenue officer (supervisor role)');
        }

        const { data, error } = await supabase
            .from('applications')
            .select(`
                *,
                profiles:agent_id(full_name, email, phone),
                goods_data
            `)
            .eq('status', 'approved')
            .is('approved_at', null)
            .order('approved_at', { ascending: false });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Error fetching approved applications:', error);
        return { success: false, error: error.message };
    }
}

async function generateInvoice(applicationId) {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'supervisor') {
            throw new Error('User must be a revenue officer');
        }

        // Get application details
        const { data: application, error: fetchError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (fetchError) throw fetchError;

        // Calculate duties and taxes
        const goodsData = application.goods_data || {};
        const calculatedDuties = calculateDuties(goodsData);

        // Generate invoice number
        const invoiceNumber = await generateInvoiceNumber();

        // Create invoice
        const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .insert({
                application_id: applicationId,
                invoice_number: invoiceNumber,
                subtotal: calculatedDuties.subtotal,
                tax_amount: calculatedDuties.tax,
                total_amount: calculatedDuties.total,
                currency: 'SSP',
                due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
                status: 'pending',
                items: calculatedDuties.items,
                generated_by: profile.id,
                generated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (invoiceError) throw invoiceError;

        // Update application status to awaiting_payment
        await supabase
            .from('applications')
            .update({
                status: 'awaiting_payment',
                declared_value: calculatedDuties.total
            })
            .eq('id', applicationId);

        // Create activity log
        await createActivityLog(
            profile.id,
            'invoice_generated',
            `Invoice ${invoiceNumber} generated for application ${application.application_number}`,
            { application_id: applicationId, invoice_id: invoice.id, amount: calculatedDuties.total }
        );

        // Create audit log
        await createAuditLog(
            profile.id,
            'INSERT',
            'invoices',
            invoice.id,
            null,
            { invoice_number: invoiceNumber, total_amount: calculatedDuties.total }
        );

        // Notify agent
        await createNotification(
            application.agent_id,
            'Invoice Generated',
            `Invoice ${invoiceNumber} has been generated for your declaration ${application.application_number}. Amount: ${calculatedDuties.total} SSP`,
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

async function confirmPayment(applicationId, paymentData) {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'supervisor') {
            throw new Error('User must be a revenue officer');
        }

        // Get application and invoice
        const { data: application, error: appError } = await supabase
            .from('applications')
            .select('*, invoices(*)')
            .eq('id', applicationId)
            .single();

        if (appError) throw appError;

        const invoice = application.invoices && application.invoices[0];
        if (!invoice) {
            throw new Error('No invoice found for this application');
        }

        // Generate payment number and receipt number
        const paymentNumber = await generatePaymentNumber();
        const receiptNumber = await generateReceiptNumber();

        // Create payment record
        const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .insert({
                application_id: applicationId,
                user_id: application.agent_id,
                payment_number: paymentNumber,
                amount: invoice.total_amount,
                currency: invoice.currency,
                status: 'completed',
                payment_method: paymentData.payment_method || 'bank_transfer',
                transaction_id: paymentData.transaction_id,
                receipt_number: receiptNumber,
                paid_at: new Date().toISOString()
            })
            .select()
            .single();

        if (paymentError) throw paymentError;

        // Update invoice status
        await supabase
            .from('invoices')
            .update({
                status: 'paid',
                paid_at: new Date().toISOString()
            })
            .eq('id', invoice.id);

        // Update application status to paid
        await supabase
            .from('applications')
            .update({
                status: 'paid'
            })
            .eq('id', applicationId);

        // Create activity log
        await createActivityLog(
            profile.id,
            'payment_confirmed',
            `Payment ${paymentNumber} confirmed for application ${application.application_number}`,
            { application_id: applicationId, payment_id: payment.id, amount: payment.amount }
        );

        // Create audit log
        await createAuditLog(
            profile.id,
            'INSERT',
            'payments',
            payment.id,
            null,
            { payment_number: paymentNumber, amount: payment.amount, status: 'completed' }
        );

        // Notify agent
        await createNotification(
            application.agent_id,
            'Payment Confirmed',
            `Payment of ${payment.amount} SSP has been confirmed for declaration ${application.application_number}. Receipt: ${receiptNumber}`,
            'success',
            applicationId,
            'application'
        );

        // Trigger CVET and Cargo Release generation
        await generateCVETCertificate(applicationId);
        await generateCargoReleaseDocument(applicationId);

        console.log('Payment confirmed:', paymentNumber);
        return { success: true, data: payment };
    } catch (error) {
        console.error('Error confirming payment:', error);
        return { success: false, error: error.message };
    }
}

async function getPendingPayments() {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'supervisor') {
            throw new Error('User must be a revenue officer');
        }

        const { data, error } = await supabase
            .from('applications')
            .select(`
                *,
                profiles:agent_id(full_name, email, phone),
                invoices(*)
            `)
            .eq('status', 'awaiting_payment')
            .order('approved_at', { ascending: false });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Error fetching pending payments:', error);
        return { success: false, error: error.message };
    }
}

async function getRevenueStatistics() {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'supervisor') {
            throw new Error('User must be a revenue officer');
        }

        const [awaitingPaymentResult, paidResult, totalRevenue] = await Promise.all([
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'awaiting_payment'),
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
            supabase.from('payments').select('amount').eq('status', 'completed')
        ]);

        const revenue = totalRevenue.data ? totalRevenue.data.reduce((sum, p) => sum + (p.amount || 0), 0) : 0;

        return {
            success: true,
            statistics: {
                awaiting_payment: awaitingPaymentResult.count || 0,
                paid: paidResult.count || 0,
                total_revenue: revenue
            }
        };
    } catch (error) {
        console.error('Error fetching revenue statistics:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

function calculateDuties(goodsData) {
    // Calculate duties based on goods data
    // In production, this would use tariff codes from the database
    const customsDuty = goodsData.customs_value || 0;
    const dutyRate = 0.15; // 15% duty rate
    const vatRate = 0.15; // 15% VAT
    const processingFee = 2500; // Fixed processing fee

    const dutyAmount = customsDuty * dutyRate;
    const vatAmount = (customsDuty + dutyAmount) * vatRate;
    const subtotal = customsDuty + dutyAmount;
    const total = subtotal + vatAmount + processingFee;

    return {
        subtotal,
        tax: vatAmount,
        total,
        items: [
            { description: 'Customs Duty', amount: dutyAmount },
            { description: 'VAT (15%)', amount: vatAmount },
            { description: 'Processing Fee', amount: processingFee }
        ]
    };
}

async function generateInvoiceNumber() {
    const timestamp = Date.now().toString().slice(-6);
    return `INV-${timestamp}`;
}

async function generatePaymentNumber() {
    const timestamp = Date.now().toString().slice(-6);
    return `PAY-${timestamp}`;
}

async function generateReceiptNumber() {
    const timestamp = Date.now().toString().slice(-6);
    return `RCT-${timestamp}`;
}

async function generateCVETCertificate(applicationId) {
    try {
        // Get application details
        const { data: application } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (!application) throw new Error('Application not found');

        // Generate certificate number
        const certificateNumber = `CVET-${Date.now().toString().slice(-6)}`;
        
        // Generate QR code (simplified - in production would use QR library)
        const qrCode = `https://ssra.gov.ss/verify/${certificateNumber}`;

        // Create CVET certificate
        const { data: certificate, error } = await supabase
            .from('cvet_certificates')
            .insert({
                application_id: applicationId,
                certificate_number: certificateNumber,
                qr_code: qrCode,
                issued_by: application.agent_id,
                issued_at: new Date().toISOString(),
                valid_from: new Date().toISOString().split('T')[0],
                valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year
                certificate_data: {
                    application_number: application.application_number,
                    goods_data: application.goods_data,
                    declaration_data: application.declaration_data
                },
                status: 'active'
            })
            .select()
            .single();

        if (error) throw error;

        // Update application status to completed
        await supabase
            .from('applications')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', applicationId);

        // Create activity log
        await createActivityLog(
            null,
            'cvet_generated',
            `CVET certificate ${certificateNumber} generated for application ${application.application_number}`,
            { application_id: applicationId, certificate_id: certificate.id }
        );

        // Notify agent
        await createNotification(
            application.agent_id,
            'CVET Certificate Generated',
            `Your CVET certificate ${certificateNumber} has been generated. You can now download it.`,
            'success',
            applicationId,
            'application'
        );

        console.log('CVET generated:', certificateNumber);
        return certificate;
    } catch (error) {
        console.error('Error generating CVET:', error);
    }
}

async function generateCargoReleaseDocument(applicationId) {
    try {
        // Get application details
        const { data: application } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (!application) throw new Error('Application not found');

        // Generate release numbers
        const releaseNumber = `REL-${Date.now().toString().slice(-6)}`;
        const releaseOrderNumber = `RO-${Date.now().toString().slice(-6)}`;

        // Get port from declaration data
        const portOfRelease = application.declaration_data?.shipment?.port_of_entry || 'Juba';

        // Create cargo release document
        const { data: releaseDoc, error } = await supabase
            .from('cargo_release_documents')
            .insert({
                application_id: applicationId,
                release_number: releaseNumber,
                release_order_number: releaseOrderNumber,
                port_of_release: portOfRelease,
                release_date: new Date().toISOString(),
                released_by: application.agent_id,
                cargo_description: application.goods_data?.goods_description || 'Goods',
                quantity: application.goods_data?.quantity || 0,
                unit: application.goods_data?.unit_of_measurement || 'Kg',
                status: 'released'
            })
            .select()
            .single();

        if (error) throw error;

        // Create activity log
        await createActivityLog(
            null,
            'cargo_release_generated',
            `Cargo release document ${releaseNumber} generated for application ${application.application_number}`,
            { application_id: applicationId, release_id: releaseDoc.id }
        );

        // Notify agent
        await createNotification(
            application.agent_id,
            'Cargo Release Document Generated',
            `Your cargo release document ${releaseNumber} has been generated. Cargo is ready for release.`,
            'success',
            applicationId,
            'application'
        );

        console.log('Cargo release generated:', releaseNumber);
        return releaseDoc;
    } catch (error) {
        console.error('Error generating cargo release:', error);
    }
}

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

// ================================================================
// EXPORTS
// ================================================================

export {
    getApprovedApplications,
    generateInvoice,
    confirmPayment,
    getPendingPayments,
    getRevenueStatistics
};
