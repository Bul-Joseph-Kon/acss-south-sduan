// ================================================================
// AI-POWERED TAX CALCULATION ENGINE
// ================================================================
// Automatically calculates taxes for approved applications
// - Import Duty
// - VAT (Value Added Tax)
// - Excise Duty
// - Processing Fees
// - Other Charges
// ================================================================

import supabase from './supabase.js';

// ================================================================
// TAX RATES CONFIGURATION
// ================================================================

const TAX_RATES = {
    // Import Duty rates by HS code category (simplified)
    importDuty: {
        default: 0.10, // 10% default
        electronics: 0.15,
        machinery: 0.10,
        textiles: 0.20,
        vehicles: 0.25,
        food: 0.05,
        chemicals: 0.12,
        rawMaterials: 0.05
    },
    
    // VAT rates
    vat: {
        standard: 0.18, // 18% standard VAT
        exempt: 0.00,   // Exempt goods
        reduced: 0.10   // Reduced rate
    },
    
    // Excise Duty rates (for specific goods)
    exciseDuty: {
        tobacco: 0.35,
        alcohol: 0.30,
        petroleum: 0.25,
        vehicles: 0.15,
        luxury: 0.20,
        default: 0.00
    },
    
    // Processing fees
    processingFees: {
        cvet: 100,
        directAssessment: 150,
        agentLicense: 50,
        vehicleQuery: 25,
        minimum: 25,
        percentage: 0.005 // 0.5% of customs value, whichever is higher
    },
    
    // Other charges
    otherCharges: {
        storage: 0,
        inspection: 50,
        handling: 25,
        documentation: 20,
        minimum: 20
    }
};

// ================================================================
// AI-POWERED TAX CALCULATION
// ================================================================

export async function calculateTaxesForApplication(applicationId) {
    try {
        console.log('=== AI TAX CALCULATION ===');
        console.log('Application ID:', applicationId);

        // Get application details
        const { data: application, error: fetchError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (fetchError) throw fetchError;
        if (!application) throw new Error('Application not found');

        // Extract customs value
        const customsValue = application.total_amount || application.customs_value || 0;
        const goodsCategory = application.goods_category || application.hs_code_category || 'default';
        const serviceType = application.service_type || application.application_type || 'cvet';

        // Calculate each tax component
        const calculation = {
            applicationId: applicationId,
            applicationNumber: application.application_number,
            customsValue: customsValue,
            timestamp: new Date().toISOString(),
            aiConfidence: 0,
            breakdown: {},
            totalPayable: 0
        };

        // 1. Import Duty Calculation
        const importDutyRate = getImportDutyRate(goodsCategory, application.hs_code);
        calculation.breakdown.importDuty = {
            rate: importDutyRate,
            amount: customsValue * importDutyRate,
            description: `Import Duty at ${(importDutyRate * 100).toFixed(1)}%`
        };

        // 2. VAT Calculation (on customs value + import duty)
        const vatRate = getVATRate(goodsCategory, application.vat_exempt);
        const vatBase = customsValue + calculation.breakdown.importDuty.amount;
        calculation.breakdown.vat = {
            rate: vatRate,
            base: vatBase,
            amount: vatBase * vatRate,
            description: `VAT at ${(vatRate * 100).toFixed(1)}% on (Customs Value + Import Duty)`
        };

        // 3. Excise Duty Calculation
        const exciseDutyRate = getExciseDutyRate(goodsCategory);
        calculation.breakdown.exciseDuty = {
            rate: exciseDutyRate,
            amount: customsValue * exciseDutyRate,
            description: `Excise Duty at ${(exciseDutyRate * 100).toFixed(1)}%`
        };

        // 4. Processing Fees Calculation
        const processingFee = calculateProcessingFee(customsValue, serviceType);
        calculation.breakdown.processingFees = {
            amount: processingFee,
            description: `Processing Fee for ${serviceType}`
        };

        // 5. Other Charges Calculation
        const otherCharges = calculateOtherCharges(application);
        calculation.breakdown.otherCharges = {
            amount: otherCharges,
            description: 'Inspection, handling, and documentation charges'
        };

        // Calculate total
        calculation.totalPayable = 
            calculation.breakdown.importDuty.amount +
            calculation.breakdown.vat.amount +
            calculation.breakdown.exciseDuty.amount +
            calculation.breakdown.processingFees.amount +
            calculation.breakdown.otherCharges.amount;

        // Calculate AI confidence based on data completeness
        calculation.aiConfidence = calculateAIConfidence(application, calculation);

        // Store calculation in database
        await saveTaxCalculation(applicationId, calculation);

        console.log('Tax calculation completed:', calculation);
        return { success: true, data: calculation };
    } catch (error) {
        console.error('Tax calculation error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

function getImportDutyRate(category, hsCode) {
    // If HS code is provided, could look up specific rate
    // For now, use category-based rates
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('electronic')) return TAX_RATES.importDuty.electronics;
    if (categoryLower.includes('machine')) return TAX_RATES.importDuty.machinery;
    if (categoryLower.includes('textile')) return TAX_RATES.importDuty.textiles;
    if (categoryLower.includes('vehicle') || categoryLower.includes('car')) return TAX_RATES.importDuty.vehicles;
    if (categoryLower.includes('food')) return TAX_RATES.importDuty.food;
    if (categoryLower.includes('chemical')) return TAX_RATES.importDuty.chemicals;
    if (categoryLower.includes('raw') || categoryLower.includes('material')) return TAX_RATES.importDuty.rawMaterials;
    
    return TAX_RATES.importDuty.default;
}

function getVATRate(category, isExempt) {
    if (isExempt === true) return TAX_RATES.vat.exempt;
    
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('food') || categoryLower.includes('medicine')) {
        return TAX_RATES.vat.reduced;
    }
    
    return TAX_RATES.vat.standard;
}

function getExciseDutyRate(category) {
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('tobacco')) return TAX_RATES.exciseDuty.tobacco;
    if (categoryLower.includes('alcohol')) return TAX_RATES.exciseDuty.alcohol;
    if (categoryLower.includes('petroleum') || categoryLower.includes('fuel')) return TAX_RATES.exciseDuty.petroleum;
    if (categoryLower.includes('vehicle') || categoryLower.includes('car')) return TAX_RATES.exciseDuty.vehicles;
    if (categoryLower.includes('luxury')) return TAX_RATES.exciseDuty.luxury;
    
    return TAX_RATES.exciseDuty.default;
}

function calculateProcessingFee(customsValue, serviceType) {
    const serviceLower = serviceType.toLowerCase();
    
    // Base fee by service type
    let baseFee = TAX_RATES.processingFees.minimum;
    
    if (serviceLower.includes('cvet')) baseFee = TAX_RATES.processingFees.cvet;
    else if (serviceLower.includes('direct') || serviceLower.includes('assessment')) baseFee = TAX_RATES.processingFees.directAssessment;
    else if (serviceLower.includes('license')) baseFee = TAX_RATES.processingFees.agentLicense;
    else if (serviceLower.includes('vehicle') || serviceLower.includes('query')) baseFee = TAX_RATES.processingFees.vehicleQuery;
    
    // Percentage-based fee (whichever is higher)
    const percentageFee = customsValue * TAX_RATES.processingFees.percentage;
    
    return Math.max(baseFee, percentageFee);
}

function calculateOtherCharges(application) {
    let charges = TAX_RATES.otherCharges.minimum;
    
    // Add inspection fee if physical inspection required
    if (application.requires_inspection === true) {
        charges += TAX_RATES.otherCharges.inspection;
    }
    
    // Add handling fee
    charges += TAX_RATES.otherCharges.handling;
    
    // Add documentation fee
    charges += TAX_RATES.otherCharges.documentation;
    
    // Storage fee (if applicable)
    if (application.storage_days > 0) {
        charges += (application.storage_days * 10); // $10 per day
    }
    
    return charges;
}

function calculateAIConfidence(application, calculation) {
    let confidence = 0.85; // Base confidence
    
    // Increase confidence if HS code is present
    if (application.hs_code) confidence += 0.05;
    
    // Increase confidence if goods category is specific
    if (application.goods_category && application.goods_category !== 'default') confidence += 0.05;
    
    // Increase confidence if customs value is verified
    if (application.customs_value_verified === true) confidence += 0.03;
    
    // Decrease confidence if data is missing
    if (!application.hs_code) confidence -= 0.10;
    if (!application.goods_category) confidence -= 0.05;
    
    return Math.min(Math.max(confidence, 0), 1); // Clamp between 0 and 1
}

// ================================================================
// SAVE TAX CALCULATION
// ================================================================

async function saveTaxCalculation(applicationId, calculation) {
    try {
        const { error } = await supabase
            .from('tax_calculations')
            .upsert({
                application_id: applicationId,
                calculation_data: calculation,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'application_id'
            });

        if (error) throw error;
        
        console.log('Tax calculation saved successfully');
        return { success: true };
    } catch (error) {
        console.error('Error saving tax calculation:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// GET TAX CALCULATION BY APPLICATION ID
// ================================================================

export async function getTaxCalculation(applicationId) {
    try {
        const { data, error } = await supabase
            .from('tax_calculations')
            .select('*')
            .eq('application_id', applicationId)
            .single();

        if (error) throw error;

        return { success: true, data: data?.calculation_data };
    } catch (error) {
        console.error('Error fetching tax calculation:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// VERIFY TAX CALCULATION (REVENUE OFFICER)
// ================================================================

export async function verifyTaxCalculation(applicationId, verificationData) {
    try {
        console.log('=== VERIFYING TAX CALCULATION ===');
        console.log('Application ID:', applicationId);

        // Get current calculation
        const { data: currentCalc } = await getTaxCalculation(applicationId);
        
        if (!currentCalc) {
            throw new Error('No tax calculation found for this application');
        }

        // Update with verification data
        const updatedCalculation = {
            ...currentCalc,
            verified: true,
            verifiedBy: verificationData.officerId,
            verifiedAt: new Date().toISOString(),
            verificationNotes: verificationData.notes,
            adjustments: verificationData.adjustments || {}
        };

        // Apply adjustments if any
        if (verificationData.adjustments) {
            Object.keys(verificationData.adjustments).forEach(key => {
                if (updatedCalculation.breakdown[key]) {
                    updatedCalculation.breakdown[key].adjustedAmount = verificationData.adjustments[key];
                    updatedCalculation.breakdown[key].adjustmentReason = verificationData.adjustmentReasons?.[key];
                }
            });
            
            // Recalculate total with adjustments
            let adjustedTotal = 0;
            Object.keys(updatedCalculation.breakdown).forEach(key => {
                const breakdown = updatedCalculation.breakdown[key];
                adjustedTotal += breakdown.adjustedAmount || breakdown.amount;
            });
            updatedCalculation.totalPayable = adjustedTotal;
        }

        // Save verified calculation
        await saveTaxCalculation(applicationId, updatedCalculation);

        // Update application status to indicate verification complete
        await supabase
            .from('applications')
            .update({
                tax_calculation_verified: true,
                tax_calculation_verified_at: new Date().toISOString(),
                total_payable: updatedCalculation.totalPayable
            })
            .eq('id', applicationId);

        console.log('Tax calculation verified successfully');
        return { success: true, data: updatedCalculation };
    } catch (error) {
        console.error('Verification error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// GENERATE PAYMENT INVOICE
// ================================================================

export async function generatePaymentInvoice(applicationId, invoiceData) {
    try {
        console.log('=== GENERATING PAYMENT INVOICE ===');
        console.log('Application ID:', applicationId);

        // Get application details
        const { data: application, error: appError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (appError) throw appError;

        // Get tax calculation
        const { data: calculation } = await getTaxCalculation(applicationId);
        
        if (!calculation) {
            throw new Error('Tax calculation must be completed before generating invoice');
        }

        // Generate invoice number
        const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

        // Create invoice record
        const invoice = {
            invoice_number: invoiceNumber,
            application_id: applicationId,
            application_number: application.application_number,
            applicant_name: application.applicant_name || application.company_name,
            applicant_email: application.applicant_email,
            calculation_data: calculation,
            total_amount: calculation.totalPayable,
            status: 'pending',
            due_date: invoiceData.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
            created_by: invoiceData.officerId,
            created_at: new Date().toISOString()
        };

        const { data: createdInvoice, error: insertError } = await supabase
            .from('invoices')
            .insert(invoice)
            .select()
            .single();

        if (insertError) throw insertError;

        // Update application status
        await supabase
            .from('applications')
            .update({
                status: 'awaiting_payment',
                invoice_id: createdInvoice.id,
                invoice_number: invoiceNumber,
                updated_at: new Date().toISOString()
            })
            .eq('id', applicationId);

        console.log('Invoice generated successfully:', invoiceNumber);
        return { success: true, data: createdInvoice };
    } catch (error) {
        console.error('Invoice generation error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// GET APPROVED APPLICATIONS FOR REVENUE
// ================================================================

export async function getApprovedApplicationsForRevenue() {
    try {
        const { data, error } = await supabase
            .from('applications')
            .select('*')
            .eq('status', 'approved')
            .order('approved_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        // Filter applications that haven't had tax calculation yet
        const pendingCalculation = data.filter(app => !app.tax_calculation_verified);
        
        return { success: true, data: pendingCalculation };
    } catch (error) {
        console.error('Error fetching approved applications:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// BATCH CALCULATE TAXES FOR MULTIPLE APPLICATIONS
// ================================================================

export async function batchCalculateTaxes(applicationIds) {
    const results = [];
    
    for (const appId of applicationIds) {
        const result = await calculateTaxesForApplication(appId);
        results.push({
            applicationId: appId,
            success: result.success,
            data: result.data,
            error: result.error
        });
    }
    
    return { success: true, data: results };
}
