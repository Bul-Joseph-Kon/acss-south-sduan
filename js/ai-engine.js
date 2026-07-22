// ================================================================
// AI ENGINE MODULE
// ================================================================
// Performs AI validation for customs declarations
// - OCR Document Extraction
// - Document Verification
// - HS Code Validation
// - Customs Value Verification
// - Duty & Tax Calculation
// - Duplicate Declaration Detection
// - Fraud Detection
// - Risk Assessment
// - Generate AI Recommendations
// - Generate AI Validation Report
// ================================================================

import supabase from './supabase.js';

// ================================================================
// MAIN AI VALIDATION FUNCTION
// ================================================================

export async function runAIValidation(applicationId) {
    console.log('=== STARTING AI VALIDATION ===', applicationId);

    try {
        // Fetch application data
        const { data: application, error: appError } = await supabase
            .from('applications')
            .select(`
                *,
                application_goods(*),
                profiles:user_id(full_name, email)
            `)
            .eq('id', applicationId)
            .single();

        if (appError) throw appError;
        if (!application) throw new Error('Application not found');

        // Create AI validation record
        const { data: validationRecord, error: createError } = await supabase
            .from('ai_validation_results')
            .insert({
                application_id: applicationId,
                validation_status: 'in_progress'
            })
            .select()
            .single();

        if (createError) throw createError;

        // Run all validation steps
        const results = {
            ocr_extracted_data: await performOCR(application),
            document_verification: await verifyDocuments(application),
            hs_code_validation: await validateHSCodes(application),
            customs_value_verification: await verifyCustomsValue(application),
            duty_calculation: await calculateDutiesAndTaxes(application),
            duplicate_detection: await detectDuplicates(application),
            fraud_detection: await detectFraud(application),
            risk_assessment: await assessRisk(application),
            recommendations: await generateRecommendations(application)
        };

        // Calculate overall validation score
        const validationScore = calculateValidationScore(results);
        const validationPassed = validationScore >= 70;
        const riskLevel = results.risk_assessment.level;
        
        // Canonical AI decision: AI Engine acts as Decision Support only.
        // Update application status to 'under_review' for Officer Review.
        // AI Risk Level (Low, Medium, High) is stored separately in ai_validation_results and risk_assessments.
        const nextStatus = 'under_review';
        const normalizedRiskLevel = (riskLevel === 'critical' || riskLevel === 'high') ? 'high' : riskLevel === 'medium' ? 'medium' : 'low';

        // Update validation record
        const { error: updateError } = await supabase
            .from('ai_validation_results')
            .update({
                validation_status: 'completed',
                validation_passed: validationPassed,
                validation_score: validationScore,
                routing_decision: 'under_review',
                next_status: nextStatus,
                ocr_extracted_data: results.ocr_extracted_data,
                ocr_confidence: results.ocr_extracted_data?.confidence,
                document_verification: results.document_verification,
                hs_code_validation: results.hs_code_validation,
                customs_value_verification: results.customs_value_verification,
                duty_calculated: results.duty_calculation.duty_amount,
                tax_calculated: results.duty_calculation.tax_amount,
                total_calculated: results.duty_calculation.total_amount,
                duty_calculation: results.duty_calculation,
                duplicate_found: results.duplicate_detection.found,
                duplicate_references: results.duplicate_detection.references,
                fraud_detected: results.fraud_detection.detected,
                fraud_indicators: results.fraud_detection.indicators,
                risk_level: normalizedRiskLevel,
                risk_score: results.risk_assessment.score,
                risk_factors: results.risk_assessment.factors,
                recommendations: results.recommendations,
                validation_report: generateValidationReport(application, results, validationScore)
            })
            .eq('id', validationRecord.id);

        if (updateError) throw updateError;

        // Update application with AI validation reference and new status 'under_review'
        await supabase
            .from('applications')
            .update({
                ai_validation_id: validationRecord.id,
                status: nextStatus
            })
            .eq('id', applicationId);

        // Log workflow transition
        await supabase.from('workflow_logs').insert({
            application_id: applicationId,
            from_status: 'submitted',
            to_status: nextStatus,
            action: 'ai_validation_completed',
            notes: `AI validation completed with score ${validationScore}%. Risk level: ${normalizedRiskLevel.toUpperCase()}`
        });

        console.log('=== AI VALIDATION COMPLETED ===', validationScore, 'Routing:', routingDecision, 'Next Status:', nextStatus);
        return {
            success: true,
            validation_passed: validationPassed,
            validation_score: validationScore,
            routing_decision: routingDecision,
            next_status: nextStatus,
            risk_level: riskLevel,
            results
        };

    } catch (error) {
        console.error('AI validation error:', error);
        throw error;
    }
}

// ================================================================
// OCR DOCUMENT EXTRACTION
// ================================================================

async function performOCR(application) {
    console.log('Performing OCR...');
    
    // In production, this would call an OCR service like Tesseract.js or Google Cloud Vision
    // For now, return simulated results
    return {
        confidence: 0.85,
        extracted_fields: {
            application_number: application.application_number,
            trader_name: application.trader_name,
            consignment_number: application.consignment_number
        },
        processing_time: '1.2s'
    };
}

// ================================================================
// DOCUMENT VERIFICATION
// ================================================================

async function verifyDocuments(application) {
    console.log('Verifying documents...');
    
    const documents = application.documents_data || {};
    const invalidDocuments = [];
    const warnings = [];

    // Check required documents
    const requiredDocs = ['commercial_invoice', 'bill_of_lading', 'packing_list'];
    requiredDocs.forEach(doc => {
        if (!documents[doc]) {
            invalidDocuments.push(`Missing ${doc}`);
        }
    });

    // Check document validity
    if (documents.certificate_of_origin && !isValidCertificate(documents.certificate_of_origin)) {
        warnings.push('Certificate of origin may be expired');
    }

    return {
        valid: invalidDocuments.length === 0,
        invalid_documents: invalidDocuments,
        warnings: warnings,
        total_documents: Object.keys(documents).length
    };
}

function isValidCertificate(docRef) {
    // In production, validate certificate expiration
    return true;
}

// ================================================================
// HS CODE VALIDATION
// ================================================================

async function validateHSCodes(application) {
    console.log('Validating HS codes...');
    
    const goods = application.application_goods || [];
    const invalidCodes = [];
    const warnings = [];

    for (const item of goods) {
        if (!item.hs_code) {
            invalidCodes.push(`Item ${item.item_number}: Missing HS code`);
            continue;
        }

        // Validate HS code format (4-10 digits)
        if (!/^\d{4,10}$/.test(item.hs_code)) {
            invalidCodes.push(`Item ${item.item_number}: Invalid HS code format`);
        }

        // Check if HS code exists in database
        const { data: hsCode } = await supabase
            .from('hs_codes')
            .select('*')
            .eq('code', item.hs_code)
            .single();

        if (!hsCode) {
            warnings.push(`Item ${item.item_number}: HS code ${item.hs_code} not found in database`);
        }
    }

    return {
        valid: invalidCodes.length === 0,
        invalid_codes: invalidCodes,
        warnings: warnings,
        total_items: goods.length
    };
}

// ================================================================
// CUSTOMS VALUE VERIFICATION
// ================================================================

async function verifyCustomsValue(application) {
    console.log('Verifying customs value...');
    
    const goods = application.application_goods || [];
    const declaredValue = application.declared_value || 0;
    const calculatedValue = goods.reduce((sum, item) => sum + (item.customs_value || 0), 0);

    const variance = Math.abs(declaredValue - calculatedValue) / (declaredValue || 1);
    const suspicious = variance > 0.1; // 10% variance threshold

    return {
        declared_value: declaredValue,
        calculated_value: calculatedValue,
        variance: variance,
        suspicious: suspicious,
        verified: !suspicious
    };
}

// ================================================================
// DUTY & TAX CALCULATION
// ================================================================

async function calculateDutiesAndTaxes(application) {
    console.log('Calculating duties and taxes...');
    
    const goods = application.application_goods || [];
    const dutyRate = 0.15; // 15% duty rate
    const vatRate = 0.15; // 15% VAT
    const processingFee = 2500; // Fixed processing fee

    const customsValue = goods.reduce((sum, item) => sum + (item.customs_value || 0), 0);
    const dutyAmount = customsValue * dutyRate;
    const vatAmount = (customsValue + dutyAmount) * vatRate;
    const subtotal = customsValue + dutyAmount;
    const totalAmount = subtotal + vatAmount + processingFee;

    return {
        customs_value: customsValue,
        duty_rate: dutyRate,
        duty_amount: dutyAmount,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        processing_fee: processingFee,
        subtotal: subtotal,
        total_amount: totalAmount,
        items: goods.map(item => ({
            item_number: item.item_number,
            hs_code: item.hs_code,
            customs_value: item.customs_value,
            duty_amount: (item.customs_value || 0) * dutyRate,
            vat_amount: ((item.customs_value || 0) + ((item.customs_value || 0) * dutyRate)) * vatRate
        }))
    };
}

// ================================================================
// DUPLICATE DECLARATION DETECTION
// ================================================================

async function detectDuplicates(application) {
    console.log('Detecting duplicates...');
    
    const { data: duplicates } = await supabase
        .from('applications')
        .select('id, application_number, consignment_number, trader_name')
        .neq('id', application.id)
        .eq('consignment_number', application.consignment_number)
        .limit(5);

    const found = duplicates && duplicates.length > 0;
    const references = found ? duplicates.map(d => d.application_number) : [];

    return {
        found: found,
        references: references,
        count: references.length
    };
}

// ================================================================
// FRAUD DETECTION
// ================================================================

async function detectFraud(application) {
    console.log('Detecting fraud...');
    
    const indicators = [];
    const goods = application.application_goods || [];

    // Check for unusually low declared values
    const avgValue = goods.reduce((sum, item) => sum + (item.customs_value || 0), 0) / (goods.length || 1);
    if (avgValue < 100) {
        indicators.push('Unusually low declared values');
    }

    // Check for suspicious HS codes
    const highRiskCodes = ['9301', '9302', '9303', '9304']; // Firearms
    const hasHighRisk = goods.some(item => 
        highRiskCodes.some(code => item.hs_code?.startsWith(code))
    );
    if (hasHighRisk) {
        indicators.push('High-risk HS codes detected');
    }

    // Check for incomplete trader information
    if (!application.trader_name || !application.trader_address) {
        indicators.push('Incomplete trader information');
    }

    return {
        detected: indicators.length > 0,
        indicators: indicators,
        risk_level: indicators.length > 0 ? 'high' : 'low'
    };
}

// ================================================================
// RISK ASSESSMENT
// ================================================================

async function assessRisk(application) {
    console.log('Assessing risk...');
    
    const factors = [];
    let score = 0;

    // Factor 1: Document verification
    const docVerification = await verifyDocuments(application);
    if (!docVerification.valid) {
        score += 20;
        factors.push('Missing documents');
    }

    // Factor 2: HS code validation
    const hsValidation = await validateHSCodes(application);
    if (!hsValidation.valid) {
        score += 15;
        factors.push('Invalid HS codes');
    }

    // Factor 3: Customs value variance
    const valueVerification = await verifyCustomsValue(application);
    if (valueVerification.suspicious) {
        score += 25;
        factors.push('Value variance detected');
    }

    // Factor 4: Fraud indicators
    const fraudDetection = await detectFraud(application);
    if (fraudDetection.detected) {
        score += 30;
        factors.push('Fraud indicators detected');
    }

    // Factor 5: Duplicate detection
    const duplicateDetection = await detectDuplicates(application);
    if (duplicateDetection.found) {
        score += 10;
        factors.push('Duplicate declaration detected');
    }

    // Determine risk level
    let level = 'low';
    if (score >= 50) level = 'critical';
    else if (score >= 30) level = 'high';
    else if (score >= 15) level = 'medium';

    return {
        score: score,
        level: level,
        factors: factors
    };
}

// ================================================================
// GENERATE RECOMMENDATIONS
// ================================================================

async function generateRecommendations(application) {
    console.log('Generating recommendations...');
    
    const recommendations = [];
    const riskAssessment = await assessRisk(application);
    const docVerification = await verifyDocuments(application);
    const hsValidation = await validateHSCodes(application);

    // High priority recommendations
    if (!docVerification.valid) {
        docVerification.invalid_documents.forEach(doc => {
            recommendations.push({
                priority: 'high',
                type: 'document',
                message: `Please provide ${doc}`,
                action: 'upload_document'
            });
        });
    }

    if (!hsValidation.valid) {
        hsValidation.invalid_codes.forEach(code => {
            recommendations.push({
                priority: 'high',
                type: 'hs_code',
                message: code,
                action: 'correct_hs_code'
            });
        });
    }

    // Medium priority recommendations
    if (riskAssessment.level === 'high' || riskAssessment.level === 'critical') {
        recommendations.push({
            priority: 'high',
            type: 'inspection',
            message: 'Physical inspection recommended due to high risk assessment',
            action: 'assign_inspector'
        });
    }

    // Low priority recommendations
    recommendations.push({
        priority: 'low',
        type: 'review',
        message: 'Review all information for accuracy',
        action: 'manual_review'
    });

    return {
        total: recommendations.length,
        high_priority: recommendations.filter(r => r.priority === 'high').length,
        medium_priority: recommendations.filter(r => r.priority === 'medium').length,
        low_priority: recommendations.filter(r => r.priority === 'low').length,
        recommendations: recommendations
    };
}

// ================================================================
// CALCULATE VALIDATION SCORE
// ================================================================

function calculateValidationScore(results) {
    let score = 100;

    // Deduct for document issues
    if (!results.document_verification.valid) {
        score -= results.document_verification.invalid_documents.length * 10;
    }

    // Deduct for HS code issues
    if (!results.hs_code_validation.valid) {
        score -= results.hs_code_validation.invalid_codes.length * 5;
    }

    // Deduct for value variance
    if (results.customs_value_verification.suspicious) {
        score -= 15;
    }

    // Deduct for fraud indicators
    if (results.fraud_detection.detected) {
        score -= results.fraud_detection.indicators.length * 10;
    }

    // Deduct for duplicates
    if (results.duplicate_detection.found) {
        score -= 20;
    }

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, score));
}

// ================================================================
// GENERATE VALIDATION REPORT
// ================================================================

function generateValidationReport(application, results, score) {
    const passed = score >= 70;
    const riskLevel = results.risk_assessment.level;
    
    return `
AI VALIDATION REPORT
====================
Application Number: ${application.application_number}
Validation Date: ${new Date().toISOString()}
Validation Score: ${score}%
Status: ${passed ? 'PASSED' : 'FAILED'}
Risk Level: ${riskLevel.toUpperCase()}

DOCUMENT VERIFICATION
----------------------
Valid: ${results.document_verification.valid ? 'Yes' : 'No'}
Invalid Documents: ${results.document_verification.invalid_documents.join(', ') || 'None'}
Warnings: ${results.document_verification.warnings.join(', ') || 'None'}

HS CODE VALIDATION
------------------
Valid: ${results.hs_code_validation.valid ? 'Yes' : 'No'}
Invalid Codes: ${results.hs_code_validation.invalid_codes.join(', ') || 'None'}
Total Items: ${results.hs_code_validation.total_items}

CUSTOMS VALUE VERIFICATION
--------------------------
Declared Value: ${results.customs_value_verification.declared_value}
Calculated Value: ${results.customs_value_verification.calculated_value}
Variance: ${(results.customs_value_verification.variance * 100).toFixed(2)}%
Verified: ${results.customs_value_verification.verified ? 'Yes' : 'No'}

DUPLICATE DETECTION
-------------------
Duplicates Found: ${results.duplicate_detection.found ? 'Yes' : 'No'}
References: ${results.duplicate_detection.references.join(', ') || 'None'}

FRAUD DETECTION
---------------
Fraud Detected: ${results.fraud_detection.detected ? 'Yes' : 'No'}
Indicators: ${results.fraud_detection.indicators.join(', ') || 'None'}

RISK ASSESSMENT
---------------
Risk Score: ${results.risk_assessment.score}
Risk Level: ${results.risk_assessment.level.toUpperCase()}
Factors: ${results.risk_assessment.factors.join(', ') || 'None'}

RECOMMENDATIONS
---------------
${results.recommendations.recommendations.map(r => 
    `- [${r.priority.toUpperCase()}] ${r.message}`
).join('\n')}

DUTY & TAX CALCULATION
-----------------------
Customs Value: ${results.duty_calculation.customs_value}
Duty Amount: ${results.duty_calculation.duty_amount}
VAT Amount: ${results.duty_calculation.vat_amount}
Processing Fee: ${results.duty_calculation.processing_fee}
Total Amount: ${results.duty_calculation.total_amount}

CONCLUSION
----------
${passed ? 
    'Declaration has passed AI validation and is ready for officer review.' : 
    'Declaration has failed AI validation. Please address the issues above before proceeding.'
}
    `.trim();
}
