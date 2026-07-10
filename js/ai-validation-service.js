// ================================================================
// AI VALIDATION SERVICE
// ================================================================
// Handles AI-powered validation including OCR, risk assessment, fraud detection
// ================================================================

import supabase from './supabase.js';
import { getCurrentUser, getUserProfile } from './auth.js';

// ================================================================
// AI VALIDATION FUNCTIONS
// ================================================================

async function performAIValidation(applicationId) {
    try {
        console.log('=== STARTING AI VALIDATION FOR APPLICATION:', applicationId, '===');
        
        // Get application data
        const { data: application, error: appError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();
        
        if (appError) throw appError;
        if (!application) throw new Error('Application not found');

        const startTime = Date.now();

        // Perform all validations in parallel
        const [ocrResult, docVerifyResult, hsCodeResult, fraudResult, complianceResult] = await Promise.all([
            performOCRValidation(applicationId, application),
            performDocumentVerification(applicationId, application),
            performHSCodeValidation(applicationId, application),
            performFraudDetection(applicationId, application),
            performComplianceCheck(applicationId, application)
        ]);

        const processingTime = Date.now() - startTime;

        // Calculate overall risk assessment
        const riskAssessment = await calculateRiskAssessment(applicationId, {
            ocr: ocrResult,
            document_verification: docVerifyResult,
            hs_code_validation: hsCodeResult,
            fraud_detection: fraudResult,
            compliance_check: complianceResult
        });

        // Update application with AI validation results
        const { error: updateError } = await supabase
            .from('applications')
            .update({
                ai_validation_passed: riskAssessment.overall_score >= 70,
                ai_validation_results: {
                    ocr: ocrResult,
                    document_verification: docVerifyResult,
                    hs_code_validation: hsCodeResult,
                    fraud_detection: fraudResult,
                    compliance_check: complianceResult,
                    risk_assessment: riskAssessment,
                    processing_time_ms: processingTime
                },
                updated_at: new Date().toISOString()
            })
            .eq('id', applicationId);

        if (updateError) throw updateError;

        // Create AI audit log
        await createAIAuditLog(applicationId, 'ai_validation_complete', {
            processing_time_ms: processingTime,
            overall_score: riskAssessment.overall_score,
            risk_level: riskAssessment.risk_level,
            validations: {
                ocr: ocrResult.status,
                document_verification: docVerifyResult.status,
                hs_code_validation: hsCodeResult.status,
                fraud_detection: fraudResult.status,
                compliance_check: complianceResult.status
            }
        });

        // Determine if validation passed
        const validationPassed = riskAssessment.overall_score >= 70 && 
                                  !ocrResult.failed && 
                                  !docVerifyResult.failed &&
                                  !fraudResult.failed;

        // Update application status based on validation result
        if (validationPassed) {
            await updateApplicationStatus(applicationId, 'pending_review', 'AI validation passed');
        } else {
            await updateApplicationStatus(applicationId, 'returned', 'AI validation failed');
            await notifyAgent(applicationId, application.agent_id, 'AI Validation Failed', 
                'Your declaration failed AI validation. Please review and resubmit.', 'error');
        }

        console.log('=== AI VALIDATION COMPLETE ===', { 
            applicationId, 
            passed: validationPassed, 
            score: riskAssessment.overall_score 
        });

        return { 
            success: true, 
            passed: validationPassed, 
            riskAssessment, 
            processingTime 
        };
    } catch (error) {
        console.error('AI Validation error:', error);
        await createAIAuditLog(applicationId, 'ai_validation_error', { error: error.message });
        return { success: false, error: error.message };
    }
}

async function performOCRValidation(applicationId, application) {
    try {
        // Simulate OCR processing - in production, this would call an OCR API
        const confidence = 0.95 + Math.random() * 0.04; // 95-99%
        const status = confidence > 0.9 ? 'passed' : 'warning';
        
        const result = {
            validation_type: 'ocr',
            status,
            confidence_score: confidence,
            results: {
                text_extracted: true,
                pages_processed: 4,
                fields_detected: 12
            },
            errors: [],
            warnings: confidence < 0.98 ? ['Some text has low confidence'] : []
        };

        // Store in ai_validation_results table
        await storeValidationResult(applicationId, result);

        return result;
    } catch (error) {
        return { validation_type: 'ocr', status: 'failed', errors: [error.message] };
    }
}

async function performDocumentVerification(applicationId, application) {
    try {
        // Verify required documents are present
        const { data: documents, error } = await supabase
            .from('documents')
            .select('*')
            .eq('application_id', applicationId);

        const requiredDocs = ['packing_list', 'bill_of_lading'];
        const uploadedDocs = documents ? documents.map(d => d.document_name.toLowerCase()) : [];
        
        const missingDocs = requiredDocs.filter(doc => 
            !uploadedDocs.some(uploaded => uploaded.includes(doc))
        );

        const status = missingDocs.length === 0 ? 'passed' : 'failed';
        
        const result = {
            validation_type: 'document_verification',
            status,
            confidence_score: missingDocs.length === 0 ? 1.0 : 0.5,
            results: {
                documents_verified: documents ? documents.length : 0,
                required_documents: requiredDocs,
                uploaded_documents: uploadedDocs,
                missing_documents: missingDocs
            },
            errors: missingDocs.length > 0 ? [`Missing documents: ${missingDocs.join(', ')}`] : [],
            warnings: []
        };

        await storeValidationResult(applicationId, result);
        return result;
    } catch (error) {
        return { validation_type: 'document_verification', status: 'failed', errors: [error.message] };
    }
}

async function performHSCodeValidation(applicationId, application) {
    try {
        const goodsData = application.goods_data || {};
        const hsCode = goodsData.hs_code;
        
        if (!hsCode) {
            return {
                validation_type: 'hs_code_validation',
                status: 'failed',
                errors: ['HS Code not provided']
            };
        }

        // Validate HS code format (4-10 digits)
        const hsCodePattern = /^\d{4,10}$/;
        const isValidFormat = hsCodePattern.test(hsCode);
        
        // Check against tariff codes table
        const { data: tariffCode } = await supabase
            .from('tariff_codes')
            .select('*')
            .eq('hs_code', hsCode.substring(0, 4))
            .single();

        const status = isValidFormat ? (tariffCode ? 'passed' : 'warning') : 'failed';
        
        const result = {
            validation_type: 'hs_code_validation',
            status,
            confidence_score: isValidFormat ? (tariffCode ? 1.0 : 0.7) : 0.0,
            results: {
                hs_code: hsCode,
                format_valid: isValidFormat,
                tariff_found: !!tariffCode,
                tariff_rate: tariffCode ? tariffCode.duty_rate : null
            },
            errors: !isValidFormat ? ['Invalid HS Code format'] : [],
            warnings: !tariffCode ? ['HS Code not found in tariff database'] : []
        };

        await storeValidationResult(applicationId, result);
        return result;
    } catch (error) {
        return { validation_type: 'hs_code_validation', status: 'failed', errors: [error.message] };
    }
}

async function performFraudDetection(applicationId, application) {
    try {
        // Simulate fraud detection checks
        const fraudIndicators = [];
        const warnings = [];
        
        // Check for duplicate applications
        const { data: duplicates } = await supabase
            .from('applications')
            .select('id, application_number')
            .neq('id', applicationId)
            .eq('agent_id', application.agent_id)
            .limit(10);

        if (duplicates && duplicates.length > 5) {
            warnings.push('High volume of recent applications');
        }

        // Check declared value anomalies
        const declaredValue = application.declared_value || 0;
        if (declaredValue > 1000000) {
            warnings.push('High declared value - manual review recommended');
        }

        const status = fraudIndicators.length === 0 ? 'passed' : 'failed';
        const fraudScore = fraudIndicators.length === 0 ? 0.95 : 0.3;
        
        const result = {
            validation_type: 'fraud_detection',
            status,
            confidence_score: fraudScore,
            results: {
                fraud_indicators: fraudIndicators,
                risk_factors: warnings,
                duplicate_count: duplicates ? duplicates.length : 0
            },
            errors: fraudIndicators,
            warnings
        };

        await storeValidationResult(applicationId, result);
        return result;
    } catch (error) {
        return { validation_type: 'fraud_detection', status: 'failed', errors: [error.message] };
    }
}

async function performComplianceCheck(applicationId, application) {
    try {
        const complianceIssues = [];
        
        // Check declaration data completeness
        const declarationData = application.declaration_data || {};
        const requiredFields = ['importer_name', 'importer_tin', 'exporter_name', 'agent_name'];
        const missingFields = requiredFields.filter(field => !declarationData[field]);
        
        if (missingFields.length > 0) {
            complianceIssues.push(`Missing required fields: ${missingFields.join(', ')}`);
        }

        const status = complianceIssues.length === 0 ? 'passed' : 'warning';
        const complianceScore = complianceIssues.length === 0 ? 1.0 : 0.6;
        
        const result = {
            validation_type: 'compliance_check',
            status,
            confidence_score: complianceScore,
            results: {
                compliance_issues: complianceIssues,
                required_fields: requiredFields,
                provided_fields: requiredFields.filter(field => declarationData[field])
            },
            errors: [],
            warnings: complianceIssues
        };

        await storeValidationResult(applicationId, result);
        return result;
    } catch (error) {
        return { validation_type: 'compliance_check', status: 'failed', errors: [error.message] };
    }
}

async function calculateRiskAssessment(applicationId, validationResults) {
    try {
        const scores = {
            ocr: validationResults.ocr.confidence_score || 0,
            document_verification: validationResults.document_verification.confidence_score || 0,
            hs_code_validation: validationResults.hs_code_validation.confidence_score || 0,
            fraud_detection: validationResults.fraud_detection.confidence_score || 0,
            compliance_check: validationResults.compliance_check.confidence_score || 0
        };

        const overallScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / 5;
        
        let riskLevel = 'low';
        if (overallScore < 0.5) riskLevel = 'critical';
        else if (overallScore < 0.7) riskLevel = 'high';
        else if (overallScore < 0.85) riskLevel = 'medium';

        const riskAssessment = {
            overall_score: overallScore,
            risk_level: riskLevel,
            fraud_score: scores.fraud_detection,
            compliance_score: scores.compliance_check,
            valuation_score: scores.hs_code_validation,
            risk_factors: [],
            recommendations: generateRecommendations(validationResults, riskLevel)
        };

        // Store in risk_assessments table
        await storeRiskAssessment(applicationId, riskAssessment);

        return riskAssessment;
    } catch (error) {
        console.error('Risk assessment error:', error);
        return { overall_score: 0, risk_level: 'critical' };
    }
}

function generateRecommendations(validationResults, riskLevel) {
    const recommendations = [];
    
    if (validationResults.document_verification.status !== 'passed') {
        recommendations.push('Upload all required documents');
    }
    
    if (validationResults.hs_code_validation.status === 'warning') {
        recommendations.push('Verify HS Code accuracy');
    }
    
    if (validationResults.compliance_check.status === 'warning') {
        recommendations.push('Complete all required fields');
    }
    
    if (riskLevel === 'high' || riskLevel === 'critical') {
        recommendations.push('Manual review recommended due to risk factors');
    }
    
    return recommendations;
}

async function storeValidationResult(applicationId, result) {
    try {
        await supabase.from('ai_validation_results').insert({
            application_id: applicationId,
            validation_type: result.validation_type,
            status: result.status,
            confidence_score: result.confidence_score,
            results: result.results,
            errors: result.errors,
            warnings: result.warnings
        });
    } catch (error) {
        console.error('Error storing validation result:', error);
    }
}

async function storeRiskAssessment(applicationId, assessment) {
    try {
        await supabase.from('risk_assessments').insert({
            application_id: applicationId,
            overall_score: assessment.overall_score,
            risk_level: assessment.risk_level,
            fraud_score: assessment.fraud_score,
            compliance_score: assessment.compliance_score,
            valuation_score: assessment.valuation_score,
            risk_factors: assessment.risk_factors,
            recommendations: assessment.recommendations
        });
    } catch (error) {
        console.error('Error storing risk assessment:', error);
    }
}

async function updateApplicationStatus(applicationId, status, reason) {
    try {
        const updateData = { status, updated_at: new Date().toISOString() };
        
        if (status === 'pending_review') {
            updateData.reviewed_at = new Date().toISOString();
        }
        
        await supabase.from('applications').update(updateData).eq('id', applicationId);
        
        // Create activity log
        await createActivityLog(null, 'status_change', `Application status changed to ${status}: ${reason}`, { application_id: applicationId, status });
        
        // Create audit log
        await createAuditLog(null, 'UPDATE', 'applications', applicationId, { status }, { status });
    } catch (error) {
        console.error('Error updating application status:', error);
    }
}

async function notifyAgent(applicationId, agentId, title, message, type) {
    try {
        await supabase.from('notifications').insert({
            user_id: agentId,
            title,
            message,
            type,
            reference_id: applicationId,
            reference_type: 'application'
        });
    } catch (error) {
        console.error('Error creating notification:', error);
    }
}

async function createAIAuditLog(applicationId, actionType, details) {
    try {
        await supabase.from('ai_audit_logs').insert({
            application_id: applicationId,
            action_type: actionType,
            details
        });
    } catch (error) {
        console.error('Error creating AI audit log:', error);
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

// ================================================================
// EXPORTS
// ================================================================

export {
    performAIValidation,
    performOCRValidation,
    performDocumentVerification,
    performHSCodeValidation,
    performFraudDetection,
    performComplianceCheck,
    calculateRiskAssessment
};
