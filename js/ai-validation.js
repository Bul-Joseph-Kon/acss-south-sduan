// ================================================================
// AI VALIDATION ENGINE
// ================================================================
// Comprehensive AI-powered validation for applications
// Performs automatic validation on submission and returns applications
// for correction if validation fails
// ================================================================

import supabase from './supabase.js';
import { 
    sendAIValidationNotification, 
    sendApplicationStatusNotification 
} from './notifications.js';

// ================================================================
// COMPREHENSIVE APPLICATION VALIDATION
// ================================================================

export async function comprehensiveApplicationValidation(applicationId) {
    try {
        console.log('=== COMPREHENSIVE APPLICATION VALIDATION ===');
        console.log('Application ID:', applicationId);

        // Get application details with all related data
        const { data: application, error: fetchError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (fetchError) throw fetchError;
        if (!application) throw new Error('Application not found');

        const validationResults = {
            applicationId: applicationId,
            applicationNumber: application.application_number,
            timestamp: new Date().toISOString(),
            errors: [],
            warnings: [],
            details: {
                dataValidation: {},
                documentVerification: {},
                mandatoryFieldsCheck: {},
                duplicateDetection: {},
                hsCodeValidation: {},
                customsValueVerification: {},
                complianceChecking: {},
                fraudDetection: {},
                riskAssessment: {},
                businessRuleValidation: {}
            }
        };

        // 1. DATA VALIDATION
        console.log('Step 1: Data Validation');
        const dataValidation = await validateData(application);
        validationResults.details.dataValidation = dataValidation;
        if (dataValidation.errors.length > 0) {
            validationResults.errors.push(...dataValidation.errors);
        }
        if (dataValidation.warnings.length > 0) {
            validationResults.warnings.push(...dataValidation.warnings);
        }

        // 2. DOCUMENT VERIFICATION
        console.log('Step 2: Document Verification');
        const documentVerification = await verifyDocuments(application);
        validationResults.details.documentVerification = documentVerification;
        if (documentVerification.errors.length > 0) {
            validationResults.errors.push(...documentVerification.errors);
        }
        if (documentVerification.warnings.length > 0) {
            validationResults.warnings.push(...documentVerification.warnings);
        }

        // 3. MANDATORY FIELDS CHECK
        console.log('Step 3: Mandatory Fields Check');
        const mandatoryFields = await checkMandatoryFields(application);
        validationResults.details.mandatoryFieldsCheck = mandatoryFields;
        if (mandatoryFields.errors.length > 0) {
            validationResults.errors.push(...mandatoryFields.errors);
        }

        // 4. DUPLICATE DETECTION
        console.log('Step 4: Duplicate Detection');
        const duplicateCheck = await detectDuplicates(application);
        validationResults.details.duplicateDetection = duplicateCheck;
        if (duplicateCheck.errors.length > 0) {
            validationResults.errors.push(...duplicateCheck.errors);
        }
        if (duplicateCheck.warnings.length > 0) {
            validationResults.warnings.push(...duplicateCheck.warnings);
        }

        // 5. HS CODE VALIDATION
        console.log('Step 5: HS Code Validation');
        const hsCodeValidation = await validateHSCodes(application);
        validationResults.details.hsCodeValidation = hsCodeValidation;
        if (hsCodeValidation.errors.length > 0) {
            validationResults.errors.push(...hsCodeValidation.errors);
        }
        if (hsCodeValidation.warnings.length > 0) {
            validationResults.warnings.push(...hsCodeValidation.warnings);
        }

        // 6. CUSTOMS VALUE VERIFICATION
        console.log('Step 6: Customs Value Verification');
        const customsValue = await verifyCustomsValue(application);
        validationResults.details.customsValueVerification = customsValue;
        if (customsValue.errors.length > 0) {
            validationResults.errors.push(...customsValue.errors);
        }
        if (customsValue.warnings.length > 0) {
            validationResults.warnings.push(...customsValue.warnings);
        }

        // 7. COMPLIANCE CHECKING
        console.log('Step 7: Compliance Checking');
        const compliance = await checkCompliance(application);
        validationResults.details.complianceChecking = compliance;
        if (compliance.errors.length > 0) {
            validationResults.errors.push(...compliance.errors);
        }
        if (compliance.warnings.length > 0) {
            validationResults.warnings.push(...compliance.warnings);
        }

        // 8. FRAUD DETECTION
        console.log('Step 8: Fraud Detection');
        const fraudDetection = await performFraudDetection(application);
        validationResults.details.fraudDetection = fraudDetection;
        if (fraudDetection.errors.length > 0) {
            validationResults.errors.push(...fraudDetection.errors);
        }
        if (fraudDetection.warnings.length > 0) {
            validationResults.warnings.push(...fraudDetection.warnings);
        }

        // 9. RISK ASSESSMENT
        console.log('Step 9: Risk Assessment');
        const riskAssessment = await performRiskAssessment(application);
        validationResults.details.riskAssessment = riskAssessment;
        if (riskAssessment.errors.length > 0) {
            validationResults.errors.push(...riskAssessment.errors);
        }
        if (riskAssessment.warnings.length > 0) {
            validationResults.warnings.push(...riskAssessment.warnings);
        }

        // 10. BUSINESS RULE VALIDATION
        console.log('Step 10: Business Rule Validation');
        const businessRules = await validateBusinessRules(application);
        validationResults.details.businessRuleValidation = businessRules;
        if (businessRules.errors.length > 0) {
            validationResults.errors.push(...businessRules.errors);
        }
        if (businessRules.warnings.length > 0) {
            validationResults.warnings.push(...businessRules.warnings);
        }

        // Remove duplicate error messages
        validationResults.errors = [...new Set(validationResults.errors)];
        validationResults.warnings = [...new Set(validationResults.warnings)];

        console.log('Validation Complete. Errors:', validationResults.errors.length, 'Warnings:', validationResults.warnings.length);
        return validationResults;
    } catch (error) {
        console.error('=== VALIDATION ERROR ===');
        console.error('Error:', error);
        return {
            applicationId: applicationId,
            timestamp: new Date().toISOString(),
            errors: ['Critical validation error: ' + error.message],
            warnings: [],
            details: {}
        };
    }
}

// ================================================================
// 1. DATA VALIDATION
// ================================================================

async function validateData(application) {
    const errors = [];
    const warnings = [];

    try {
        // Check for empty or null values in critical fields
        if (!application.application_type || application.application_type.trim() === '') {
            errors.push('Application type is missing');
        }

        if (!application.declaration_type || application.declaration_type.trim() === '') {
            errors.push('Declaration type is missing');
        }

        if (!application.applicant_name || application.applicant_name.trim() === '') {
            errors.push('Applicant name is missing');
        }

        if (!application.applicant_id_number || application.applicant_id_number.trim() === '') {
            errors.push('Applicant ID number is missing');
        }

        if (!application.origin_country || application.origin_country.trim() === '') {
            errors.push('Origin country is missing');
        }

        if (!application.destination_country || application.destination_country.trim() === '') {
            errors.push('Destination country is missing');
        }

        // Validate email format if provided
        if (application.applicant_email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(application.applicant_email)) {
                errors.push('Applicant email format is invalid');
            }
        }

        // Validate phone format if provided
        if (application.applicant_phone) {
            if (application.applicant_phone.length < 7) {
                errors.push('Applicant phone number is invalid');
            }
        }

        // Check date formats
        if (application.application_date) {
            const date = new Date(application.application_date);
            if (isNaN(date.getTime())) {
                errors.push('Application date format is invalid');
            }
            // Check if date is in future
            if (date > new Date()) {
                errors.push('Application date cannot be in the future');
            }
        }

        return { errors, warnings, validated: errors.length === 0 };
    } catch (error) {
        console.error('Data validation error:', error);
        errors.push('Data validation process failed: ' + error.message);
        return { errors, warnings, validated: false };
    }
}

// ================================================================
// 2. DOCUMENT VERIFICATION
// ================================================================

async function verifyDocuments(application) {
    const errors = [];
    const warnings = [];

    try {
        // Fetch application documents
        const { data: documents, error: docError } = await supabase
            .from('documents')
            .select('*')
            .eq('application_id', application.id);

        if (docError) throw docError;

        // Check if documents exist
        if (!documents || documents.length === 0) {
            errors.push('No documents uploaded for this application');
        } else {
            // Check for required document types based on application type
            const requiredDocTypes = getRequiredDocumentTypes(application.application_type);
            const uploadedDocTypes = documents.map(d => d.document_type);

            for (const reqDocType of requiredDocTypes) {
                if (!uploadedDocTypes.includes(reqDocType)) {
                    errors.push(`Required document type "${reqDocType}" is missing`);
                }
            }

            // Check document file sizes (max 5MB)
            documents.forEach(doc => {
                if (doc.file_size && doc.file_size > 5242880) { // 5MB
                    errors.push(`Document "${doc.document_name}" exceeds maximum file size of 5MB`);
                }
            });

            // Check document expiry dates if applicable
            documents.forEach(doc => {
                if (doc.expiry_date) {
                    const expiryDate = new Date(doc.expiry_date);
                    if (expiryDate < new Date()) {
                        errors.push(`Document "${doc.document_name}" has expired`);
                    } else if ((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) < 30) {
                        warnings.push(`Document "${doc.document_name}" expires in less than 30 days`);
                    }
                }
            });

            // Check OCR quality if available
            const poorQualityDocs = documents.filter(d => d.ocr_confidence && d.ocr_confidence < 0.75);
            if (poorQualityDocs.length > 0) {
                warnings.push(`${poorQualityDocs.length} document(s) have low OCR confidence (<75%)`);
            }
        }

        return { errors, warnings, verified: errors.length === 0, documentCount: documents?.length || 0 };
    } catch (error) {
        console.error('Document verification error:', error);
        errors.push('Document verification process failed: ' + error.message);
        return { errors, warnings, verified: false };
    }
}

// ================================================================
// 3. MANDATORY FIELDS CHECK
// ================================================================

async function checkMandatoryFields(application) {
    const errors = [];

    try {
        const mandatoryFields = {
            'all': ['application_type', 'declaration_type', 'applicant_name', 'applicant_id_number'],
            'import': ['origin_country', 'destination_country', 'declared_value', 'hs_code'],
            'export': ['origin_country', 'destination_country', 'declared_value'],
            'transit': ['origin_country', 'destination_country']
        };

        const appType = application.application_type || 'all';
        const fieldsToCheck = mandatoryFields['all'].concat(mandatoryFields[appType] || []);

        fieldsToCheck.forEach(field => {
            if (!application[field] || (typeof application[field] === 'string' && application[field].trim() === '')) {
                errors.push(`Mandatory field "${field}" is empty`);
            }
        });

        return { errors, allMandatoryFieldsPresent: errors.length === 0 };
    } catch (error) {
        console.error('Mandatory fields check error:', error);
        errors.push('Mandatory fields check process failed: ' + error.message);
        return { errors, allMandatoryFieldsPresent: false };
    }
}

// ================================================================
// 4. DUPLICATE DETECTION
// ================================================================

async function detectDuplicates(application) {
    const errors = [];
    const warnings = [];

    try {
        // Check for identical applications from same user in past 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        const { data: duplicates, error: dupError } = await supabase
            .from('applications')
            .select('id, application_number, created_at')
            .eq('user_id', application.user_id)
            .eq('application_type', application.application_type)
            .eq('declaration_type', application.declaration_type)
            .eq('origin_country', application.origin_country)
            .eq('destination_country', application.destination_country)
            .neq('id', application.id)
            .gte('created_at', oneDayAgo);

        if (dupError) throw dupError;

        if (duplicates && duplicates.length > 0) {
            const duplicateNumbers = duplicates.map(d => d.application_number).join(', ');
            errors.push(`Potential duplicate application(s) detected: ${duplicateNumbers}`);
        }

        // Check for similar value and item submissions
        const { data: similarApps } = await supabase
            .from('applications')
            .select('id, application_number')
            .eq('user_id', application.user_id)
            .eq('declared_value', application.declared_value)
            .neq('id', application.id)
            .gte('created_at', oneDayAgo)
            .limit(3);

        if (similarApps && similarApps.length > 0) {
            warnings.push(`Similar value declarations found in recent submissions`);
        }

        return { errors, warnings, isDuplicate: errors.length > 0 };
    } catch (error) {
        console.error('Duplicate detection error:', error);
        errors.push('Duplicate detection process failed: ' + error.message);
        return { errors, warnings, isDuplicate: false };
    }
}

// ================================================================
// 5. HS CODE VALIDATION
// ================================================================

async function validateHSCodes(application) {
    const errors = [];
    const warnings = [];

    try {
        // Fetch application items
        const { data: items, error: itemError } = await supabase
            .from('application_items')
            .select('*')
            .eq('application_id', application.id);

        if (itemError) throw itemError;

        if (!items || items.length === 0) {
            errors.push('No items declared in application');
        } else {
            for (const item of items) {
                // Check if HS code is provided
                if (!item.hs_code || item.hs_code.trim() === '') {
                    errors.push(`Item "${item.item_description || 'Item ' + item.item_number}" is missing HS code`);
                    continue;
                }

                // Validate HS code format (should be 6-10 digits)
                const hsCodeRegex = /^\d{6,10}$/;
                if (!hsCodeRegex.test(item.hs_code.replace(/\s/g, ''))) {
                    errors.push(`HS code "${item.hs_code}" for item "${item.item_description}" has invalid format`);
                }

                // Check if HS code exists in tariff codes table
                const { data: tariffCodes, error: tariffError } = await supabase
                    .from('tariff_codes')
                    .select('id, hs_code, description')
                    .eq('hs_code', item.hs_code)
                    .limit(1);

                if (tariffError) throw tariffError;

                if (!tariffCodes || tariffCodes.length === 0) {
                    warnings.push(`HS code "${item.hs_code}" not found in tariff database - manual verification required`);
                }
            }
        }

        return { errors, warnings, hsCodesValid: errors.length === 0, itemsChecked: items?.length || 0 };
    } catch (error) {
        console.error('HS code validation error:', error);
        errors.push('HS code validation process failed: ' + error.message);
        return { errors, warnings, hsCodesValid: false };
    }
}

// ================================================================
// 6. CUSTOMS VALUE VERIFICATION
// ================================================================

async function verifyCustomsValue(application) {
    const errors = [];
    const warnings = [];

    try {
        // Check declared value
        if (!application.declared_value || application.declared_value <= 0) {
            errors.push('Declared value must be greater than zero');
        }

        // Fetch items to calculate total value
        const { data: items, error: itemError } = await supabase
            .from('application_items')
            .select('item_value, item_quantity')
            .eq('application_id', application.id);

        if (itemError) throw itemError;

        if (items && items.length > 0) {
            let calculatedTotal = 0;
            items.forEach(item => {
                const itemValue = (item.item_value || 0) * (item.item_quantity || 1);
                calculatedTotal += itemValue;
            });

            // Check if declared value matches item values (allow 5% variance)
            if (calculatedTotal > 0) {
                const variance = Math.abs(application.declared_value - calculatedTotal) / calculatedTotal;
                if (variance > 0.05) {
                    errors.push(`Declared value (${application.declared_value}) significantly differs from calculated items total (${calculatedTotal.toFixed(2)}) - variance: ${(variance * 100).toFixed(1)}%`);
                }
                if (variance > 0.01) {
                    warnings.push(`Declared value differs slightly from items total - variance: ${(variance * 100).toFixed(1)}%`);
                }
            }
        }

        // Check for suspiciously low or high values for high-value imports
        if (application.declared_value > 1000000) {
            warnings.push(`High-value declaration detected (${application.declared_value}) - requires additional verification`);
        }

        if (application.declared_value < 100 && application.application_type === 'import') {
            warnings.push('Unusually low value for import declaration - may require verification');
        }

        return { errors, warnings, valueVerified: errors.length === 0, declaredValue: application.declared_value };
    } catch (error) {
        console.error('Customs value verification error:', error);
        errors.push('Value verification process failed: ' + error.message);
        return { errors, warnings, valueVerified: false };
    }
}

// ================================================================
// 7. COMPLIANCE CHECKING
// ================================================================

async function checkCompliance(application) {
    const errors = [];
    const warnings = [];

    try {
        // Check if origin/destination countries have trade restrictions
        const restrictedCountries = ['North Korea', 'Syria', 'Iran', 'Cuba'];
        if (restrictedCountries.includes(application.origin_country)) {
            errors.push(`Origin country "${application.origin_country}" has trade restrictions`);
        }
        if (restrictedCountries.includes(application.destination_country)) {
            errors.push(`Destination country "${application.destination_country}" has trade restrictions`);
        }

        // Check user compliance history
        const { data: userProfile } = await supabase
            .from('profiles')
            .select('compliance_score, flagged_status')
            .eq('id', application.user_id)
            .single();

        if (userProfile) {
            if (userProfile.flagged_status) {
                warnings.push(`User account has been flagged for compliance review`);
            }
            if (userProfile.compliance_score && userProfile.compliance_score < 50) {
                errors.push(`User compliance score is below acceptable threshold`);
            }
        }

        // Check for prohibited items based on HS codes
        const { data: items } = await supabase
            .from('application_items')
            .select('hs_code, item_description')
            .eq('application_id', application.id);

        if (items) {
            const prohibitedHSCodes = ['2401', '2402', '2403']; // Examples: tobacco products
            for (const item of items) {
                if (prohibitedHSCodes.some(code => item.hs_code?.startsWith(code))) {
                    warnings.push(`Item with HS code ${item.hs_code} may have compliance restrictions`);
                }
            }
        }

        return { errors, warnings, compliant: errors.length === 0 };
    } catch (error) {
        console.error('Compliance checking error:', error);
        errors.push('Compliance check process failed: ' + error.message);
        return { errors, warnings, compliant: false };
    }
}

// ================================================================
// 8. FRAUD DETECTION
// ================================================================

async function performFraudDetection(application) {
    const errors = [];
    const warnings = [];
    let fraudScore = 0;

    try {
        // Check for inconsistent applicant information
        if (application.applicant_name && application.applicant_email) {
            const nameInitials = application.applicant_name.split(' ').map(n => n[0]).join('');
            const emailPrefix = application.applicant_email.split('@')[0].toUpperCase();
            if (!emailPrefix.includes(nameInitials.substring(0, 1))) {
                fraudScore += 10;
                warnings.push('Applicant name and email may be inconsistent');
            }
        }

        // Check for multiple submissions from same IP/device (if tracked)
        const { data: recentApps } = await supabase
            .from('applications')
            .select('id, created_at')
            .eq('user_id', application.user_id)
            .neq('id', application.id)
            .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
            .limit(5);

        if (recentApps && recentApps.length > 3) {
            fraudScore += 20;
            warnings.push(`User has submitted ${recentApps.length} applications in the last hour`);
        }

        // Check for unusual amount patterns
        const { data: userApps } = await supabase
            .from('applications')
            .select('declared_value')
            .eq('user_id', application.user_id)
            .neq('id', application.id)
            .limit(10);

        if (userApps && userApps.length > 0) {
            const values = userApps.map(a => a.declared_value || 0);
            const avgValue = values.reduce((a, b) => a + b) / values.length;
            const deviation = Math.abs(application.declared_value - avgValue) / avgValue;
            if (deviation > 2) {
                fraudScore += 15;
                warnings.push(`Declared value significantly deviates from user's average pattern`);
            }
        }

        // Document quality check (OCR confidence)
        const { data: documents } = await supabase
            .from('documents')
            .select('ocr_confidence')
            .eq('application_id', application.id)
            .lt('ocr_confidence', 0.60);

        if (documents && documents.length > 0) {
            fraudScore += 10 * documents.length;
            warnings.push(`${documents.length} document(s) have poor OCR quality - possible forgery risk`);
        }

        if (fraudScore > 70) {
            errors.push(`High fraud risk detected (score: ${fraudScore}/100) - application requires manual review`);
        } else if (fraudScore > 40) {
            warnings.push(`Moderate fraud risk detected (score: ${fraudScore}/100) - recommend additional verification`);
        }

        return { 
            errors, 
            warnings, 
            fraudScore, 
            riskLevel: fraudScore > 70 ? 'high' : fraudScore > 40 ? 'medium' : 'low',
            fraudDetected: fraudScore > 70
        };
    } catch (error) {
        console.error('Fraud detection error:', error);
        errors.push('Fraud detection process failed: ' + error.message);
        return { errors, warnings, fraudScore: 0, riskLevel: 'unknown', fraudDetected: false };
    }
}

// ================================================================
// 9. RISK ASSESSMENT
// ================================================================

async function performRiskAssessment(application) {
    const errors = [];
    const warnings = [];
    let riskScore = 0;

    try {
        const riskFactors = {
            documentation: 100,
            compliance: 100,
            history: 100,
            value: 100,
            items: 100
        };

        // Assessment 1: Documentation completeness
        const { data: documents } = await supabase
            .from('documents')
            .select('id')
            .eq('application_id', application.id);
        
        if (!documents || documents.length === 0) {
            riskFactors.documentation = 0;
        } else if (documents.length < 3) {
            riskFactors.documentation = 50;
        }

        // Assessment 2: User compliance history
        const { data: userProfile } = await supabase
            .from('profiles')
            .select('compliance_score')
            .eq('id', application.user_id)
            .single();

        if (userProfile?.compliance_score) {
            riskFactors.compliance = userProfile.compliance_score;
        }

        // Assessment 3: User history
        const { data: userApps } = await supabase
            .from('applications')
            .select('id, status')
            .eq('user_id', application.user_id)
            .neq('id', application.id);

        if (userApps && userApps.length > 10) {
            const approvedCount = userApps.filter(a => a.status === 'approved').length;
            const approvalRate = (approvedCount / userApps.length) * 100;
            riskFactors.history = Math.min(100, approvalRate);
            if (approvalRate < 70) {
                warnings.push(`User approval rate is ${approvalRate.toFixed(0)}% - below average`);
            }
        }

        // Assessment 4: Value assessment
        if (application.declared_value > 500000) {
            riskFactors.value = 70;
            warnings.push('High declared value increases risk score');
        } else if (application.declared_value > 100000) {
            riskFactors.value = 85;
        } else {
            riskFactors.value = 95;
        }

        // Assessment 5: Item count and diversity
        const { data: items } = await supabase
            .from('application_items')
            .select('hs_code')
            .eq('application_id', application.id);

        if (!items || items.length === 0) {
            riskFactors.items = 30;
        } else if (items.length > 20) {
            riskFactors.items = 70;
            warnings.push('Large number of items in single application increases risk');
        } else {
            riskFactors.items = 90;
        }

        // Calculate overall risk score
        riskScore = (Object.values(riskFactors).reduce((a, b) => a + b) / Object.keys(riskFactors).length);

        if (riskScore < 50) {
            errors.push(`High risk assessment score (${riskScore.toFixed(0)}/100) - application requires manual review`);
        } else if (riskScore < 70) {
            warnings.push(`Moderate risk assessment score (${riskScore.toFixed(0)}/100) - recommend additional verification`);
        }

        return {
            errors,
            warnings,
            riskScore: riskScore.toFixed(0),
            riskLevel: riskScore >= 80 ? 'low' : riskScore >= 60 ? 'medium' : 'high',
            riskFactors,
            requiresManualReview: riskScore < 50
        };
    } catch (error) {
        console.error('Risk assessment error:', error);
        errors.push('Risk assessment process failed: ' + error.message);
        return { errors, warnings, riskScore: 0, riskLevel: 'unknown', requiresManualReview: true };
    }
}

// ================================================================
// 10. BUSINESS RULE VALIDATION
// ================================================================

async function validateBusinessRules(application) {
    const errors = [];
    const warnings = [];

    try {
        // Rule 1: Same origin and destination
        if (application.origin_country === application.destination_country) {
            errors.push('Origin and destination countries cannot be the same');
        }

        // Rule 2: Declaration type must match application type
        const validDeclarations = {
            'import': ['full', 'partial', 'temporary'],
            'export': ['full', 'partial'],
            'transit': ['transit'],
            're-export': ['full', 'partial']
        };

        const appType = application.application_type?.toLowerCase();
        if (appType && validDeclarations[appType]) {
            if (!validDeclarations[appType].includes(application.declaration_type?.toLowerCase())) {
                errors.push(`Declaration type "${application.declaration_type}" is invalid for application type "${application.application_type}"`);
            }
        }

        // Rule 3: Incoterms validation
        const validIncoterms = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'];
        if (application.incoterms && !validIncoterms.includes(application.incoterms.toUpperCase())) {
            errors.push(`Invalid Incoterms value: "${application.incoterms}"`);
        }

        // Rule 4: Currency validation
        const validCurrencies = ['USD', 'SSP', 'EGP', 'KES', 'UGX', 'ETB', 'SDG'];
        if (application.currency && !validCurrencies.includes(application.currency.toUpperCase())) {
            warnings.push(`Currency "${application.currency}" is not standard - may affect calculations`);
        }

        // Rule 5: Payment terms must be specified
        if (!application.payment_terms || application.payment_terms.trim() === '') {
            errors.push('Payment terms are required');
        }

        // Rule 6: Shipping method must be valid
        const validShippingMethods = ['sea', 'air', 'land', 'rail', 'pipeline'];
        if (application.shipping_method && !validShippingMethods.includes(application.shipping_method.toLowerCase())) {
            errors.push(`Invalid shipping method: "${application.shipping_method}"`);
        }

        // Rule 7: Port of entry/exit must be specified
        if (!application.port_of_entry && application.application_type === 'import') {
            errors.push('Port of entry is required for import applications');
        }
        if (!application.port_of_exit && application.application_type === 'export') {
            errors.push('Port of exit is required for export applications');
        }

        return { errors, warnings, allRulesValid: errors.length === 0 };
    } catch (error) {
        console.error('Business rule validation error:', error);
        errors.push('Business rule validation process failed: ' + error.message);
        return { errors, warnings, allRulesValid: false };
    }
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

function getRequiredDocumentTypes(applicationType) {
    // Required documents for all application types
    return ['packing_list', 'bill_of_lading', 'certificate_of_origin', 'import_permit'];
}

// ================================================================
// UPDATE APPLICATION STATUS BASED ON VALIDATION
// ================================================================

export async function updateApplicationStatusAfterValidation(applicationId, validationResults) {
    try {
        console.log('=== UPDATING APPLICATION STATUS AFTER VALIDATION ===');

        if (validationResults.errors.length > 0) {
            // Validation failed - return for correction
            console.log('Validation FAILED - returning application for correction');

            const { data, error } = await supabase
                .from('applications')
                .update({
                    status: 'returned',
                    return_reason: validationResults.errors.join('; '),
                    ai_validation_results: JSON.stringify(validationResults),
                    ai_validation_passed: false,
                    returned_at: new Date().toISOString()
                })
                .eq('id', applicationId)
                .select()
                .single();

            if (error) throw error;

            // Send notifications
            const { data: application } = await supabase
                .from('applications')
                .select('user_id')
                .eq('id', applicationId)
                .single();

            if (application) {
                await sendAIValidationNotification(
                    application.user_id,
                    applicationId,
                    validationResults.errors,
                    validationResults.warnings
                );
            }

            return {
                success: false,
                status: 'returned',
                message: 'Application returned for correction',
                errors: validationResults.errors
            };
        } else {
            // Validation passed - proceed to officer review
            console.log('Validation PASSED - routing to Customs Officer Review');

            const { data, error } = await supabase
                .from('applications')
                .update({
                    status: 'pending_review',
                    ai_validation_results: JSON.stringify(validationResults),
                    ai_validation_passed: true,
                    validated_at: new Date().toISOString()
                })
                .eq('id', applicationId)
                .select()
                .single();

            if (error) throw error;

            // Send success notification
            const { data: application } = await supabase
                .from('applications')
                .select('user_id')
                .eq('id', applicationId)
                .single();

            if (application) {
                await sendApplicationStatusNotification(
                    application.user_id,
                    applicationId,
                    'pending_review',
                    'submitted'
                );
            }

            return {
                success: true,
                status: 'pending_review',
                message: 'Application passed validation and forwarded to Customs Officer Review',
                warnings: validationResults.warnings
            };
        }
    } catch (error) {
        console.error('Update status error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ================================================================
// INSPECTION REPORT AI VALIDATION
// ================================================================

export async function validateInspectionReport(applicationId, inspectionReport) {
    try {
        console.log('=== AI VALIDATING INSPECTION REPORT ===');
        console.log('Application ID:', applicationId);
        console.log('Report:', inspectionReport);

        const { data: application, error: fetchError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (fetchError) throw fetchError;
        if (!application) throw new Error('Application not found');

        const errors = [];
        const warnings = [];

        // 1. Checklist completeness validation
        const checklist = inspectionReport.checklist || {};
        const uncheckedKeys = Object.keys(checklist).filter(k => checklist[k] === false);
        
        // 2. Discrepancy Detection: Check for mismatch between overall result and checklist or text findings
        if (inspectionReport.overall_result === 'passed') {
            if (uncheckedKeys.length > 0) {
                errors.push(`Inspection result is 'Passed' but checklist has unverified items: ${uncheckedKeys.join(', ')}`);
            }
            if (inspectionReport.discrepancies && inspectionReport.discrepancies.trim().length > 0) {
                errors.push("Inspection result is 'Passed' but discrepancies were noted: " + inspectionReport.discrepancies);
            }
        }

        if (inspectionReport.overall_result === 'failed') {
            if (!inspectionReport.discrepancies || inspectionReport.discrepancies.trim().length === 0) {
                errors.push("Inspection result is 'Failed' but no discrepancies are documented.");
            }
        }

        // 3. Photographic evidence verification for high value shipments
        const val = application.declared_value || 0;
        const photoCount = inspectionReport.photos ? inspectionReport.photos.length : 0;
        if (val > 100000 && photoCount === 0) {
            errors.push('High-value shipment (declared value > $100,000) requires photographic evidence.');
        } else if (photoCount === 0 && application.application_type === 'import') {
            warnings.push('No photos attached to import cargo inspection.');
        }

        // 4. Calculate verification score
        let score = 100;
        if (errors.length > 0) {
            score -= errors.length * 20;
        }
        if (warnings.length > 0) {
            score -= warnings.length * 5;
        }
        score = Math.max(0, score);

        const validationResults = {
            validated_at: new Date().toISOString(),
            validation_passed: errors.length === 0,
            validation_score: score,
            errors,
            warnings,
            confidence_level: score > 70 ? 'high' : 'medium'
        };

        return validationResults;
    } catch (error) {
        console.error('AI inspection report validation error:', error);
        return {
            validated_at: new Date().toISOString(),
            validation_passed: false,
            validation_score: 0,
            errors: ['AI validation processing failed: ' + error.message],
            warnings: [],
            confidence_level: 'low'
        };
    }
}

// ================================================================
// UPDATE APPLICATION STATUS AFTER INSPECTION
// ================================================================

export async function updateApplicationStatusAfterInspection(applicationId, validationResults, inspectionReport) {
    try {
        console.log('=== UPDATING APPLICATION STATUS AFTER INSPECTION ===');
        const now = new Date().toISOString();

        // Fetch application details to preserve existing data
        const { data: application } = await supabase
            .from('applications')
            .select('user_id, goods_data')
            .eq('id', applicationId)
            .single();

        if (validationResults.validation_passed) {
            // Validation passed - proceeds to Supervisor
            console.log('AI report validation passed - routing to Supervisor');

            // Find a supervisor user
            const { data: supervisors } = await supabase
                .from('profiles')
                .select('id')
                .eq('role', 'supervisor')
                .limit(1);

            const supervisorId = supervisors && supervisors.length > 0 ? supervisors[0].id : null;

            const existingGoodsData = application?.goods_data || {};
            const updatedGoodsData = {
                ...existingGoodsData,
                inspection_report: inspectionReport,
                ai_validation: validationResults
            };

            const { data, error } = await supabase
                .from('applications')
                .update({
                    status: 'pending_review', // Proceeds to supervisor review
                    supervisor_id: supervisorId,
                    inspected_at: now,
                    goods_data: updatedGoodsData
                })
                .eq('id', applicationId)
                .select()
                .single();

            if (error) throw error;

            if (application) {
                await sendApplicationStatusNotification(
                    application.user_id,
                    applicationId,
                    'pending_review',
                    'inspected'
                );
            }

            return {
                success: true,
                status: 'pending_review',
                message: 'Inspection report passed validation. Forwarded to Supervisor.',
                validationResults
            };
        } else {
            // Validation failed - return for correction
            console.log('AI report validation failed - returning for correction');

            const existingGoodsData = application?.goods_data || {};
            const updatedGoodsData = {
                ...existingGoodsData,
                inspection_report: inspectionReport,
                ai_validation: validationResults
            };

            const { data, error } = await supabase
                .from('applications')
                .update({
                    status: 'returned', // Returned for correction
                    return_reason: 'Inspection report failed AI validation: ' + validationResults.errors.join('; '),
                    inspected_at: now,
                    returned_at: now,
                    goods_data: updatedGoodsData
                })
                .eq('id', applicationId)
                .select()
                .single();

            if (error) throw error;

            if (application) {
                await sendAIValidationNotification(
                    application.user_id,
                    applicationId,
                    validationResults.errors,
                    validationResults.warnings
                );
            }

            return {
                success: false,
                status: 'returned',
                message: 'Inspection report failed AI validation. Returned to trader.',
                validationResults
            };
        }
    } catch (error) {
        console.error('Update status after inspection error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
