// ================================================================
// AGENT DECLARATION SERVICE
// ================================================================
// Handles customs declaration creation, draft saving, and submission
// ================================================================

import supabase from './supabase.js';
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
        if (step === 'declarant') {
            updateData.declaration_data = { ...currentApplication.declaration_data, ...data };
        } else if (step === 'shipment') {
            updateData.declaration_data = { 
                ...currentApplication.declaration_data, 
                shipment: data 
            };
        } else if (step === 'goods') {
            updateData.goods_data = data;
        } else if (step === 'documents') {
            updateData.declaration_data = { 
                ...currentApplication.declaration_data, 
                documents: data 
            };
        }

        const { data: updatedApp, error } = await supabase
            .from('applications')
            .update(updateData)
            .eq('id', currentApplication.id)
            .select()
            .single();

        if (error) throw error;

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

        // Validate required data
        if (!draftData.declarant || !draftData.shipment || !draftData.goods) {
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
                    declarant: draftData.declarant,
                    shipment: draftData.shipment
                },
                goods_data: draftData.goods
            })
            .eq('id', currentApplication.id)
            .select()
            .single();

        if (error) throw error;

        currentApplication = updatedApp;

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

        return { success: true, data: updatedApp, aiValidation: aiResult };
    } catch (error) {
        console.error('Error submitting declaration:', error);
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

// ================================================================
// EXPORTS
// ================================================================

export {
    createNewDeclaration,
    saveDraft,
    loadDraft,
    submitDeclaration,
    getAgentApplications,
    getApplicationById,
    getApplicationPayments,
    getApplicationDocuments,
    createNotification,
    getCurrentApplication,
    getDraftData,
    resetCurrentApplication
};
