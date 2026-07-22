/**
 * Recommendation Engine Module
 * Generates AI recommendations based on validation results
 * Can be upgraded to use real LLM for complex reasoning later
 */

export class RecommendationEngine {
    constructor() {
        this.recommendationTypes = {
            proceed: 'Proceed to Customs Officer Review',
            requestDocs: 'Request Additional Documents',
            inspection: 'Inspection Recommended',
            supervisor: 'Supervisor Review Recommended',
            reject: 'Return to Agent for Correction',
            hold: 'Hold for Further Review',
            expedite: 'Expedite Processing'
        };
    }

    /**
     * Generate recommendations based on all validation results
     */
    generateRecommendations(validationResults, riskAssessment, fraudDetection) {
        const recommendations = [];
        
        // Primary recommendation based on overall validation
        const primary = this.generatePrimaryRecommendation(validationResults, riskAssessment, fraudDetection);
        recommendations.push(primary);

        // Secondary recommendations based on specific issues
        const secondary = this.generateSecondaryRecommendations(validationResults, riskAssessment, fraudDetection);
        recommendations.push(...secondary);

        // Action items
        const actions = this.generateActionItems(validationResults, riskAssessment, fraudDetection);
        
        return {
            primary: primary,
            secondary: secondary,
            actions: actions,
            summary: this.generateSummary(recommendations, riskAssessment)
        };
    }

    /**
     * Generate primary recommendation
     */
    generatePrimaryRecommendation(validationResults, riskAssessment, fraudDetection) {
        const { riskLevel, requiresInspection, requiresAdditionalReview } = riskAssessment;
        const { fraudDetected, highSeverityIndicators } = fraudDetection;

        // High fraud risk with high severity indicators
        if (fraudDetected && highSeverityIndicators > 2) {
            return {
                type: this.recommendationTypes.reject,
                priority: 'critical',
                reason: 'Multiple high-severity fraud indicators detected',
                confidence: 0.9
            };
        }

        // High risk requiring inspection
        if (riskLevel === 'high' && requiresInspection) {
            return {
                type: this.recommendationTypes.inspection,
                priority: 'high',
                reason: 'High risk assessment requires physical inspection',
                confidence: 0.85
            };
        }

        // Medium risk with additional review needed
        if (riskLevel === 'medium' && requiresAdditionalReview) {
            return {
                type: this.recommendationTypes.supervisor,
                priority: 'medium',
                reason: 'Medium risk requires supervisor review',
                confidence: 0.75
            };
        }

        // Missing documents
        if (validationResults.documentValidation && 
            validationResults.documentValidation.missingDocuments.length > 0) {
            return {
                type: this.recommendationTypes.requestDocs,
                priority: 'high',
                reason: 'Required documents are missing',
                confidence: 0.95
            };
        }

        // Low risk - proceed normally
        if (riskLevel === 'low' && !fraudDetected) {
            return {
                type: this.recommendationTypes.proceed,
                priority: 'low',
                reason: 'Low risk application with no fraud indicators',
                confidence: 0.9
            };
        }

        // Default - proceed with review
        return {
            type: this.recommendationTypes.proceed,
            priority: 'medium',
            reason: 'Standard processing workflow',
            confidence: 0.7
        };
    }

    /**
     * Generate secondary recommendations
     */
    generateSecondaryRecommendations(validationResults, riskAssessment, fraudDetection) {
        const recommendations = [];

        // Document-related recommendations
        if (validationResults.documentValidation) {
            const { missingDocuments, invalidDocuments, ocrConfidence } = validationResults.documentValidation;
            
            if (missingDocuments.length > 0) {
                recommendations.push({
                    type: 'Upload Missing Documents',
                    priority: 'high',
                    details: `Missing: ${missingDocuments.join(', ')}`
                });
            }

            if (invalidDocuments.length > 0) {
                recommendations.push({
                    type: 'Fix Invalid Documents',
                    priority: 'medium',
                    details: `${invalidDocuments.length} documents have issues`
                });
            }

            if (ocrConfidence < 50) {
                recommendations.push({
                    type: 'Manual Document Review',
                    priority: 'medium',
                    details: 'OCR confidence low, manual review recommended'
                });
            }
        }

        // HS code recommendations
        if (validationResults.hsCodeValidation) {
            const mismatches = validationResults.hsCodeValidation.filter(r => 
                r.validation.status === 'Potential Mismatch'
            );
            
            if (mismatches.length > 0) {
                recommendations.push({
                    type: 'Verify HS Codes',
                    priority: 'medium',
                    details: `${mismatches.length} HS codes may not match descriptions`
                });
            }
        }

        // Value-related recommendations
        if (validationResults.valueValidation) {
            const { status, discrepancyPercent } = validationResults.valueValidation;
            
            if (status === 'Possible Under Valuation' || status === 'Possible Over Valuation') {
                recommendations.push({
                    type: 'Verify Declared Values',
                    priority: 'high',
                    details: `${discrepancyPercent.toFixed(1)}% discrepancy detected`
                });
            }
        }

        // Fraud-related recommendations
        if (fraudDetection.indicators && fraudDetection.indicators.length > 0) {
            const highSeverity = fraudDetection.indicators.filter(i => i.severity === 'high');
            
            if (highSeverity.length > 0) {
                recommendations.push({
                    type: 'Fraud Investigation',
                    priority: 'high',
                    details: `${highSeverity.length} high-severity fraud indicators`
                });
            }
        }

        // Risk-based recommendations
        if (riskAssessment.breakdown) {
            const { fraudRisk, complianceRisk, valueRisk } = riskAssessment.breakdown;
            
            if (fraudRisk > 50) {
                recommendations.push({
                    type: 'Enhanced Screening',
                    priority: 'high',
                    details: 'High fraud risk detected'
                });
            }

            if (complianceRisk > 50) {
                recommendations.push({
                    type: 'Compliance Review',
                    priority: 'medium',
                    details: 'Compliance issues detected'
                });
            }

            if (valueRisk > 50) {
                recommendations.push({
                    type: 'Value Verification',
                    priority: 'medium',
                    details: 'Value verification required'
                });
            }
        }

        return recommendations;
    }

    /**
     * Generate action items
     */
    generateActionItems(validationResults, riskAssessment, fraudDetection) {
        const actions = [];

        // Document actions
        if (validationResults.documentValidation) {
            validationResults.documentValidation.missingDocuments.forEach(doc => {
                actions.push({
                    action: `Upload ${doc}`,
                    assignedTo: 'Agent',
                    priority: 'high',
                    deadline: 'Immediate'
                });
            });
        }

        // HS code actions
        if (validationResults.hsCodeValidation) {
            validationResults.hsCodeValidation.filter(r => 
                r.validation.status === 'Potential Mismatch'
            ).forEach(item => {
                actions.push({
                    action: `Verify HS code for item ${item.itemId}`,
                    assignedTo: 'Customs Officer',
                    priority: 'medium',
                    deadline: 'Within 24 hours'
                });
            });
        }

        // Value verification actions
        if (validationResults.valueValidation && 
            (validationResults.valueValidation.status === 'Possible Under Valuation' ||
             validationResults.valueValidation.status === 'Possible Over Valuation')) {
            actions.push({
                action: 'Verify invoice and declared values',
                assignedTo: 'Customs Officer',
                priority: 'high',
                deadline: 'Within 24 hours'
            });
        }

        // Inspection actions
        if (riskAssessment.requiresInspection) {
            actions.push({
                action: 'Schedule physical inspection',
                assignedTo: 'Inspection Team',
                priority: 'high',
                deadline: 'Within 48 hours'
            });
        }

        // Supervisor review actions
        if (riskAssessment.requiresAdditionalReview) {
            actions.push({
                action: 'Supervisor review required',
                assignedTo: 'Supervisor',
                priority: 'medium',
                deadline: 'Within 24 hours'
            });
        }

        return actions;
    }

    /**
     * Generate summary of recommendations
     */
    generateSummary(recommendations, riskAssessment) {
        const { primary, secondary, actions } = recommendations;
        
        return {
            primaryAction: primary.type,
            priority: primary.priority,
            totalRecommendations: secondary.length,
            totalActions: actions.length,
            estimatedProcessingTime: this.estimateProcessingTime(riskAssessment),
            nextSteps: this.getNextSteps(recommendations, riskAssessment)
        };
    }

    /**
     * Estimate processing time based on risk
     */
    estimateProcessingTime(riskAssessment) {
        const { riskLevel } = riskAssessment;
        
        const timeEstimates = {
            low: '2-4 hours',
            medium: '1-2 days',
            high: '3-5 days'
        };

        return timeEstimates[riskLevel] || '1-2 days';
    }

    /**
     * Get next steps
     */
    getNextSteps(recommendations, riskAssessment) {
        const steps = [];
        const { primary } = recommendations;

        switch (primary.type) {
            case this.recommendationTypes.proceed:
                steps.push('Assign to customs officer for review');
                steps.push('Standard processing workflow');
                break;
            case this.recommendationTypes.requestDocs:
                steps.push('Notify agent of missing documents');
                steps.push('Await document upload');
                steps.push('Re-validate after documents received');
                break;
            case this.recommendationTypes.inspection:
                steps.push('Schedule physical inspection');
                steps.push('Assign inspection team');
                steps.push('Await inspection results');
                break;
            case this.recommendationTypes.supervisor:
                steps.push('Escalate to supervisor');
                steps.push('Await supervisor review');
                steps.push('Follow supervisor recommendations');
                break;
            case this.recommendationTypes.reject:
                steps.push('Return application to agent');
                steps.push('Provide detailed rejection reasons');
                steps.push('Await resubmission');
                break;
            default:
                steps.push('Standard processing workflow');
        }

        return steps;
    }

    /**
     * Format recommendations for display
     */
    formatForDisplay(recommendations) {
        return {
            primary: {
                text: recommendations.primary.type,
                priority: recommendations.primary.priority,
                reason: recommendations.primary.reason,
                icon: this.getIconForRecommendation(recommendations.primary.type)
            },
            secondary: recommendations.secondary.map(rec => ({
                text: rec.type,
                priority: rec.priority,
                details: rec.details
            })),
            actions: recommendations.actions.map(action => ({
                action: action.action,
                assignedTo: action.assignedTo,
                priority: action.priority,
                deadline: action.deadline
            }))
        };
    }

    /**
     * Get icon for recommendation type
     */
    getIconForRecommendation(type) {
        const icons = {
            [this.recommendationTypes.proceed]: 'ri-check-line',
            [this.recommendationTypes.requestDocs]: 'ri-file-upload-line',
            [this.recommendationTypes.inspection]: 'ri-search-eye-line',
            [this.recommendationTypes.supervisor]: 'ri-user-star-line',
            [this.recommendationTypes.reject]: 'ri-close-circle-line',
            [this.recommendationTypes.hold]: 'ri-pause-circle-line',
            [this.recommendationTypes.expedite]: 'ri-flashlight-line'
        };

        return icons[type] || 'ri-information-line';
    }
}

export default RecommendationEngine;
