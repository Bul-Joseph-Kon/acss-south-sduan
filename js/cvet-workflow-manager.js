// ================================================================
// CVET WORKFLOW MANAGER MODULE
// ================================================================
// Handles multi-step CVET declaration workflow
// Manages draft state, step validation, and submission to Supabase
// ================================================================

import { createTraderApplication, updateTraderApplication, fetchTraderApplicationById } from './trader-service.js';
import { getCurrentUser, getUserProfile } from './auth.js';

// ================================================================
// CVET WORKFLOW STEPS CONFIGURATION
// ================================================================

const CVET_STEPS = [
    { id: 1, name: 'Declaration Details', page: 'declaration-details.html', fields: ['declaration_type', 'customs_office', 'procedure_code', 'declaration_number'] },
    { id: 2, name: 'Declarant Information', page: 'declarant-information.html', fields: ['declarant_name', 'declarant_tin', 'declarant_address', 'declarant_contact'] },
    { id: 3, name: 'Parties Information', page: 'parties-information.html', fields: ['importer_name', 'importer_tin', 'exporter_name', 'exporter_address'] },
    { id: 4, name: 'Shipment Information', page: 'shipment-information.html', fields: ['consignment_number', 'manifest_number', 'vessel_name', 'voyage_number'] },
    { id: 5, name: 'Goods Information', page: 'goods-information.html', fields: ['goods_description', 'hs_code', 'quantity', 'weight', 'declared_value'] },
    { id: 6, name: 'Transport Information', page: 'transport-information.html', fields: ['vehicle_registration', 'transport_company', 'driver_name', 'driver_license'] },
    { id: 7, name: 'Supporting Documents', page: 'supporting-documents.html', fields: ['invoice_document', 'packing_list', 'bill_of_lading', 'permits'] },
    { id: 8, name: 'AI Validation', page: 'ai-validation.html', fields: ['validation_status', 'validation_score', 'validation_errors'] },
    { id: 9, name: 'Declaration Statement', page: 'declaration-statement.html', fields: ['declaration_accepted', 'electronic_signature', 'declaration_date'] }
];

// ================================================================
// CVET WORKFLOW MANAGER CLASS
// ================================================================

export class CVETWorkflowManager {
    constructor() {
        this.applicationId = null;
        this.currentStep = 1;
        this.draftData = {};
        this.isNewApplication = true;
    }

    // ================================================================
    // INITIALIZATION
    // ================================================================

    async initialize(applicationId = null) {
        if (applicationId) {
            this.applicationId = applicationId;
            this.isNewApplication = false;
            await this.loadDraft();
        } else {
            this.isNewApplication = true;
            this.draftData = {};
            this.currentStep = 1;
        }

        return this.getState();
    }

    // ================================================================
    // DRAFT MANAGEMENT
    // ================================================================

    async loadDraft() {
        if (!this.applicationId) return;

        try {
            const result = await fetchTraderApplicationById(this.applicationId);
            if (result.success && result.data) {
                this.draftData = result.data;
                this.currentStep = this.draftData.current_step || 1;
            }
        } catch (error) {
            console.error('Error loading draft:', error);
        }
    }

    async saveDraft(stepData) {
        this.draftData = { ...this.draftData, ...stepData, current_step: this.currentStep };

        if (this.isNewApplication) {
            // Create new application - structure data according to schema
            try {
                const structuredData = {
                    application_type: 'CVET',
                    status: 'draft',
                    declaration_data: {
                        declaration_type: this.draftData.declaration_type,
                        customs_office: this.draftData.customs_office,
                        procedure_code: this.draftData.procedure_code,
                        declaration_number: this.draftData.declaration_number,
                        declarant_name: this.draftData.declarant_name,
                        declarant_tin: this.draftData.declarant_tin,
                        declarant_address: this.draftData.declarant_address,
                        declarant_contact: this.draftData.declarant_contact,
                        importer_name: this.draftData.importer_name,
                        importer_tin: this.draftData.importer_tin,
                        exporter_name: this.draftData.exporter_name,
                        exporter_address: this.draftData.exporter_address,
                        consignment_number: this.draftData.consignment_number,
                        manifest_number: this.draftData.manifest_number,
                        vessel_name: this.draftData.vessel_name,
                        voyage_number: this.draftData.voyage_number,
                        goods_description: this.draftData.goods_description,
                        hs_code: this.draftData.hs_code,
                        quantity: this.draftData.quantity,
                        weight: this.draftData.weight,
                        declared_value: this.draftData.declared_value
                    }
                };

                const result = await createTraderApplication(structuredData);

                if (result.success) {
                    this.applicationId = result.data.id;
                    this.isNewApplication = false;
                    return { success: true, applicationId: this.applicationId };
                } else {
                    return { success: false, error: result.error };
                }
            } catch (error) {
                console.error('Error creating application:', error);
                return { success: false, error: error.message };
            }
        } else {
            // Update existing application
            try {
                const structuredData = {
                    declaration_data: {
                        declaration_type: this.draftData.declaration_type,
                        customs_office: this.draftData.customs_office,
                        procedure_code: this.draftData.procedure_code,
                        declaration_number: this.draftData.declaration_number,
                        declarant_name: this.draftData.declarant_name,
                        declarant_tin: this.draftData.declarant_tin,
                        declarant_address: this.draftData.declarant_address,
                        declarant_contact: this.draftData.declarant_contact,
                        importer_name: this.draftData.importer_name,
                        importer_tin: this.draftData.importer_tin,
                        exporter_name: this.draftData.exporter_name,
                        exporter_address: this.draftData.exporter_address,
                        consignment_number: this.draftData.consignment_number,
                        manifest_number: this.draftData.manifest_number,
                        vessel_name: this.draftData.vessel_name,
                        voyage_number: this.draftData.voyage_number,
                        goods_description: this.draftData.goods_description,
                        hs_code: this.draftData.hs_code,
                        quantity: this.draftData.quantity,
                        weight: this.draftData.weight,
                        declared_value: this.draftData.declared_value
                    }
                };

                const result = await updateTraderApplication(this.applicationId, structuredData);
                return result;
            } catch (error) {
                console.error('Error updating application:', error);
                return { success: false, error: error.message };
            }
        }
    }

    // ================================================================
    // STEP NAVIGATION
    // ================================================================

    goToStep(stepNumber) {
        if (stepNumber < 1 || stepNumber > CVET_STEPS.length) {
            return { success: false, error: 'Invalid step number' };
        }

        // Check if step is accessible (can only go to completed steps or next step)
        if (stepNumber > this.currentStep + 1) {
            return { success: false, error: 'Step not accessible yet' };
        }

        this.currentStep = stepNumber;
        return { success: true, currentStep: this.currentStep, step: CVET_STEPS[stepNumber - 1] };
    }

    nextStep() {
        if (this.currentStep >= CVET_STEPS.length) {
            return { success: false, error: 'Already at final step' };
        }

        this.currentStep++;
        return { success: true, currentStep: this.currentStep, step: CVET_STEPS[this.currentStep - 1] };
    }

    previousStep() {
        if (this.currentStep <= 1) {
            return { success: false, error: 'Already at first step' };
        }

        this.currentStep--;
        return { success: true, currentStep: this.currentStep, step: CVET_STEPS[this.currentStep - 1] };
    }

    // ================================================================
    // STEP VALIDATION
    // ================================================================

    validateStep(stepNumber, stepData) {
        const step = CVET_STEPS[stepNumber - 1];
        const missingFields = [];

        step.fields.forEach(field => {
            if (!stepData[field] || stepData[field].toString().trim() === '') {
                missingFields.push(field);
            }
        });

        if (missingFields.length > 0) {
            return { 
                success: false, 
                error: 'Required fields missing', 
                missingFields 
            };
        }

        return { success: true };
    }

    // ================================================================
    // SUBMISSION
    // ================================================================

    async submitDeclaration() {
        if (!this.applicationId) {
            return { success: false, error: 'No application to submit' };
        }

        // Validate all steps
        for (let i = 1; i <= CVET_STEPS.length; i++) {
            const validation = this.validateStep(i, this.draftData);
            if (!validation.success) {
                return { 
                    success: false, 
                    error: `Step ${i} validation failed`, 
                    details: validation 
                };
            }
        }

        // Submit the application
        try {
            const result = await updateTraderApplication(this.applicationId, {
                ...this.draftData,
                status: 'submitted',
                submitted_at: new Date().toISOString()
            });

            if (result.success) {
                this.draftData.status = 'submitted';
                this.draftData.submitted_at = new Date().toISOString();
            }

            return result;
        } catch (error) {
            console.error('Error submitting declaration:', error);
            return { success: false, error: error.message };
        }
    }

    // ================================================================
    // STATE GETTERS
    // ================================================================

    getState() {
        return {
            applicationId: this.applicationId,
            currentStep: this.currentStep,
            draftData: this.draftData,
            isNewApplication: this.isNewApplication,
            totalSteps: CVET_STEPS.length,
            progress: Math.round((this.currentStep / CVET_STEPS.length) * 100)
        };
    }

    getCurrentStep() {
        return CVET_STEPS[this.currentStep - 1];
    }

    getStep(stepNumber) {
        return CVET_STEPS[stepNumber - 1];
    }

    getAllSteps() {
        return CVET_STEPS;
    }

    getStepStatus(stepNumber) {
        if (stepNumber < this.currentStep) return 'done';
        if (stepNumber === this.currentStep) return 'current';
        return 'locked';
    }

    // ================================================================
    // RESET
    // ================================================================

    reset() {
        this.applicationId = null;
        this.currentStep = 1;
        this.draftData = {};
        this.isNewApplication = true;
    }
}

// ================================================================
// GLOBAL WORKFLOW INSTANCE
// ================================================================

let globalWorkflow = null;

export function getWorkflow() {
    if (!globalWorkflow) {
        globalWorkflow = new CVETWorkflowManager();
    }
    return globalWorkflow;
}

export function resetWorkflow() {
    globalWorkflow = null;
}

// ================================================================
// UTILITY FUNCTIONS
// ================================================================

export function getStepFromURL() {
    const url = window.location.pathname;
    const stepMap = {
        'declaration-details.html': 1,
        'declarant-information.html': 2,
        'parties-information.html': 3,
        'shipment-information.html': 4,
        'goods-information.html': 5,
        'transport-information.html': 6,
        'supporting-documents.html': 7,
        'ai-validation.html': 8,
        'declaration-statement.html': 9
    };

    for (const [page, step] of Object.entries(stepMap)) {
        if (url.includes(page)) {
            return step;
        }
    }

    return 1;
}

export function getStepURL(stepNumber) {
    const step = CVET_STEPS[stepNumber - 1];
    return step.page;
}

export async function initializeWorkflowFromURL() {
    const workflow = getWorkflow();
    const urlParams = new URLSearchParams(window.location.search);
    const applicationId = urlParams.get('id');

    await workflow.initialize(applicationId);

    // Sync current step with URL
    const urlStep = getStepFromURL();
    if (urlStep !== workflow.currentStep) {
        workflow.goToStep(urlStep);
    }

    return workflow.getState();
}
