/**
 * AI Validation Service
 * Main orchestrator for AI validation engine
 * Coordinates all validation modules and generates comprehensive reports
 * Can be upgraded to use real LLM/AI services later
 */

import { DocumentValidator } from './documentValidator.js';
import { HSCodeValidator } from './hsCodeValidator.js';
import { ValueValidator } from './valueValidator.js';
import { FraudDetector } from './fraudDetector.js';
import { RiskAssessment } from './riskAssessment.js';
import { RecommendationEngine } from './recommendationEngine.js';

export class AIValidationService {
    constructor() {
        this.documentValidator = new DocumentValidator();
        this.hsCodeValidator = new HSCodeValidator();
        this.valueValidator = new ValueValidator();
        this.fraudDetector = new FraudDetector();
        this.riskAssessment = new RiskAssessment();
        this.recommendationEngine = new RecommendationEngine();
    }

    /**
     * Perform complete AI validation on an application
     */
    async validateApplication(applicationData, existingApplications = []) {
        const startTime = Date.now();
        
        try {
            // 1. Validate documents
            const documentValidation = this.documentValidator.validateDocuments(
                applicationData.documents
            );

            // 2. Validate HS codes
            const hsCodeValidation = this.hsCodeValidator.validateBatch(
                applicationData.goods_data || []
            );

            // 3. Validate customs values
            const valueValidation = this.valueValidator.validateCustomsValue(
                applicationData.invoice_value,
                applicationData.declared_value,
                applicationData.goods_data
            );

            // 4. Validate item values
            const itemValueValidation = this.valueValidator.validateItemValues(
                applicationData.goods_data
            );

            // 5. Detect suspicious value patterns
            const suspiciousPatterns = this.valueValidator.detectSuspiciousPatterns(
                applicationData.goods_data
            );

            // 6. Detect fraud indicators
            const fraudDetection = this.fraudDetector.detectFraaindicators(
                applicationData,
                existingApplications
            );

            // 7. Assess overall risk
            const validationResults = {
                documentValidation,
                hsCodeValidation,
                valueValidation,
                itemValueValidation,
                suspiciousPatterns
            };

            const riskAssessment = this.riskAssessment.assessRisk(
                validationResults,
                fraudDetection,
                existingApplications
            );

            // 8. Generate recommendations
            const recommendations = this.recommendationEngine.generateRecommendations(
                validationResults,
                riskAssessment,
                fraudDetection
            );

            // 9. Determine if validation passed
            const validationPassed = this.determineValidationPassed(
                validationResults,
                riskAssessment,
                fraudDetection
            );

            const processingTime = Date.now() - startTime;

            // 10. Generate comprehensive report
            const report = this.generateValidationReport({
                applicationId: applicationData.id,
                applicationNumber: applicationData.application_number,
                validationPassed,
                validationResults,
                fraudDetection,
                riskAssessment,
                recommendations,
                processingTime,
                validatedAt: new Date().toISOString()
            });

            return {
                success: true,
                validationPassed,
                report,
                data: {
                    validationResults,
                    fraudDetection,
                    riskAssessment,
                    recommendations
                }
            };

        } catch (error) {
            console.error('AI Validation Error:', error);
            return {
                success: false,
                error: error.message,
                validationPassed: false
            };
        }
    }

    /**
     * Determine if validation passed overall
     */
    determineValidationPassed(validationResults, riskAssessment, fraudDetection) {
        // Critical failures
        if (fraudDetection.fraudDetected && fraudDetection.highSeverityIndicators > 2) {
            return false;
        }

        if (riskAssessment.riskLevel === 'high' && riskAssessment.requiresInspection) {
            return false;
        }

        // Document validation
        const { documentValidation } = validationResults;
        if (documentValidation.missingDocuments.length > 2) {
            return false;
        }

        // Value validation
        const { valueValidation } = validationResults;
        if (valueValidation.status === 'Possible Under Valuation' && 
            valueValidation.discrepancyPercent > 30) {
            return false;
        }

        // HS code validation
        const { hsCodeValidation } = validationResults;
        const invalidCodes = hsCodeValidation.filter(r => r.validation.status === 'Invalid');
        if (invalidCodes.length > 0) {
            return false;
        }

        return true;
    }

    /**
     * Generate comprehensive validation report
     */
    generateValidationReport(data) {
        const {
            applicationId,
            applicationNumber,
            validationPassed,
            validationResults,
            fraudDetection,
            riskAssessment,
            recommendations,
            processingTime,
            validatedAt
        } = data;

        return {
            summary: {
                applicationId,
                applicationNumber,
                validationPassed,
                overallRiskScore: riskAssessment.overallRiskScore,
                riskLevel: riskAssessment.riskLevel,
                fraudDetected: fraudDetection.fraudDetected,
                processingTimeMs: processingTime,
                validatedAt
            },
            documentChecks: {
                totalDocuments: validationResults.documentValidation.totalDocuments,
                requiredDocuments: validationResults.documentValidation.requiredDocuments,
                missingDocuments: validationResults.documentValidation.missingDocuments,
                invalidDocuments: validationResults.documentValidation.invalidDocuments.length,
                ocrProcessed: validationResults.documentValidation.ocrProcessed,
                ocrConfidence: validationResults.documentValidation.ocrConfidence,
                overallScore: validationResults.documentValidation.overallScore
            },
            hsCodeChecks: {
                totalItems: validationResults.hsCodeValidation.length,
                validCodes: validationResults.hsCodeValidation.filter(r => r.validation.status === 'Valid').length,
                invalidCodes: validationResults.hsCodeValidation.filter(r => r.validation.status === 'Invalid').length,
                potentialMismatches: validationResults.hsCodeValidation.filter(r => r.validation.status === 'Potential Mismatch').length,
                averageConfidence: this.calculateAverageConfidence(validationResults.hsCodeValidation)
            },
            valueChecks: {
                invoiceValue: validationResults.valueValidation.invoiceValue,
                declaredValue: validationResults.valueValidation.declaredValue,
                status: validationResults.valueValidation.status,
                discrepancyPercent: validationResults.valueValidation.discrepancyPercent,
                confidence: validationResults.valueValidation.confidence
            },
            fraudIndicators: {
                fraudDetected: fraudDetection.fraudDetected,
                fraudRiskScore: fraudDetection.fraudRiskScore,
                totalIndicators: fraudDetection.totalIndicators,
                highSeverityIndicators: fraudDetection.highSeverityIndicators,
                indicators: fraudDetection.indicators
            },
            riskAssessment: {
                overallRiskScore: riskAssessment.overallRiskScore,
                riskLevel: riskAssessment.riskLevel,
                colorCode: riskAssessment.colorCode,
                requiresInspection: riskAssessment.requiresInspection,
                requiresAdditionalReview: riskAssessment.requiresAdditionalReview,
                breakdown: riskAssessment.breakdown
            },
            recommendations: {
                primary: recommendations.primary,
                secondary: recommendations.secondary,
                actions: recommendations.actions,
                summary: recommendations.summary
            },
            metadata: {
                engineVersion: '1.0.0',
                engineType: 'internal-rule-based',
                processingTimeMs: processingTime,
                validatedAt,
                canBeUpgradedToLLM: true
            }
        };
    }

    /**
     * Calculate average confidence from HS code validations
     */
    calculateAverageConfidence(hsCodeValidations) {
        if (!hsCodeValidations || hsCodeValidations.length === 0) return 0;
        
        const totalConfidence = hsCodeValidations.reduce((sum, r) => {
            return sum + (r.validation.confidence || 0);
        }, 0);

        return Math.round(totalConfidence / hsCodeValidations.length);
    }

    /**
     * Format report for database storage
     */
    formatForDatabase(report) {
        return {
            application_id: report.summary.applicationId,
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
    }

    /**
     * Validate single item (for partial validation)
     */
    async validateItem(itemData) {
        const hsCodeValidation = this.hsCodeValidator.validateHSCode(
            itemData.hs_code,
            itemData.commodity_description
        );

        const valueValidation = this.valueValidator.validateCustomsValue(
            itemData.invoice_value,
            itemData.customs_value,
            [itemData]
        );

        return {
            itemId: itemData.id,
            hsCodeValidation,
            valueValidation,
            overallValid: hsCodeValidation.status !== 'Invalid' && 
                        valueValidation.status !== 'Invalid'
        };
    }

    /**
     * Batch validate multiple applications
     */
    async validateBatch(applications) {
        const results = [];

        for (const app of applications) {
            const result = await this.validateApplication(app);
            results.push({
                applicationId: app.id,
                applicationNumber: app.application_number,
                ...result
            });
        }

        return {
            total: applications.length,
            passed: results.filter(r => r.validationPassed).length,
            failed: results.filter(r => !r.validationPassed).length,
            results
        };
    }

    /**
     * Get validation statistics
     */
    getStatistics(validationResults) {
        return {
            totalValidations: validationResults.length,
            averageProcessingTime: this.calculateAverageProcessingTime(validationResults),
            passRate: this.calculatePassRate(validationResults),
            averageRiskScore: this.calculateAverageRiskScore(validationResults),
            commonIssues: this.identifyCommonIssues(validationResults)
        };
    }

    /**
     * Calculate average processing time
     */
    calculateAverageProcessingTime(validationResults) {
        if (!validationResults || validationResults.length === 0) return 0;
        
        const totalTime = validationResults.reduce((sum, r) => {
            return sum + (r.report?.summary?.processingTimeMs || 0);
        }, 0);

        return Math.round(totalTime / validationResults.length);
    }

    /**
     * Calculate pass rate
     */
    calculatePassRate(validationResults) {
        if (!validationResults || validationResults.length === 0) return 0;
        
        const passed = validationResults.filter(r => r.validationPassed).length;
        return Math.round((passed / validationResults.length) * 100);
    }

    /**
     * Calculate average risk score
     */
    calculateAverageRiskScore(validationResults) {
        if (!validationResults || validationResults.length === 0) return 0;
        
        const totalRisk = validationResults.reduce((sum, r) => {
            return sum + (r.report?.summary?.overallRiskScore || 0);
        }, 0);

        return Math.round(totalRisk / validationResults.length);
    }

    /**
     * Identify common validation issues
     */
    identifyCommonIssues(validationResults) {
        const issues = {};

        validationResults.forEach(result => {
            const { documentChecks, hsCodeChecks, valueChecks } = result.report;

            // Document issues
            documentChecks.missingDocuments.forEach(doc => {
                issues[doc] = (issues[doc] || 0) + 1;
            });

            // HS code issues
            if (hsCodeChecks.invalidCodes > 0) {
                issues['Invalid HS Codes'] = (issues['Invalid HS Codes'] || 0) + 1;
            }

            // Value issues
            if (valueChecks.status !== 'Match') {
                issues['Value Discrepancies'] = (issues['Value Discrepancies'] || 0) + 1;
            }
        });

        return Object.entries(issues)
            .sort((a, b) => b[1] - a[1])
            .map(([issue, count]) => ({ issue, count }));
    }
}

export default AIValidationService;
