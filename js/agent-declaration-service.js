// ================================================================
// AGENT DECLARATION SERVICE
// ================================================================
// Handles customs declaration creation, draft saving, and submission
// ================================================================

import supabase from './supabase.js';
import { AIValidationService } from './services/ai/aiValidationService.js';
import { getCurrentUser, getUserProfile } from './auth.js';
import { performAIValidation } from './ai-validation-service.js';

// ================================================================
// STATE MANAGEMENT
// ================================================================

let currentApplication = null;
let draftData = {
    declarant: null,
    shipment: null,
    goods: null,
    documents: null
};

// ================================================================
// APPLICATION CREATION
// ================================================================

async function createNewDeclaration(applicationType = 'cvet') {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'agent') {
            throw new Error('User must be an agent to create declarations');
        }

        // Generate application number
        const applicationNumber = await generateApplicationNumber(applicationType);

        const { data, error } = await supabase
            .from('applications')
            .insert({
                application_number: applicationNumber,
                user_id: profile.id, // Agent acts as user for their own declarations
                agent_id: profile.id,
                application_type: applicationType,
                status: 'draft',
                declaration_data: {},
                goods_data: {},
                vehicle_data: {}
            })
            .select()
            .single();

        if (error) throw error;

        currentApplication = data;
        draftData = {
            declarant: null,
            shipment: null,
            goods: null,
            documents: null
        };

        console.log('Created new declaration:', applicationNumber);
        return { success: true, data };
    } catch (error) {
        console.error('Error creating declaration:', error);
        return { success: false, error: error.message };
    }
}

async function generateApplicationNumber(type) {
    const prefix = type === 'cvet' ? 'CVET' : type === 'direct_assessment' ? 'ASSESS' : 'APP';
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${timestamp}`;
}

// ================================================================
// DRAFT SAVING
// ================================================================

async function saveDraft(step, data) {
    try {
        if (!currentApplication) {
            const result = await createNewDeclaration();
            if (!result.success) {
                throw new Error('Failed to create application');
            }
        }

        // Update draft data for the current step
        draftData[step] = data;

        // Update application in Supabase
        const updateData = {};
        if (step === 1 || step === 'declarant') {
            // Step 1: Declaration Information
            updateData.declaration_data = { ...currentApplication.declaration_data, ...data };
        } else if (step === 2 || step === 'shipment') {
            // Step 2: Importer/Exporter Information
            updateData.declaration_data = {
                ...currentApplication.declaration_data,
                ...data
            };
        } else if (step === 3 || step === 'consignment') {
            // Step 3: Consignment Information
            updateData.declaration_data = {
                ...currentApplication.declaration_data,
                ...data
            };
        } else if (step === 4 || step === 'goods') {
            // Step 4: Goods - goods are stored in application_goods table
            updateData.goods_data = data;
        } else if (step === 5 || step === 'documents') {
            // Step 5: Documents
            updateData.declaration_data = {
                ...currentApplication.declaration_data,
                documents: data
            };
        }

        console.log('Updating application:', currentApplication.id, updateData);

        const { data: updatedApp, error } = await supabase
            .from('applications')
            .update(updateData)
            .eq('id', currentApplication.id)
            .select()
            .single();

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }
        if (!updatedApp) {
            console.error('No application returned from update');
            throw new Error('Application not found or update failed');
        }

        currentApplication = updatedApp;
        console.log(`Saved draft for step: ${step}`);
        return { success: true, data: updatedApp };
    } catch (error) {
        console.error('Error saving draft:', error);
        return { success: false, error: error.message };
    }
}

async function loadDraft(applicationId) {
    try {
        const { data, error } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (error) throw error;

        currentApplication = data;
        
        // Parse draft data from application
        if (data.declaration_data) {
            draftData.declarant = data.declaration_data;
            draftData.shipment = data.declaration_data.shipment || null;
            draftData.documents = data.declaration_data.documents || null;
        }
        draftData.goods = data.goods_data || null;

        return { success: true, data };
    } catch (error) {
        console.error('Error loading draft:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// SUBMISSION
// ================================================================

async function submitDeclaration() {
    try {
        if (!currentApplication) {
            throw new Error('No active application to submit');
        }

        // Validate required data - check for numeric step keys
        if (!draftData[1] || !draftData[2] || !draftData[3] || !draftData[4]) {
            throw new Error('Missing required data. Please complete all steps.');
        }

        // Update status to submitted
        const { data: updatedApp, error } = await supabase
            .from('applications')
            .update({
                status: 'submitted',
                submitted_at: new Date().toISOString(),
                declaration_data: {
                    ...currentApplication.declaration_data,
                    ...draftData[1],  // Step 1: declaration_info
                    ...draftData[2],  // Step 2: importer_exporter
                    ...draftData[3],  // Step 3: consignment
                    documents: draftData[5]?.documents || null  // Step 5: documents
                },
                goods_data: draftData[4]  // Step 4: goods
            })
            .eq('id', currentApplication.id)
            .select()
            .single();

        if (error) throw error;

        currentApplication = updatedApp;

        // Perform AI validation
        const aiValidationService = new AIValidationService();
        const existingApplications = await getExistingApplications(currentApplication.agent_id);
        const validationResult = await aiValidationService.validateApplication(currentApplication, existingApplications);

        // Save AI validation results to database
        if (validationResult.success) {
            await saveAIValidationResults(validationResult.report, currentApplication.id);
            
            // Update application status based on AI validation
            const newStatus = validationResult.validationPassed ? 'pending_review' : 'returned';
            await updateApplicationStatus(currentApplication.id, newStatus);
        }

        // Create activity log
        await createActivityLog(
            currentApplication.agent_id,
            'declaration_submitted',
            `Declaration ${currentApplication.application_number} submitted for AI validation`,
            { application_id: currentApplication.id }
        );

        // Create audit log
        await createAuditLog(
            currentApplication.agent_id,
            'UPDATE',
            'applications',
            currentApplication.id,
            { status: 'draft' },
            { status: 'submitted' }
        );

        // Create notification for agent
        await createNotification(
            currentApplication.agent_id,
            'Declaration Submitted',
            `Your declaration ${currentApplication.application_number} has been submitted successfully. AI validation in progress.`,
            'success',
            currentApplication.id,
            'application'
        );

        console.log('Declaration submitted:', currentApplication.application_number);

        // Trigger AI validation automatically
        const aiResult = await performAIValidation(currentApplication.id);
        
        // Handle AI routing decision
        if (aiResult.success) {
            if (aiResult.routing_decision === 'passed') {
                // AI Validation Passed - Notify Customs Officers
                await notifyCustomsOfficers(currentApplication, aiResult);
            } else if (aiResult.routing_decision === 'validation_errors') {
                // AI Validation Errors - Notify Agent with report
                await notifyAgentOfFailure(currentApplication, aiResult);
            } else if (aiResult.routing_decision === 'high_risk') {
                // High Risk Detected - Notify Customs Officers as High Priority
                await notifyCustomsOfficersHighRisk(currentApplication, aiResult);
            }
        }

        return { success: true, data: updatedApp, aiValidation: aiResult };
    } catch (error) {
        console.error('Error submitting declaration:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// NOTIFICATION FUNCTIONS
// ================================================================

async function notifyCustomsOfficers(application, aiResult) {
    try {
        // Get all customs officers
        const { data: officers } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('role', 'officer');
        
        if (officers) {
            for (const officer of officers) {
                await createNotification(
                    officer.id,
                    'New Declaration for Review',
                    `Declaration ${application.application_number} has passed AI validation and is ready for review. Risk Level: ${aiResult.risk_level}`,
                    'info',
                    application.id,
                    'application'
                );
            }
        }
        
        console.log('Notified customs officers of passed declaration');
    } catch (error) {
        console.error('Error notifying officers:', error);
    }
}

async function notifyAgentOfFailure(application, aiResult) {
    try {
        await createNotification(
            application.agent_id,
            'Declaration Returned for Correction',
            `Declaration ${application.application_number} has been returned for correction. AI Validation Score: ${aiResult.validation_score}%. Please review the AI Validation Report and make necessary corrections.`,
            'warning',
            application.id,
            'application'
        );
        
        console.log('Notified agent of failed validation');
    } catch (error) {
        console.error('Error notifying agent:', error);
    }
}

async function notifyCustomsOfficersHighRisk(application, aiResult) {
    try {
        // Get all customs officers
        const { data: officers } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('role', 'officer');
        
        if (officers) {
            for (const officer of officers) {
                await createNotification(
                    officer.id,
                    '⚠️ HIGH RISK Declaration for Review',
                    `Declaration ${application.application_number} has been flagged as HIGH RISK by AI. Risk Level: ${aiResult.risk_level}. This requires immediate officer review. Please review the AI Risk Assessment Report.`,
                    'error',
                    application.id,
                    'application'
                );
            }
        }
        
        console.log('Notified customs officers of high-risk declaration');
    } catch (error) {
        console.error('Error notifying officers of high risk:', error);
    }
}

// ================================================================
// RESUBMISSION WORKFLOW
// ================================================================

async function resubmitDeclaration(applicationId) {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'agent') {
            throw new Error('User must be an agent to resubmit declarations');
        }

        // Fetch the application
        const { data: application, error: fetchError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (fetchError) throw fetchError;
        if (!application) throw new Error('Application not found');
        if (application.agent_id !== profile.id) {
            throw new Error('You can only resubmit your own declarations');
        }
        if (application.status !== 'returned') {
            throw new Error('Only returned declarations can be resubmitted');
        }

        // Update status to submitted
        const { data: updatedApp, error: updateError } = await supabase
            .from('applications')
            .update({
                status: 'submitted',
                resubmitted_at: new Date().toISOString(),
                resubmission_count: (application.resubmission_count || 0) + 1
            })
            .eq('id', applicationId)
            .select()
            .single();

        if (updateError) throw updateError;

        currentApplication = updatedApp;

        // Create activity log
        await createActivityLog(
            profile.id,
            'declaration_resubmitted',
            `Declaration ${updatedApp.application_number} resubmitted for AI validation`,
            { application_id: applicationId }
        );

        // Create audit log
        await createAuditLog(
            profile.id,
            'UPDATE',
            'applications',
            applicationId,
            { status: 'returned' },
            { status: 'submitted' }
        );

        // Create notification for agent
        await createNotification(
            profile.id,
            'Declaration Resubmitted',
            `Your declaration ${updatedApp.application_number} has been resubmitted successfully. AI validation in progress.`,
            'success',
            applicationId,
            'application'
        );

        console.log('Declaration resubmitted:', updatedApp.application_number);

        // Trigger AI validation automatically
        const aiResult = await performAIValidation(applicationId);
        
        // Handle AI routing decision
        if (aiResult.success) {
            if (aiResult.routing_decision === 'passed') {
                // AI Validation Passed - Notify Customs Officers
                await notifyCustomsOfficers(updatedApp, aiResult);
            } else if (aiResult.routing_decision === 'validation_errors') {
                // AI Validation Errors - Notify Agent with report
                await notifyAgentOfFailure(updatedApp, aiResult);
            } else if (aiResult.routing_decision === 'high_risk') {
                // High Risk Detected - Notify Customs Officers as High Priority
                await notifyCustomsOfficersHighRisk(updatedApp, aiResult);
            }
        }

        return { success: true, data: updatedApp, aiValidation: aiResult };
    } catch (error) {
        console.error('Error resubmitting declaration:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// APPLICATION RETRIEVAL
// ================================================================

async function getAgentApplications(filters = {}) {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        let query = supabase
            .from('applications')
            .select('*')
            .eq('agent_id', profile.id);

        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        if (filters.application_type) {
            query = query.eq('application_type', filters.application_type);
        }

        if (filters.limit) {
            query = query.limit(filters.limit);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Error fetching agent applications:', error);
        return { success: false, error: error.message };
    }
}

async function getApplicationById(applicationId) {
    try {
        const { data, error } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Error fetching application:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// PAYMENT & DOCUMENTS
// ================================================================

async function getApplicationPayments(applicationId) {
    try {
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('application_id', applicationId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Error fetching payments:', error);
        return { success: false, error: error.message };
    }
}

async function getApplicationDocuments(applicationId) {
    try {
        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('application_id', applicationId)
            .order('uploaded_at', { ascending: false });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Error fetching documents:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// PAYMENT
// ================================================================

async function completePayment(applicationId, paymentMethod, transactionReference = '') {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'agent') {
            throw new Error('User must be an agent to complete payment');
        }

        // Get application and invoice
        const { data: application, error: appError } = await supabase
            .from('applications')
            .select('*, invoices(*)')
            .eq('id', applicationId)
            .single();

        if (appError) throw appError;

        if (application.status !== 'awaiting_payment') {
            throw new Error('Application is not awaiting payment');
        }

        const invoice = application.invoices && application.invoices[0];
        if (!invoice) {
            throw new Error('No invoice found for this application');
        }

        // Generate payment number and receipt number
        const paymentNumber = `PAY-${Date.now().toString().slice(-8)}`;
        const receiptNumber = `RCP-${Date.now().toString().slice(-8)}`;

        // Create payment record
        const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .insert({
                application_id: applicationId,
                user_id: profile.id,
                payment_number: paymentNumber,
                amount: invoice.total_amount,
                currency: invoice.currency,
                status: 'paid',
                payment_method: paymentMethod || 'bank_transfer',
                transaction_reference: transactionReference,
                receipt_number: receiptNumber,
                paid_at: new Date().toISOString(),
                paid_by: profile.id
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
                status: 'paid',
                paid_at: new Date().toISOString()
            })
            .eq('id', applicationId);

        // Create activity log
        await createActivityLog(
            profile.id,
            'payment_completed',
            `Payment ${paymentNumber} completed for application ${application.application_number}`,
            { application_id: applicationId, payment_id: payment.id, amount: payment.amount }
        );

        // Create audit log
        await createAuditLog(
            profile.id,
            'UPDATE',
            'applications',
            applicationId,
            { status: 'awaiting_payment' },
            { status: 'paid' }
        );

        // Notify agent
        await createNotification(
            profile.id,
            'Payment Completed',
            `Payment of ${payment.amount} SSP has been completed for declaration ${application.application_number}. Receipt: ${receiptNumber}`,
            'success',
            applicationId,
            'application'
        );

        // Generate customs documents
        await generateCustomsDocuments(applicationId);

        // Update application status to completed
        await supabase
            .from('applications')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', applicationId);

        console.log('Payment completed:', paymentNumber);
        return { success: true, data: payment, receiptNumber };
    } catch (error) {
        console.error('Error completing payment:', error);
        return { success: false, error: error.message };
    }
}

async function generateCustomsDocuments(applicationId) {
    try {
        // Get application details
        const { data: application } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (!application) throw new Error('Application not found');

        // Generate CVET
        await generateCVETCertificate(applicationId, application);
        
        // Generate Cargo Release
        await generateCargoReleaseDocument(applicationId, application);
        
        // Generate Clearance Certificate
        await generateClearanceCertificate(applicationId, application);

        console.log('All customs documents generated for application:', applicationId);
    } catch (error) {
        console.error('Error generating customs documents:', error);
    }
}

async function generateCVETCertificate(applicationId, application) {
    try {
        const certificateNumber = `CVET-${Date.now().toString().slice(-8)}`;

        const { data: certificate, error } = await supabase
            .from('cvet_certificates')
            .insert({
                application_id: applicationId,
                certificate_number: certificateNumber,
                issued_at: new Date().toISOString(),
                status: 'issued'
            })
            .select()
            .single();

        if (error) throw error;

        // Create activity log
        await createActivityLog(
            application.agent_id,
            'cvet_generated',
            `CVET certificate ${certificateNumber} generated for application ${application.application_number}`,
            { application_id: applicationId, certificate_id: certificate.id }
        );

        // Notify agent
        await createNotification(
            application.agent_id,
            'CVET Certificate Generated',
            `Your CVET certificate ${certificateNumber} has been generated.`,
            'success',
            applicationId,
            'application'
        );

        return certificate;
    } catch (error) {
        console.error('Error generating CVET:', error);
    }
}

async function generateCargoReleaseDocument(applicationId, application) {
    try {
        const releaseNumber = `REL-${Date.now().toString().slice(-8)}`;
        const releaseOrderNumber = `RO-${Date.now().toString().slice(-8)}`;
        const portOfRelease = application.declaration_data?.shipment?.port_of_entry || 'Juba';

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
            application.agent_id,
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

        return releaseDoc;
    } catch (error) {
        console.error('Error generating cargo release:', error);
    }
}

async function generateClearanceCertificate(applicationId, application) {
    try {
        const certificateNumber = `CLR-${Date.now().toString().slice(-8)}`;

        const { data: certificate, error } = await supabase
            .from('clearance_certificates')
            .insert({
                application_id: applicationId,
                certificate_number: certificateNumber,
                issued_at: new Date().toISOString(),
                status: 'issued'
            })
            .select()
            .single();

        if (error) throw error;

        // Create activity log
        await createActivityLog(
            application.agent_id,
            'clearance_certificate_generated',
            `Clearance certificate ${certificateNumber} generated for application ${application.application_number}`,
            { application_id: applicationId, certificate_id: certificate.id }
        );

        // Notify agent
        await createNotification(
            application.agent_id,
            'Clearance Certificate Generated',
            `Your clearance certificate ${certificateNumber} has been generated.`,
            'success',
            applicationId,
            'application'
        );

        return certificate;
    } catch (error) {
        console.error('Error generating clearance certificate:', error);
    }
}

// ================================================================
// NOTIFICATIONS
// ================================================================

async function createNotification(userId, title, message, type = 'info', referenceId = null, referenceType = null) {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                title,
                message,
                type,
                reference_id: referenceId,
                reference_type: referenceType
            });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Error creating notification:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// UTILITY FUNCTIONS
// ================================================================

function getCurrentApplication() {
    return currentApplication;
}

function getDraftData() {
    return draftData;
}

function resetCurrentApplication() {
    currentApplication = null;
    draftData = {
        declarant: null,
        shipment: null,
        goods: null,
        documents: null
    };
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

async function getExistingApplications(agentId) {
    try {
        const { data, error } = await supabase
            .from('applications')
            .select('*')
            .eq('agent_id', agentId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching existing applications:', error);
        return [];
    }
}

async function saveAIValidationResults(report, applicationId) {
    try {
        const dbData = {
            application_id: applicationId,
            validation_status: report.summary.validationPassed ? 'completed' : 'failed',
            validation_passed: report.summary.validationPassed,
            validation_score: report.summary.overallRiskScore,
            ocr_processed: report.documentChecks.ocrProcessed,
            ocr_confidence: report.documentChecks.ocrConfidence,
            documents_verified: report.documentChecks.totalDocuments > 0,
            document_verification_score: report.documentChecks.overallScore,
            fraud_detected: report.fraudIndicators.fraudDetected,
            fraud_score: report.fraudIndicators.fraudRiskScore,
            risk_level: report.riskAssessment.riskLevel,
            hs_code_validated: report.hsCodeChecks.validCodes === report.hsCodeChecks.totalItems,
            hs_code_confidence: report.hsCodeChecks.averageConfidence,
            duty_calculated: false,
            ai_recommendation: report.recommendations.primary.type,
            ai_reasoning: report.recommendations.primary.reason,
            requires_manual_review: report.riskAssessment.requiresAdditionalReview,
            processed_at: report.summary.validatedAt,
            validation_report: JSON.stringify(report)
        };

        const { error } = await supabase
            .from('ai_validation_results')
            .insert(dbData);

        if (error) throw error;
    } catch (error) {
        console.error('Error saving AI validation results:', error);
    }
}

async function updateApplicationStatus(applicationId, newStatus) {
    try {
        const { error } = await supabase
            .from('applications')
            .update({ status: newStatus })
            .eq('id', applicationId);

        if (error) throw error;
    } catch (error) {
        console.error('Error updating application status:', error);
    }
}

async function deleteDraft(applicationId) {
    try {
        const user = await getCurrentUser();
        const profile = await getUserProfile(user?.id);

        if (!profile || (profile.role !== 'agent' && profile.role !== 'trader')) {
            throw new Error('User must be an agent or trader to delete draft declarations');
        }

        const { data: app, error: fetchError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (fetchError) throw fetchError;
        if (!app) throw new Error('Declaration not found');
        if (app.agent_id !== profile.id && app.user_id !== profile.id) {
            throw new Error('You can only delete your own declarations');
        }
        if (app.status !== 'draft') {
            throw new Error('Only draft declarations can be deleted');
        }

        const { error: deleteError } = await supabase
            .from('applications')
            .delete()
            .eq('id', applicationId);

        if (deleteError) throw deleteError;

        await createAuditLog(
            profile.id,
            'DELETE',
            'applications',
            applicationId,
            app,
            null
        );

        if (currentApplication && currentApplication.id === applicationId) {
            currentApplication = null;
        }

        return { success: true };
    } catch (error) {
        console.error('Error deleting draft declaration:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// EXPORTS
// ================================================================

export {
    createNewDeclaration,
    saveDraft,
    loadDraft,
    deleteDraft,
    submitDeclaration,
    resubmitDeclaration,
    getAgentApplications,
    getApplicationById,
    getApplicationPayments,
    getApplicationDocuments,
    completePayment,
    createNotification,
    getCurrentApplication,
    getDraftData,
    resetCurrentApplication
};

