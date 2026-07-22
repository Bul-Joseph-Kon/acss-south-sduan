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
    { id: 1, name: 'Declarant Information', page: 'declarant-information.html', fields: ['declaration_number', 'declaration_date', 'declaration_type', 'customs_office', 'port_of_entry', 'customs_procedure', 'importer_name', 'importer_tin', 'importer_address', 'importer_phone', 'exporter_name', 'exporter_country', 'exporter_address', 'declarant_role'] },
    { id: 2, name: 'Shipment Information', page: 'consignment-information.html', fields: ['consignment_number', 'bill_of_lading', 'country_of_origin', 'country_of_destination', 'invoice_number', 'invoice_date', 'invoice_value', 'currency', 'transport_mode', 'port_of_loading', 'port_of_discharge', 'vessel_name', 'voyage_number', 'expected_arrival_date'] },
    { id: 3, name: 'Goods Information', page: 'goods-information.html', fields: ['goods_description', 'hs_code', 'quantity', 'unit_of_measurement', 'gross_weight', 'net_weight', 'declared_value', 'currency'] },
    { id: 4, name: 'Upload Documents', page: 'documents.html', fields: ['invoice_document', 'packing_list', 'bill_of_lading_document', 'permits', 'certificate_of_origin', 'other_documents'] }
];

// ================================================================
// TRADER WORKFLOW STEPS CONFIGURATION (Separate from Agent workflow)
// ================================================================

const TRADER_STEPS = [
    { id: 1, name: 'Declaration Details', page: 'declaration-details.html', fields: ['declaration_date', 'declaration_type', 'customs_office', 'port_of_entry', 'customs_procedure'] },
    { id: 2, name: 'Declarant Information', page: 'declarant-information.html', fields: ['declarant_name', 'company_name', 'tin', 'business_reg_number'] },
    { id: 3, name: 'Parties Information', page: 'parties-information.html', fields: ['importer_name', 'importer_tin', 'importer_address', 'importer_country', 'importer_contact', 'exporter_name', 'exporter_country', 'exporter_address', 'exporter_contact'] },
    { id: 4, name: 'Shipment Information', page: 'consignment-information.html', fields: ['consignment_number', 'manifest_number', 'vessel_name', 'voyage_number', 'port_of_loading', 'port_of_discharge', 'expected_arrival_date'] },
    { id: 5, name: 'Goods Information', page: 'goods-information.html', fields: ['goods_description', 'hs_code', 'quantity', 'unit_of_measurement', 'gross_weight', 'net_weight', 'unit_value', 'declared_value', 'currency'] },
    { id: 6, name: 'Supporting Documents', page: 'supporting-documents.html', fields: ['packing_list', 'bill_of_lading', 'certificate_of_origin', 'import_permit', 'commercial_invoice', 'insurance_certificate', 'inspection_certificate', 'other_documents'] }
];

// ================================================================
// CVET WORKFLOW MANAGER CLASS
// ================================================================

export class CVETWorkflowManager {
    constructor(steps = CVET_STEPS) {
        this.applicationId = null;
        this.currentStep = 1;
        this.draftData = {};
        this.isNewApplication = true;
        this.steps = steps;
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
                // Flatten nested JSONB fields to top level for easy access
                const data = result.data;
                const flattenedData = {
                    ...data,
                    // Flatten declaration_data
                    declaration_date: data.declaration_data?.declaration_date,
                    declaration_type: data.declaration_data?.declaration_type,
                    customs_office: data.declaration_data?.customs_office,
                    port_of_entry: data.declaration_data?.port_of_entry,
                    customs_procedure: data.declaration_data?.customs_procedure,
                    declarant_name: data.declaration_data?.declarant_name,
                    company_name: data.declaration_data?.company_name,
                    tin: data.declaration_data?.tin,
                    business_reg_number: data.declaration_data?.business_reg_number,
                    customs_reg_number: data.declaration_data?.customs_reg_number,
                    national_id: data.declaration_data?.national_id,
                    nationality: data.declaration_data?.nationality,
                    email: data.declaration_data?.email,
                    phone: data.declaration_data?.phone,
                    physical_address: data.declaration_data?.physical_address,
                    // Flatten goods_data
                    importer_name: data.goods_data?.importer_name,
                    importer_tin: data.goods_data?.importer_tin,
                    importer_address: data.goods_data?.importer_address,
                    importer_country: data.goods_data?.importer_country,
                    importer_contact: data.goods_data?.importer_contact,
                    exporter_name: data.goods_data?.exporter_name,
                    exporter_tin: data.goods_data?.exporter_tin,
                    exporter_address: data.goods_data?.exporter_address,
                    exporter_country: data.goods_data?.exporter_country,
                    exporter_contact: data.goods_data?.exporter_contact,
                    consignor_name: data.goods_data?.consignor_name,
                    consignor_address: data.goods_data?.consignor_address,
                    consignor_country: data.goods_data?.consignor_country,
                    consignor_contact: data.goods_data?.consignor_contact,
                    consignee_name: data.goods_data?.consignee_name,
                    consignee_address: data.goods_data?.consignee_address,
                    consignee_country: data.goods_data?.consignee_country,
                    consignee_contact: data.goods_data?.consignee_contact,
                    consignment_number: data.goods_data?.consignment_number,
                    manifest_number: data.goods_data?.manifest_number,
                    vessel_name: data.goods_data?.vessel_name,
                    voyage_number: data.goods_data?.voyage_number,
                    port_of_loading: data.goods_data?.port_of_loading,
                    port_of_discharge: data.goods_data?.port_of_discharge,
                    country_of_origin: data.goods_data?.country_of_origin,
                    country_of_destination: data.goods_data?.country_of_destination,
                    transport_mode: data.goods_data?.transport_mode,
                    expected_arrival_date: data.goods_data?.expected_arrival_date,
                    goods_description: data.goods_data?.goods_description,
                    hs_code: data.goods_data?.hs_code,
                    quantity: data.goods_data?.quantity,
                    unit_of_measurement: data.goods_data?.unit_of_measurement,
                    gross_weight: data.goods_data?.gross_weight,
                    net_weight: data.goods_data?.net_weight,
                    unit_value: data.goods_data?.unit_value,
                    declared_value: data.goods_data?.declared_value,
                    currency: data.goods_data?.currency,
                    // Flatten vehicle_data
                    vehicle_registration: data.vehicle_data?.vehicle_registration,
                    vehicle_type: data.vehicle_data?.vehicle_type,
                    transport_company: data.vehicle_data?.transport_company,
                    transport_company_license: data.vehicle_data?.transport_company_license,
                    driver_name: data.vehicle_data?.driver_name,
                    driver_license: data.vehicle_data?.driver_license,
                    driver_phone: data.vehicle_data?.driver_phone,
                    driver_id: data.vehicle_data?.driver_id,
                    trailer_number: data.vehicle_data?.trailer_number,
                    // Flatten documents_data if exists
                    packing_list: data.documents_data?.packing_list,
                    bill_of_lading: data.documents_data?.bill_of_lading,
                    certificate_of_origin: data.documents_data?.certificate_of_origin,
                    import_permit: data.documents_data?.import_permit,
                    commercial_invoice: data.documents_data?.commercial_invoice,
                    insurance_certificate: data.documents_data?.insurance_certificate,
                    inspection_certificate: data.documents_data?.inspection_certificate,
                    other_documents: data.documents_data?.other_documents
                };
                this.draftData = flattenedData;
                this.currentStep = data.current_step || 1;
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
                    user_id: profile?.id,
                    agent_id: profile?.id,
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
                    },
                    documents_data: {
                        packing_list: this.draftData.packing_list,
                        bill_of_lading: this.draftData.bill_of_lading,
                        certificate_of_origin: this.draftData.certificate_of_origin,
                        import_permit: this.draftData.import_permit,
                        commercial_invoice: this.draftData.commercial_invoice,
                        insurance_certificate: this.draftData.insurance_certificate,
                        inspection_certificate: this.draftData.inspection_certificate,
                        other_documents: this.draftData.other_documents
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
                    },
                    documents_data: {
                        packing_list: this.draftData.packing_list,
                        bill_of_lading: this.draftData.bill_of_lading,
                        certificate_of_origin: this.draftData.certificate_of_origin,
                        import_permit: this.draftData.import_permit,
                        commercial_invoice: this.draftData.commercial_invoice,
                        insurance_certificate: this.draftData.insurance_certificate,
                        inspection_certificate: this.draftData.inspection_certificate,
                        other_documents: this.draftData.other_documents
                    }
                };

                let result = await updateTraderApplication(this.applicationId, {
                    ...structuredData,
                    current_step: this.currentStep
                });

                if (!result.success && (result.error?.includes('42501') || result.error?.includes('row-level security'))) {
                    console.warn('Legacy draft RLS mismatch on app saveDraft:', this.applicationId, 'Re-creating as fresh declaration...');
                    this.isNewApplication = true;
                    return await this.saveDraft(stepData);
                }

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
        if (stepNumber < 1 || stepNumber > this.steps.length) {
            return { success: false, error: 'Invalid step number' };
        }

        // Check if step is accessible (can only go to completed steps or next step)
        if (stepNumber > this.currentStep + 1) {
            return { success: false, error: 'Step not accessible yet' };
        }

        this.currentStep = stepNumber;
        return { success: true, currentStep: this.currentStep, step: this.steps[stepNumber - 1] };
    }

    nextStep() {
        if (this.currentStep >= this.steps.length) {
            return { success: false, error: 'Already at final step' };
        }

        this.currentStep++;
        return { success: true, currentStep: this.currentStep, step: this.steps[this.currentStep - 1] };
    }

    previousStep() {
        if (this.currentStep <= 1) {
            return { success: false, error: 'Already at first step' };
        }

        this.currentStep--;
        return { success: true, currentStep: this.currentStep, step: this.steps[this.currentStep - 1] };
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
            let result = await updateTraderApplication(this.applicationId, {
                status: 'submitted',
                submitted_at: new Date().toISOString()
            });

            if (!result.success && (result.error?.includes('42501') || result.error?.includes('row-level security'))) {
                console.warn('Legacy draft RLS mismatch on submit:', this.applicationId, 'Creating fresh declaration...');
                this.isNewApplication = true;
                const saveRes = await this.saveDraft({ status: 'submitted', submitted_at: new Date().toISOString() });
                if (saveRes.success && this.applicationId) {
                    result = await updateTraderApplication(this.applicationId, {
                        status: 'submitted',
                        submitted_at: new Date().toISOString()
                    });
                }
            }

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
        const step = this.steps[stepNumber - 1];
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
    // STATE GETTERS
    // ================================================================

    getState() {
        return {
            applicationId: this.applicationId,
            currentStep: this.currentStep,
            draftData: this.draftData,
            isNewApplication: this.isNewApplication,
            totalSteps: this.steps.length,
            progress: Math.round((this.currentStep / this.steps.length) * 100)
        };
    }

    getCurrentStep() {
        return this.steps[this.currentStep - 1];
    }

    getStep(stepNumber) {
        return this.steps[stepNumber - 1];
    }

    getAllSteps() {
        return this.steps;
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
let globalTraderWorkflow = null;

export function getWorkflow() {
    if (!globalWorkflow) {
        globalWorkflow = new CVETWorkflowManager(CVET_STEPS);
    }
    return globalWorkflow;
}

export function getTraderWorkflow() {
    if (!globalTraderWorkflow) {
        globalTraderWorkflow = new CVETWorkflowManager(TRADER_STEPS);
    }
    return globalTraderWorkflow;
}

export function resetWorkflow() {
    globalWorkflow = null;
    globalTraderWorkflow = null;
}

// ================================================================
// UTILITY FUNCTIONS
// ================================================================

export function getStepFromURL() {
    const url = window.location.pathname;
    
    // Check if this is a trader page
    if (url.includes('/trader/')) {
        const traderStepMap = {
            'declaration-details.html': 1,
            'declarant-information.html': 2,
            'parties-information.html': 3,
            'consignment-information.html': 4,
            'goods-information.html': 5,
            'supporting-documents.html': 6
        };

        for (const [page, step] of Object.entries(traderStepMap)) {
            if (url.includes(page)) {
                return step;
            }
        }
        return 1;
    }
    
    // Agent step map
    const agentStepMap = {
        'declarant-information.html': 1,
        'consignment-information.html': 2,
        'goods-information.html': 3,
        'documents.html': 4
    };

    for (const [page, step] of Object.entries(agentStepMap)) {
        if (url.includes(page)) {
            return step;
        }
    }

    return 1;
}

export function getStepURL(stepNumber, isTrader = false) {
    const steps = isTrader ? TRADER_STEPS : CVET_STEPS;
    const step = steps[stepNumber - 1];
    return step.page;
}

export async function initializeWorkflowFromURL() {
    const url = window.location.pathname;
    const isTrader = url.includes('/trader/');
    
    const workflow = isTrader ? getTraderWorkflow() : getWorkflow();
    const urlParams = new URLSearchParams(window.location.search);
    const applicationId = urlParams.get('id');

    await workflow.initialize(applicationId);

    // Sync current step with URL
    const urlStep = getStepFromURL();
    if (urlStep !== workflow.currentStep) {
        // Check if step is accessible (can only go to completed steps or next step)
        if (urlStep > workflow.currentStep + 1) {
            // Redirect to the current step
            const currentStepPage = getStepURL(workflow.currentStep, isTrader);
            const redirectUrl = applicationId ? `${currentStepPage}?id=${applicationId}` : currentStepPage;
            window.location.href = redirectUrl;
            return workflow.getState();
        }
        workflow.goToStep(urlStep);
    }

    return workflow.getState();
}
