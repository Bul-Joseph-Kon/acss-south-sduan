// ================================================================
// APPLICATIONS MODULE
// ================================================================
// Handles all application-related operations
// ================================================================

import supabase from './supabase.js';
import { fetchTable, fetchById, insertRecord, updateRecord, deleteRecord, countRecords } from './database.js';
import { getUserProfile } from './auth.js';
import { workflowTransitions, aiServices, aiRoutingRules } from './config.js';
import { comprehensiveApplicationValidation, updateApplicationStatusAfterValidation } from './ai-validation.js';

// ================================================================
// FETCH APPLICATIONS
// ================================================================

export async function fetchApplications(options = {}) {
    const { data: { user } } = await supabase.auth.getUser();
    const profile = user ? await getUserProfile(user.id) : null;
    
    const filters = options.filters || {};
    if (profile && !options.includeAll) {
        filters.user_id = profile.id;
    }

    return fetchTable('applications', {
        filters,
        orderBy: options.orderBy || { column: 'created_at', ascending: false },
        limit: options.limit
    });
}

// ================================================================
// FETCH APPLICATION BY ID
// ================================================================

export async function fetchApplicationById(id) {
    return fetchById('applications', id);
}

// ================================================================
// FETCH APPLICATION BY NUMBER
// ================================================================

export async function fetchApplicationByNumber(applicationNumber) {
    try {
        const { data, error } = await supabase
            .from('applications')
            .select('*')
            .eq('application_number', applicationNumber)
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Fetch application by number error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// CREATE APPLICATION
// ================================================================

export async function createApplication(applicationData) {
    const { data: { user } } = await supabase.auth.getUser();
    const profile = user ? await getUserProfile(user.id) : null;
    
    const newApplication = {
        ...applicationData,
        user_id: profile?.id,
        status: 'draft'
    };

    return insertRecord('applications', newApplication);
}

// ================================================================
// UPDATE APPLICATION
// ================================================================

export async function updateApplication(id, updates) {
    return updateRecord('applications', id, updates);
}

// ================================================================
// SUBMIT APPLICATION WITH COMPREHENSIVE AI VALIDATION
// ================================================================

export async function submitApplication(id) {
    try {
        console.log('=== SUBMITTING APPLICATION WITH COMPREHENSIVE AI VALIDATION ===');
        console.log('Application ID:', id);

        // Get application details
        const { data: application, error: fetchError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;
        if (!application) throw new Error('Application not found');

        // Run comprehensive AI validation
        console.log('Running comprehensive AI validation...');
        const validationResults = await comprehensiveApplicationValidation(id);

        // Update application status based on validation results
        const statusUpdate = await updateApplicationStatusAfterValidation(id, validationResults);

        if (!statusUpdate.success) {
            console.log('AI validation failed:', validationResults.errors);
            return {
                success: false,
                error: statusUpdate.error || 'AI validation failed',
                errors: validationResults.errors,
                warnings: validationResults.warnings,
                validationResults: validationResults
            };
        }

        console.log('Application submitted successfully. Status:', statusUpdate.status);
        return {
            success: true,
            status: statusUpdate.status,
            message: statusUpdate.message,
            validationResults: validationResults,
            warnings: validationResults.warnings
        };
    } catch (error) {
        console.error('Submit application error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// AI VALIDATION CHECK
// ================================================================

async function validateApplicationWithAI(application, aiResults) {
    const errors = [];
    const warnings = [];

    // Check required fields
    if (!application.application_type) errors.push('Application type is required');
    if (!application.declaration_type) errors.push('Declaration type is required');
    if (!application.origin_country) errors.push('Origin country is required');
    if (!application.destination_country) errors.push('Destination country is required');

    // Check if documents are uploaded
    if (!application.documents || application.documents.length === 0) {
        errors.push('At least one document must be uploaded');
    }

    // Check OCR results if available
    if (aiResults.ocr && aiResults.ocr.success) {
        if (aiResults.ocr.confidence < 0.85) {
            warnings.push('Document OCR confidence is below 85%');
        }
    }

    // Check for duplicate submissions
    const { data: duplicates } = await supabase
        .from('applications')
        .select('id, application_number')
        .eq('user_id', application.user_id)
        .eq('application_type', application.application_type)
        .neq('id', application.id)
        .eq('status', 'submitted')
        .limit(1);

    if (duplicates && duplicates.length > 0) {
        errors.push('Duplicate application detected');
    }

    // Check compliance
    if (application.declared_value && application.declared_value > 1000000) {
        warnings.push('High-value declaration requires additional review');
    }

    return {
        success: errors.length === 0,
        errors,
        warnings
    };
}

// ================================================================
// DELETE APPLICATION
// ================================================================

export async function deleteApplication(id) {
    return deleteRecord('applications', id);
}

// ================================================================
// FETCH APPLICATION ITEMS
// ================================================================

export async function fetchApplicationItems(applicationId) {
    try {
        const { data, error } = await supabase
            .from('application_items')
            .select('*')
            .eq('application_id', applicationId)
            .order('item_number', { ascending: true });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Fetch application items error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// ADD APPLICATION ITEM
// ================================================================

export async function addApplicationItem(applicationId, itemData) {
    try {
        const { data, error } = await supabase
            .from('application_items')
            .insert({
                application_id: applicationId,
                ...itemData
            })
            .select()
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Add application item error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// UPDATE APPLICATION ITEM
// ================================================================

export async function updateApplicationItem(id, updates) {
    return updateRecord('application_items', id, updates);
}

// ================================================================
// DELETE APPLICATION ITEM
// ================================================================

export async function deleteApplicationItem(id) {
    return deleteRecord('application_items', id);
}

// ================================================================
// FETCH APPLICATION STATISTICS
// ================================================================

export async function fetchApplicationStatistics() {
    const { data: { user } } = await supabase.auth.getUser();
    const profile = user ? await getUserProfile(user.id) : null;
    
    const filters = profile ? { user_id: profile.id } : {};

    const [totalResult, pendingResult, approvedResult, rejectedResult] = await Promise.all([
        countRecords('applications', filters),
        countRecords('applications', { ...filters, status: 'pending_review' }),
        countRecords('applications', { ...filters, status: 'approved' }),
        countRecords('applications', { ...filters, status: 'rejected' })
    ]);

    return {
        total: totalResult.success ? totalResult.count : 0,
        pending: pendingResult.success ? pendingResult.count : 0,
        approved: approvedResult.success ? approvedResult.count : 0,
        rejected: rejectedResult.success ? rejectedResult.count : 0
    };
}

// ================================================================
// SEARCH APPLICATIONS
// ================================================================

export async function searchApplications(searchTerm) {
    try {
        const { data, error } = await supabase
            .from('applications')
            .select('*')
            .or(`application_number.ilike.%${searchTerm}%,application_type.ilike.%${searchTerm}%`);

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Search applications error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// FETCH APPLICATIONS BY STATUS
// ================================================================

export async function fetchApplicationsByStatus(status, options = {}) {
    return fetchTable('applications', {
        filters: { status },
        orderBy: options.orderBy || { column: 'created_at', ascending: false },
        limit: options.limit
    });
}

// ================================================================
// ASSIGN OFFICER TO APPLICATION
// ================================================================

export async function assignOfficer(applicationId, officerId) {
    return updateApplication(applicationId, {
        officer_id: officerId,
        status: 'pending_review'
    });
}

// ================================================================
// ASSIGN INSPECTOR TO APPLICATION
// ================================================================

export async function assignInspector(applicationId, inspectorId) {
    return updateApplication(applicationId, {
        inspector_id: inspectorId,
        status: 'under_inspection'
    });
}

// ================================================================
// UPDATE APPLICATION STATUS
// ================================================================

export async function updateApplicationStatus(applicationId, status, reason = null) {
    const updates = { status };
    
    if (status === 'approved') {
        updates.approved_at = new Date().toISOString();
    } else if (status === 'rejected') {
        updates.rejection_reason = reason;
    } else if (status === 'returned') {
        updates.return_reason = reason;
    }

    return updateApplication(applicationId, updates);
}

// ================================================================
// WORKFLOW TRANSITION VALIDATION
// ================================================================

export function canTransitionStatus(currentStatus, newStatus, userRole) {
    const roleTransitions = workflowTransitions[userRole];
    if (!roleTransitions) return false;

    const allowedTransitions = roleTransitions[currentStatus];
    if (!allowedTransitions) return false;

    return allowedTransitions.includes(newStatus);
}

// ================================================================
// TRANSITION APPLICATION STATUS WITH VALIDATION
// ================================================================

export async function transitionApplicationStatus(applicationId, newStatus, userRole, reason = null) {
    try {
        // Get current application
        const { data: application, error: fetchError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (fetchError) throw fetchError;
        if (!application) throw new Error('Application not found');

        // Validate transition
        if (!canTransitionStatus(application.status, newStatus, userRole)) {
            throw new Error(`Cannot transition from ${application.status} to ${newStatus} for role ${userRole}`);
        }

        // Run AI monitoring at each stage
        const aiMonitoringResults = await runAIMonitoringForStage(newStatus, applicationId);

        // Check if AI detected any issues
        if (aiMonitoringResults.hasIssues) {
            console.log('AI monitoring detected issues:', aiMonitoringResults.issues);
            // Return application to appropriate stage
            const returnStatus = determineReturnStage(newStatus, aiMonitoringResults.issues);
            
            await updateApplication(applicationId, {
                status: returnStatus,
                return_reason: aiMonitoringResults.issues.join('; '),
                ai_monitoring_results: aiMonitoringResults
            });

            return {
                success: false,
                error: 'AI monitoring detected issues',
                issues: aiMonitoringResults.issues,
                aiResults: aiMonitoringResults,
                returnedTo: returnStatus
            };
        }

        // Update status
        const updates = { status: newStatus, ai_monitoring_results: aiMonitoringResults };
        
        if (newStatus === 'approved') {
            updates.approved_at = new Date().toISOString();
        } else if (newStatus === 'rejected') {
            updates.rejection_reason = reason;
        } else if (newStatus === 'returned') {
            updates.return_reason = reason;
        }

        const { data, error } = await supabase
            .from('applications')
            .update(updates)
            .eq('id', applicationId)
            .select()
            .single();

        if (error) throw error;

        return { success: true, data, aiMonitoringResults };
    } catch (error) {
        console.error('Transition application status error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// AI MONITORING THROUGHOUT WORKFLOW
// ================================================================

async function runAIMonitoringForStage(status, applicationId) {
    const issues = [];
    const warnings = [];
    let workflowStage = '';

    // Determine workflow stage based on status
    switch (status) {
        case 'pending_review':
            workflowStage = 'review';
            break;
        case 'under_inspection':
            workflowStage = 'inspection';
            break;
        case 'approved':
            workflowStage = 'revenue';
            break;
        case 'paid':
            workflowStage = 'payment';
            break;
        default:
            workflowStage = 'general';
    }

    // Get application details
    const { data: application } = await supabase
        .from('applications')
        .select('*')
        .eq('id', applicationId)
        .single();

    if (!application) {
        return { hasIssues: false, issues: [], warnings: [] };
    }

    // Run AI services based on workflow stage
    const aiResults = await triggerAIServicesForStage(workflowStage, applicationId);

    // Analyze AI results for issues
    if (aiResults.fraudDetection) {
        if (aiResults.fraudDetection.success && aiResults.fraudDetection.fraudScore > 70) {
            issues.push(`High fraud risk detected (score: ${aiResults.fraudDetection.fraudScore.toFixed(0)})`);
        }
    }

    if (aiResults.riskAssessment) {
        if (aiResults.riskAssessment.success && aiResults.riskAssessment.riskScore > 80) {
            issues.push(`High risk assessment (score: ${aiResults.riskAssessment.riskScore.toFixed(0)})`);
        }
    }

    if (workflowStage === 'inspection') {
        // Validate inspection data
        if (!application.inspection_report) {
            issues.push('Inspection report is missing');
        }
    }

    if (workflowStage === 'payment') {
        // Validate payment data
        if (!application.payment_amount || application.payment_amount <= 0) {
            issues.push('Invalid payment amount');
        }
    }

    return {
        hasIssues: issues.length > 0,
        issues,
        warnings,
        aiResults,
        workflowStage
    };
}

function determineReturnStage(currentStatus, issues) {
    // Determine where to return the application based on the type of issues
    if (issues.some(issue => issue.includes('fraud') || issue.includes('risk'))) {
        return 'returned'; // Return to trader for correction
    }
    if (issues.some(issue => issue.includes('inspection'))) {
        return 'under_inspection'; // Return to inspector
    }
    if (issues.some(issue => issue.includes('payment'))) {
        return 'awaiting_payment'; // Return for payment correction
    }
    return 'returned'; // Default to trader
}

// ================================================================
// FETCH APPLICATIONS FOR ROLE-BASED WORKFLOW
// ================================================================

export async function fetchApplicationsForRole(role, options = {}) {
    const { data: { user } } = await supabase.auth.getUser();
    const profile = user ? await getUserProfile(user.id) : null;
    
    let filters = options.filters || {};

    // Filter based on role and workflow
    switch (role) {
        case 'trader':
        case 'agent':
            // See their own applications
            if (profile && !options.includeAll) {
                filters.user_id = profile.id;
            }
            break;
        case 'officer':
            // See submitted applications awaiting review
            filters.status = ['submitted', 'pending_review'];
            break;
        case 'inspector':
            // See applications assigned to them for inspection
            filters.status = 'under_inspection';
            if (profile && !options.includeAll) {
                filters.inspector_id = profile.id;
            }
            break;
        case 'supervisor':
            // See applications pending final approval
            filters.status = 'pending_review';
            break;
        case 'revenue':
            // See approved applications awaiting payment
            filters.status = ['approved', 'awaiting_payment', 'paid'];
            break;
        case 'administrator':
            // See all applications
            break;
    }

    return fetchTable('applications', {
        filters,
        orderBy: options.orderBy || { column: 'created_at', ascending: false },
        limit: options.limit
    });
}

// ================================================================
// GET ALLOWED TRANSITIONS FOR ROLE
// ================================================================

export function getAllowedTransitions(currentStatus, userRole) {
    const roleTransitions = workflowTransitions[userRole];
    if (!roleTransitions) return [];

    return roleTransitions[currentStatus] || [];
}

// ================================================================
// AI SERVICE INTEGRATION
// ================================================================

export async function runOCRAnalysis(documentId) {
    try {
        console.log('=== RUNNING OCR ANALYSIS ===');
        console.log('Document ID:', documentId);

        // Simulate OCR processing
        const ocrService = aiServices.ocr;
        if (ocrService.status !== 'enabled') {
            throw new Error('OCR service is not enabled');
        }

        // In production, this would call an AI service API
        // For now, simulate the response
        const result = {
            success: true,
            extractedText: 'Simulated extracted text from document',
            confidence: ocrService.accuracy / 100,
            service: ocrService.name,
            version: ocrService.version
        };

        console.log('OCR Analysis Result:', result);
        return result;
    } catch (error) {
        console.error('OCR Analysis error:', error);
        return { success: false, error: error.message };
    }
}

export async function runFraudDetection(applicationId) {
    try {
        console.log('=== RUNNING FRAUD DETECTION ===');
        console.log('Application ID:', applicationId);

        const fraudService = aiServices.fraudDetection;
        if (fraudService.status !== 'enabled') {
            throw new Error('Fraud detection service is not enabled');
        }

        // In production, this would call an AI service API
        const result = {
            success: true,
            fraudScore: Math.random() * 100, // Simulated score
            riskLevel: 'low',
            flags: [],
            confidence: fraudService.accuracy / 100,
            service: fraudService.name,
            version: fraudService.version
        };

        console.log('Fraud Detection Result:', result);
        return result;
    } catch (error) {
        console.error('Fraud Detection error:', error);
        return { success: false, error: error.message };
    }
}

export async function runRiskAssessment(applicationId) {
    try {
        console.log('=== RUNNING RISK ASSESSMENT ===');
        console.log('Application ID:', applicationId);

        const riskService = aiServices.riskAssessment;
        if (riskService.status !== 'enabled') {
            throw new Error('Risk assessment service is not enabled');
        }

        // In production, this would call an AI service API
        const result = {
            success: true,
            riskScore: Math.random() * 100, // Simulated score
            riskCategory: 'low',
            factors: {
                documentation: 85,
                compliance: 90,
                history: 95
            },
            confidence: riskService.accuracy / 100,
            service: riskService.name,
            version: riskService.version
        };

        console.log('Risk Assessment Result:', result);
        return result;
    } catch (error) {
        console.error('Risk Assessment error:', error);
        return { success: false, error: error.message };
    }
}

export async function runDutyCalculation(applicationId) {
    try {
        console.log('=== RUNNING DUTY CALCULATION ===');
        console.log('Application ID:', applicationId);

        const dutyService = aiServices.dutyCalculation;
        if (dutyService.status === 'training') {
            console.warn('Duty calculation service is in training mode');
        }

        // In production, this would call an AI service API
        const result = {
            success: true,
            duties: {
                customsDuty: 0,
                vat: 0,
                fees: 0,
                total: 0
            },
            confidence: dutyService.accuracy / 100,
            service: dutyService.name,
            version: dutyService.version,
            status: dutyService.status
        };

        console.log('Duty Calculation Result:', result);
        return result;
    } catch (error) {
        console.error('Duty Calculation error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// TRIGGER AI SERVICES BY WORKFLOW STAGE
// ================================================================

export async function triggerAIServicesForStage(workflowStage, applicationId, documentId = null) {
    const results = {};

    switch (workflowStage) {
        case 'submission':
            // Run OCR when documents are uploaded
            if (documentId) {
                results.ocr = await runOCRAnalysis(documentId);
            }
            break;

        case 'review':
            // Run fraud detection and risk assessment when officer reviews
            results.fraudDetection = await runFraudDetection(applicationId);
            results.riskAssessment = await runRiskAssessment(applicationId);
            break;

        case 'revenue':
            // Run duty calculation when revenue officer processes
            results.dutyCalculation = await runDutyCalculation(applicationId);
            break;

        default:
            console.warn('Unknown workflow stage:', workflowStage);
    }

    return results;
}

// ================================================================
// GET AI SERVICE STATUS
// ================================================================

export function getAIServiceStatus(serviceName) {
    return aiServices[serviceName] || null;
}

export function getAllAIServices() {
    return aiServices;
}

// ================================================================
// AI-DRIVEN AUTOMATIC ROUTING
// ================================================================

export async function autoRouteApplication(applicationId, currentStatus) {
    try {
        console.log('=== AI-DRIVEN ROUTING ===');
        console.log('Application ID:', applicationId);
        console.log('Current Status:', currentStatus);

        const routingRule = aiRoutingRules[currentStatus];
        if (!routingRule || !routingRule.autoRoute) {
            console.log('No auto-routing rule for status:', currentStatus);
            return { success: false, message: 'No auto-routing rule for this status' };
        }

        // Get application details to check condition
        const { data: application } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (!application) {
            return { success: false, error: 'Application not found' };
        }

        // Check routing condition (simplified evaluation)
        const conditionMet = evaluateRoutingCondition(routingRule.condition, application);
        
        if (!conditionMet) {
            console.log('Routing condition not met:', routingRule.condition);
            return { success: false, message: 'Routing condition not met' };
        }

        // Prepare updates for routing
        const updates = { status: routingRule.nextStatus };
        
        // Assign to appropriate role if specified
        if (routingRule.assignTo) {
            const assignedUserId = await assignToAvailableUser(routingRule.assignTo);
            if (assignedUserId) {
                updates.assigned_to = assignedUserId;
                updates.assigned_role = routingRule.assignTo;
            }
        }

        // Update application
        const { data, error } = await supabase
            .from('applications')
            .update(updates)
            .eq('id', applicationId)
            .select()
            .single();

        if (error) throw error;

        console.log('Application auto-routed to:', routingRule.nextStatus);
        return { 
            success: true, 
            data, 
            routedTo: routingRule.nextStatus,
            assignedTo: routingRule.assignTo
        };
    } catch (error) {
        console.error('Auto-routing error:', error);
        return { success: false, error: error.message };
    }
}

function evaluateRoutingCondition(condition, application) {
    // Simplified condition evaluation
    // In production, this would be a more sophisticated expression evaluator
    
    if (condition.includes('ai_validation_passed')) {
        return application.ai_validation_passed === true;
    }
    if (condition.includes('officer_review_passed')) {
        return application.officer_review_passed === true;
    }
    if (condition.includes('inspection_passed')) {
        return application.inspection_passed === true;
    }
    if (condition.includes('supervisor_approved')) {
        return application.status === 'approved';
    }
    if (condition.includes('payment_verified')) {
        return application.payment_verified === true;
    }
    
    return false;
}

async function assignToAvailableUser(role) {
    try {
        // Find available user with the specified role
        const { data: users } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', role)
            .eq('status', 'active')
            .limit(1);

        if (users && users.length > 0) {
            return users[0].id;
        }
        return null;
    } catch (error) {
        console.error('Error finding available user:', error);
        return null;
    }
}

// ================================================================
// AI AUDIT LOGGING
// ================================================================

export async function logAIAction(actionType, applicationId, details, userId = null) {
    try {
        console.log('=== LOGGING AI ACTION ===');
        console.log('Action Type:', actionType);
        console.log('Application ID:', applicationId);

        const { data: { user } } = await supabase.auth.getUser();
        const actorUserId = userId || user?.id;

        const auditLog = {
            action_type: actionType,
            application_id: applicationId,
            user_id: actorUserId,
            details: JSON.stringify(details),
            timestamp: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('ai_audit_logs')
            .insert(auditLog)
            .select()
            .single();

        if (error) throw error;

        console.log('AI action logged:', auditLog);
        return { success: true, data };
    } catch (error) {
        console.error('Log AI action error:', error);
        return { success: false, error: error.message };
    }
}

export async function fetchAIAuditLogs(applicationId = null, options = {}) {
    try {
        let query = supabase
            .from('ai_audit_logs')
            .select('*')
            .order('timestamp', { ascending: false });

        if (applicationId) {
            query = query.eq('application_id', applicationId);
        }

        if (options.limit) {
            query = query.limit(options.limit);
        }

        const { data, error } = await query;

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Fetch AI audit logs error:', error);
        return { success: false, error: error.message };
    }
}




