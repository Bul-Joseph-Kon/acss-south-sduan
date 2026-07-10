// ================================================================
// CVET WORKFLOW MANAGER MODULE
// ================================================================
// Handles multi-step CVET declaration workflow
// Manages draft state, step validation, and submission to Supabase
// ================================================================

import { createTraderApplication, updateTraderApplication, fetchTraderApplicationById } from './trader-service.js';
import { getCurrentUser, getUserProfile } from './auth.js';
import { logApplicationSubmission } from './logging-service.js';

// ================================================================
// CVET WORKFLOW STEPS CONFIGURATION
// ================================================================

const CVET_STEPS = [
    { id: 1, name: 'Declaration Details', page: 'declaration-details.html', fields: ['declaration_date', 'declaration_type', 'customs_office', 'port_of_entry', 'customs_procedure'] },
    { id: 2, name: 'Declarant Information', page: 'declarant-information.html', fields: ['declarant_name', 'company_name', 'tin', 'business_reg_number', 'customs_reg_number', 'national_id', 'nationality', 'email', 'phone', 'physical_address'] },
    { id: 3, name: 'Parties Information', page: 'parties-information.html', fields: ['importer_name', 'importer_tin', 'importer_address', 'importer_country', 'importer_contact', 'exporter_name', 'exporter_tin', 'exporter_address', 'exporter_country', 'exporter_contact', 'consignor_name', 'consignor_address', 'consignor_country', 'consignor_contact', 'consignee_name', 'consignee_address', 'consignee_country', 'consignee_contact'] },
    { id: 4, name: 'Shipment Information', page: 'shipment-information.html', fields: ['consignment_number', 'manifest_number', 'vessel_name', 'voyage_number', 'port_of_loading', 'port_of_discharge', 'country_of_origin', 'country_of_destination', 'transport_mode', 'expected_arrival_date'] },
    { id: 5, name: 'Goods Information', page: 'goods-information.html', fields: ['goods_description', 'hs_code', 'quantity', 'unit_of_measurement', 'gross_weight', 'net_weight', 'unit_value', 'declared_value', 'currency'] },
    { id: 6, name: 'Transport Information', page: 'transport-information.html', fields: ['vehicle_registration', 'vehicle_type', 'transport_company', 'transport_company_license', 'driver_name', 'driver_license', 'driver_phone', 'driver_id', 'trailer_number', 'transport_mode'] },
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
                const profile = await getUserProfile();
                const structuredData = {
                    application_type: 'CVET',
                    service_type: 'CVET Declaration',
                    status: 'draft',
                    current_step: this.currentStep,
                    // Set agent_id if the user is an agent
                    agent_id: profile?.role === 'agent' ? profile.id : null,
                    // Trader details from declarant information
                    trader_name: this.draftData.declarant_name || this.draftData.fullName,
                    trader_tin: this.draftData.tin || this.draftData.declarant_tin,
                    trader_address: this.draftData.physical_address || this.draftData.declarant_address,
                    trader_contact: this.draftData.phone || this.draftData.declarant_contact,
                    trader_email: this.draftData.email,
                    // Store all step data in JSONB fields
                    declaration_data: {
                        declaration_date: this.draftData.declaration_date,
                        declaration_type: this.draftData.declaration_type,
                        customs_office: this.draftData.customs_office,
                        port_of_entry: this.draftData.port_of_entry,
                        customs_procedure: this.draftData.customs_procedure,
                        declarant_name: this.draftData.declarant_name || this.draftData.fullName,
                        company_name: this.draftData.company_name,
                        tin: this.draftData.tin,
                        business_reg_number: this.draftData.business_reg_number,
                        customs_reg_number: this.draftData.customs_reg_number,
                        national_id: this.draftData.national_id,
                        nationality: this.draftData.nationality,
                        email: this.draftData.email,
                        phone: this.draftData.phone,
                        physical_address: this.draftData.physical_address
                    },
                    goods_data: {
                        importer_name: this.draftData.importer_name,
                        importer_tin: this.draftData.importer_tin,
                        importer_address: this.draftData.importer_address,
                        importer_country: this.draftData.importer_country,
                        importer_contact: this.draftData.importer_contact,
                        exporter_name: this.draftData.exporter_name,
                        exporter_tin: this.draftData.exporter_tin,
                        exporter_address: this.draftData.exporter_address,
                        exporter_country: this.draftData.exporter_country,
                        exporter_contact: this.draftData.exporter_contact,
                        consignor_name: this.draftData.consignor_name,
                        consignor_address: this.draftData.consignor_address,
                        consignor_country: this.draftData.consignor_country,
                        consignor_contact: this.draftData.consignor_contact,
                        consignee_name: this.draftData.consignee_name,
                        consignee_address: this.draftData.consignee_address,
                        consignee_country: this.draftData.consignee_country,
                        consignee_contact: this.draftData.consignee_contact,
                        consignment_number: this.draftData.consignment_number,
                        manifest_number: this.draftData.manifest_number,
                        vessel_name: this.draftData.vessel_name,
                        voyage_number: this.draftData.voyage_number,
                        port_of_loading: this.draftData.port_of_loading,
                        port_of_discharge: this.draftData.port_of_discharge,
                        country_of_origin: this.draftData.country_of_origin,
                        country_of_destination: this.draftData.country_of_destination,
                        transport_mode: this.draftData.transport_mode,
                        expected_arrival_date: this.draftData.expected_arrival_date,
                        goods_description: this.draftData.goods_description,
                        hs_code: this.draftData.hs_code,
                        quantity: this.draftData.quantity,
                        unit_of_measurement: this.draftData.unit_of_measurement,
                        gross_weight: this.draftData.gross_weight,
                        net_weight: this.draftData.net_weight,
                        unit_value: this.draftData.unit_value,
                        declared_value: this.draftData.declared_value,
                        currency: this.draftData.currency
                    },
                    vehicle_data: {
                        vehicle_registration: this.draftData.vehicle_registration,
                        vehicle_type: this.draftData.vehicle_type,
                        transport_company: this.draftData.transport_company,
                        transport_company_license: this.draftData.transport_company_license,
                        driver_name: this.draftData.driver_name,
                        driver_license: this.draftData.driver_license,
                        driver_phone: this.draftData.driver_phone,
                        driver_id: this.draftData.driver_id,
                        trailer_number: this.draftData.trailer_number,
                        transport_mode: this.draftData.transport_mode
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
                const profile = await getUserProfile();
                const structuredData = {
                    // Update trader details if present
                    trader_name: this.draftData.declarant_name || this.draftData.fullName,
                    trader_tin: this.draftData.tin || this.draftData.declarant_tin,
                    trader_address: this.draftData.physical_address || this.draftData.declarant_address,
                    trader_contact: this.draftData.phone || this.draftData.declarant_contact,
                    trader_email: this.draftData.email,
                    // Update JSONB fields with new data
                    declaration_data: {
                        declaration_date: this.draftData.declaration_date,
                        declaration_type: this.draftData.declaration_type,
                        customs_office: this.draftData.customs_office,
                        port_of_entry: this.draftData.port_of_entry,
                        customs_procedure: this.draftData.customs_procedure,
                        declarant_name: this.draftData.declarant_name || this.draftData.fullName,
                        company_name: this.draftData.company_name,
                        tin: this.draftData.tin,
                        business_reg_number: this.draftData.business_reg_number,
                        customs_reg_number: this.draftData.customs_reg_number,
                        national_id: this.draftData.national_id,
                        nationality: this.draftData.nationality,
                        email: this.draftData.email,
                        phone: this.draftData.phone,
                        physical_address: this.draftData.physical_address
                    },
                    goods_data: {
                        importer_name: this.draftData.importer_name,
                        importer_tin: this.draftData.importer_tin,
                        importer_address: this.draftData.importer_address,
                        importer_country: this.draftData.importer_country,
                        importer_contact: this.draftData.importer_contact,
                        exporter_name: this.draftData.exporter_name,
                        exporter_tin: this.draftData.exporter_tin,
                        exporter_address: this.draftData.exporter_address,
                        exporter_country: this.draftData.exporter_country,
                        exporter_contact: this.draftData.exporter_contact,
                        consignor_name: this.draftData.consignor_name,
                        consignor_address: this.draftData.consignor_address,
                        consignor_country: this.draftData.consignor_country,
                        consignor_contact: this.draftData.consignor_contact,
                        consignee_name: this.draftData.consignee_name,
                        consignee_address: this.draftData.consignee_address,
                        consignee_country: this.draftData.consignee_country,
                        consignee_contact: this.draftData.consignee_contact,
                        consignment_number: this.draftData.consignment_number,
                        manifest_number: this.draftData.manifest_number,
                        vessel_name: this.draftData.vessel_name,
                        voyage_number: this.draftData.voyage_number,
                        port_of_loading: this.draftData.port_of_loading,
                        port_of_discharge: this.draftData.port_of_discharge,
                        country_of_origin: this.draftData.country_of_origin,
                        country_of_destination: this.draftData.country_of_destination,
                        transport_mode: this.draftData.transport_mode,
                        expected_arrival_date: this.draftData.expected_arrival_date,
                        goods_description: this.draftData.goods_description,
                        hs_code: this.draftData.hs_code,
                        quantity: this.draftData.quantity,
                        unit_of_measurement: this.draftData.unit_of_measurement,
                        gross_weight: this.draftData.gross_weight,
                        net_weight: this.draftData.net_weight,
                        unit_value: this.draftData.unit_value,
                        declared_value: this.draftData.declared_value,
                        currency: this.draftData.currency
                    },
                    vehicle_data: {
                        vehicle_registration: this.draftData.vehicle_registration,
                        vehicle_type: this.draftData.vehicle_type,
                        transport_company: this.draftData.transport_company,
                        transport_company_license: this.draftData.transport_company_license,
                        driver_name: this.draftData.driver_name,
                        driver_license: this.draftData.driver_license,
                        driver_phone: this.draftData.driver_phone,
                        driver_id: this.draftData.driver_id,
                        trailer_number: this.draftData.trailer_number,
                        transport_mode: this.draftData.transport_mode
                    }
                };

                const result = await updateTraderApplication(this.applicationId, {
                    ...structuredData,
                    current_step: this.currentStep
                });
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
    // SUBMIT APPLICATION
    // ================================================================

    async submitApplication() {
        try {
            if (!this.applicationId) {
                return { success: false, error: 'No application to submit' };
            }

            const profile = await getUserProfile();
            if (!profile) {
                return { success: false, error: 'User profile not found' };
            }

            // Update application status to submitted
            const result = await updateTraderApplication(this.applicationId, {
                status: 'submitted',
                submitted_at: new Date().toISOString()
            });

            if (!result.success) {
                return result;
            }

            // Log the submission
            const applicationNumber = result.data?.application_number || this.draftData.application_number || 'Unknown';
            await logApplicationSubmission(this.applicationId, profile.id, applicationNumber);

            return { success: true, applicationId: this.applicationId, applicationNumber };
        } catch (error) {
            console.error('Error submitting application:', error);
            return { success: false, error: error.message };
        }
    }

    // Alias for submitApplication for backward compatibility
    async submitDeclaration() {
        return await this.submitApplication();
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
        // Check if step is accessible (can only go to completed steps or next step)
        if (urlStep > workflow.currentStep + 1) {
            // Redirect to the current step
            const currentStepPage = getStepURL(workflow.currentStep);
            const redirectUrl = applicationId ? `${currentStepPage}?id=${applicationId}` : currentStepPage;
            window.location.href = redirectUrl;
            return workflow.getState();
        }
        workflow.goToStep(urlStep);
    }

    return workflow.getState();
}
