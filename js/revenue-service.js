// ================================================================
// REVENUE OFFICER SERVICE
// ================================================================
// Handles invoice generation for approved applications
// Payment is completed by Clearing Agent
// ================================================================

import supabase from './supabase.js';
import { getCurrentUser, getUserProfile } from './auth.js';
import { generateCargoDocuments } from './cargo-release-service.js';

// ================================================================
// REVENUE OFFICER FUNCTIONS
// ================================================================

async function getApprovedApplications() {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'revenue') {
            throw new Error('User must be a revenue officer');
        }

        const { data, error } = await supabase
            .from('applications')
            .select(`
                *,
                agent_profile:profiles!agent_id(full_name, email, phone),
                goods_data
            `)
            .eq('status', 'approved')
            .is('invoice_id', null)
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

        if (!profile || profile.role !== 'revenue') {
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

        // Update application status to payment_required
        await supabase
            .from('applications')
            .update({
                status: 'payment_required',
                invoice_id: invoice.id,
                declared_value: calculatedDuties.total
            })
            .eq('id', applicationId);

        // Log workflow transition
        await supabase.from('workflow_logs').insert({
            application_id: applicationId,
            from_status: 'approved',
            to_status: 'payment_required',
            action: 'invoice_generated',
            notes: `Invoice ${invoiceNumber} generated`,
            performed_by: profile.id
        });

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

async function getAwaitingPaymentApplications() {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'revenue') {
            throw new Error('User must be a revenue officer');
        }

        const { data, error } = await supabase
            .from('applications')
            .select(`
                *,
                agent_profile:profiles!agent_id(full_name, email, phone),
                invoices(*),
                goods_data
            `)
            .eq('status', 'payment_required')
            .order('updated_at', { ascending: false });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Error fetching awaiting payment applications:', error);
        return { success: false, error: error.message };
    }
}

async function getPaidApplications() {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'revenue') {
            throw new Error('User must be a revenue officer');
        }

        const { data, error } = await supabase
            .from('applications')
            .select(`
                *,
                agent_profile:profiles!agent_id(full_name, email, phone),
                invoices(*),
                payments(*),
                goods_data
            `)
            .eq('status', 'paid')
            .order('paid_at', { ascending: false });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Error fetching paid applications:', error);
        return { success: false, error: error.message };
    }
}

async function getRevenueStatistics() {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'revenue') {
            throw new Error('User must be a revenue officer');
        }

        const [awaitingPaymentResult, paidResult, totalRevenue] = await Promise.all([
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'payment_required'),
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

async function verifyPayment(applicationId, notes) {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'revenue') {
            throw new Error('User must be a revenue officer');
        }

        // Get current application
        const { data: application, error: fetchError } = await supabase
            .from('applications')
            .select(`
                *,
                payments(*),
                invoices(*)
            `)
            .eq('id', applicationId)
            .single();

        if (fetchError) throw fetchError;
        if (!application) throw new Error('Application not found');
        if (application.status !== 'paid') throw new Error('Application must be in paid status for verification');

        // Update payment status to verified
        if (application.payment_id) {
            await supabase
                .from('payments')
                .update({
                    status: 'verified',
                    verified_by: profile.id,
                    verified_at: new Date().toISOString()
                })
                .eq('id', application.payment_id);
        }

        // Update application status to payment_verified
        const { data: updatedApp, error: updateError } = await supabase
            .from('applications')
            .update({
                status: 'payment_verified',
                updated_at: new Date().toISOString()
            })
            .eq('id', applicationId)
            .select()
            .single();

        if (updateError) throw updateError;

        // Log workflow transition
        await supabase.from('workflow_logs').insert({
            application_id: applicationId,
            from_status: 'paid',
            to_status: 'payment_verified',
            action: 'payment_verified',
            notes: notes || 'Payment verified by revenue officer',
            performed_by: profile.id
        });

        // Create activity log
        await createActivityLog(
            profile.id,
            'payment_verified',
            `Payment verified for application ${application.application_number}`,
            { application_id: applicationId, payment_id: application.payment_id }
        );

        // Create audit log
        await createAuditLog(
            profile.id,
            'UPDATE',
            'applications',
            applicationId,
            { status: 'paid' },
            { status: 'payment_verified' }
        );

        // Notify agent
        await createNotification(
            application.agent_id,
            'Payment Verified',
            `Your payment for declaration ${application.application_number} has been verified. Documents are being generated.`,
            'success',
            applicationId,
            'application'
        );

        // Trigger automatic document generation
        try {
            await generateCustomsDocuments(applicationId);
        } catch (docError) {
            console.error('Error generating documents:', docError);
            // Don't fail verification if document generation fails
        }

        console.log('Payment verified:', application.application_number);
        return { success: true, data: updatedApp };
    } catch (error) {
        console.error('Error verifying payment:', error);
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

async function generateCustomsDocuments(applicationId) {
    try {
        // Get application details
        const { data: application } = await supabase
            .from('applications')
            .select(`
                *,
                profiles:agent_id(full_name),
                payments(*),
                invoices(*)
            `)
            .eq('id', applicationId)
            .single();

        if (!application) throw new Error('Application not found');

        // Generate Receipt
        const receiptNumber = await generateReceiptNumber();
        const { data: receiptDoc, error: receiptError } = await supabase
            .from('generated_documents')
            .insert({
                application_id: applicationId,
                document_type: 'receipt',
                document_number: receiptNumber,
                generated_by: application.agent_id,
                generated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (receiptError) throw receiptError;

        // Generate CVET
        const cvetNumber = `CVET-${Date.now().toString().slice(-6)}`;
        const { data: cvetDoc, error: cvetError } = await supabase
            .from('generated_documents')
            .insert({
                application_id: applicationId,
                document_type: 'cvet',
                document_number: cvetNumber,
                generated_by: application.agent_id,
                generated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (cvetError) throw cvetError;

        // Generate Cargo Release Order
        const releaseNumber = `REL-${Date.now().toString().slice(-6)}`;
        const { data: releaseDoc, error: releaseError } = await supabase
            .from('generated_documents')
            .insert({
                application_id: applicationId,
                document_type: 'cargo_release_order',
                document_number: releaseNumber,
                generated_by: application.agent_id,
                generated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (releaseError) throw releaseError;

        // Generate Clearance Certificate
        const clearanceNumber = `CLR-${Date.now().toString().slice(-6)}`;
        const { data: clearanceDoc, error: clearanceError } = await supabase
            .from('generated_documents')
            .insert({
                application_id: applicationId,
                document_type: 'clearance_certificate',
                document_number: clearanceNumber,
                generated_by: application.agent_id,
                generated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (clearanceError) throw clearanceError;

        // Generate CVET, Cargo Release Order, and Clearance Certificate via Cargo Release Service
        await generateCargoDocuments(applicationId, application.agent_id || application.user_id);

        // Update application status to completed
        await supabase
            .from('applications')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                cleared_at: new Date().toISOString()
            })
            .eq('id', applicationId);

        // Log workflow transition
        await supabase.from('workflow_logs').insert({
            application_id: applicationId,
            from_status: 'payment_verified',
            to_status: 'completed',
            action: 'documents_generated',
            notes: 'All customs documents generated',
            performed_by: application.agent_id
        });

        // Create activity log
        await createActivityLog(
            application.agent_id,
            'documents_generated',
            `Customs documents generated for application ${application.application_number}`,
            {
                application_id: applicationId,
                documents: [receiptNumber, cvetNumber, releaseNumber, clearanceNumber]
            }
        );

        // Notify agent
        await createNotification(
            application.agent_id,
            'Documents Generated',
            `All customs documents have been generated for declaration ${application.application_number}. You can now download them.`,
            'success',
            applicationId,
            'application'
        );

        console.log('Customs documents generated:', application.application_number);
        return {
            success: true,
            documents: {
                receipt: receiptDoc,
                cvet: cvetDoc,
                cargo_release: releaseDoc,
                clearance: clearanceDoc
            }
        };
    } catch (error) {
        console.error('Error generating customs documents:', error);
        return { success: false, error: error.message };
    }
}

async function confirmPayment(applicationId, notes) {
    return verifyPayment(applicationId, notes);
}

async function rejectPayment(applicationId, rejectionReason) {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'revenue') {
            throw new Error('User must be a revenue officer');
        }

        const { data: application, error: fetchError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (fetchError) throw fetchError;
        if (!application) throw new Error('Application not found');

        if (application.payment_id) {
            await supabase
                .from('payments')
                .update({
                    status: 'rejected',
                    rejection_reason: rejectionReason,
                    updated_at: new Date().toISOString()
                })
                .eq('id', application.payment_id);
        }

        const { data: updatedApp, error: updateError } = await supabase
            .from('applications')
            .update({
                status: 'payment_required',
                updated_at: new Date().toISOString()
            })
            .eq('id', applicationId)
            .select()
            .single();

        if (updateError) throw updateError;

        await supabase.from('workflow_logs').insert({
            application_id: applicationId,
            from_status: application.status,
            to_status: 'payment_required',
            action: 'payment_rejected',
            notes: rejectionReason,
            performed_by: profile.id
        });

        await createActivityLog(
            profile.id,
            'payment_rejected',
            `Payment rejected for application ${application.application_number}: ${rejectionReason}`,
            { application_id: applicationId, rejection_reason: rejectionReason }
        );

        await createAuditLog(
            profile.id,
            'UPDATE',
            'applications',
            applicationId,
            { status: application.status },
            { status: 'payment_required', rejection_reason: rejectionReason }
        );

        await createNotification(
            application.agent_id,
            'Payment Rejected',
            `Your payment for declaration ${application.application_number} was rejected. Reason: ${rejectionReason}. Please resubmit valid payment details.`,
            'error',
            applicationId,
            'application'
        );

        return { success: true, data: updatedApp };
    } catch (error) {
        console.error('Error rejecting payment:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// EXPORT FUNCTIONS
// ================================================================

export {
    getApprovedApplications,
    generateInvoice,
    getAwaitingPaymentApplications,
    getPaidApplications,
    getRevenueStatistics,
    verifyPayment,
    confirmPayment,
    rejectPayment,
    generateCustomsDocuments
};

