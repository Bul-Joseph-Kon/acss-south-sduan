/**
 * Risk Assessment Module
 * Calculates overall risk score for customs declarations
 * Can be upgraded to use real ML models later
 */

export class RiskAssessment {
    constructor() {
        this.riskFactors = {
            fraudRisk: { weight: 0.35 },
            complianceRisk: { weight: 0.25 },
            valueRisk: { weight: 0.20 },
            documentationRisk: { weight: 0.15 },
            historicalRisk: { weight: 0.05 }
        };
    }

    /**
     * Calculate overall risk assessment
     */
    assessRisk(validationResults, fraudDetection, applicationHistory = []) {
        const scores = {
            fraudRisk: this.calculateFraudRisk(fraudDetection),
            complianceRisk: this.calculateComplianceRisk(validationResults),
            valueRisk: this.calculateValueRisk(validationResults),
            documentationRisk: this.calculateDocumentationRisk(validationResults),
            historicalRisk: this.calculateHistoricalRisk(applicationHistory)
        };

        // Calculate weighted overall score
        const overallScore = 
            scores.fraudRisk * this.riskFactors.fraudRisk.weight +
            scores.complianceRisk * this.riskFactors.complianceRisk.weight +
            scores.valueRisk * this.riskFactors.valueRisk.weight +
            scores.documentationRisk * this.riskFactors.documentationRisk.weight +
            scores.historicalRisk * this.riskFactors.historicalRisk.weight;

        const riskLevel = this.getRiskLevel(overallScore);
        const colorCode = this.getColorCode(riskLevel);

        return {
            overallRiskScore: Math.round(overallScore),
            riskLevel,
            colorCode,
            requiresInspection: riskLevel === 'high',
            requiresAdditionalReview: riskLevel === 'medium' || riskLevel === 'high',
            breakdown: scores,
            factors: this.getRiskFactors(scores)
        };
    }

    /**
     * Calculate fraud risk score
     */
    calculateFraudRisk(fraudDetection) {
        if (!fraudDetection) return 0;
        return fraudDetection.fraudRiskScore || 0;
    }

    /**
     * Calculate compliance risk score
     */
    calculateComplianceRisk(validationResults) {
        if (!validationResults) return 0;

        let riskScore = 0;

        // Check HS code validation
        if (validationResults.hsCodeValidation) {
            const invalidCodes = validationResults.hsCodeValidation.filter(r => r.validation.status === 'Invalid' || r.validation.status === 'Potential Mismatch');
            riskScore += (invalidCodes.length / (validationResults.hsCodeValidation.length || 1)) * 30;
        }

        // Check for regulatory violations
        if (validationResults.regulatoryChecks) {
            const violations = validationResults.regulatoryChecks.filter(c => !c.compliant);
            riskScore += (violations.length / (validationResults.regulatoryChecks.length || 1)) * 25;
        }

        return Math.min(100, riskScore);
    }

    /**
     * Calculate value risk score
     */
    calculateValueRisk(validationResults) {
        if (!validationResults) return 0;

        let riskScore = 0;

        // Check value discrepancies
        if (validationResults.valueValidation) {
            const discrepancy = validationResults.valueValidation.discrepancyPercent || 0;
            if (discrepancy > 30) {
                riskScore += 50;
            } else if (discrepancy > 15) {
                riskScore += 30;
            } else if (discrepancy > 5) {
                riskScore += 15;
            }
        }

        // Check for suspicious patterns
        if (validationResults.suspiciousPatterns && validationResults.suspiciousPatterns.length > 0) {
            const highSeverity = validationResults.suspiciousPatterns.filter(p => p.severity === 'high').length;
            riskScore += highSeverity * 20;
        }

        return Math.min(100, riskScore);
    }

    /**
     * Calculate documentation risk score
     */
    calculateDocumentationRisk(validationResults) {
        if (!validationResults || !validationResults.documentValidation) return 0;

        const docValidation = validationResults.documentValidation;
        
        // Risk based on missing documents
        const missingRatio = docValidation.missingDocuments.length / docValidation.requiredDocuments;
        let riskScore = missingRatio * 60;

        // Risk based on invalid documents
        const invalidRatio = docValidation.invalidDocuments.length / (docValidation.totalDocuments || 1);
        riskScore += invalidRatio * 40;

        // Risk based on OCR confidence
        if (docValidation.ocrConfidence < 50) {
            riskScore += 30;
        }

        return Math.min(100, riskScore);
    }

    /**
     * Calculate historical risk score
     */
    calculateHistoricalRisk(applicationHistory) {
        if (!applicationHistory || applicationHistory.length === 0) return 0;

        let riskScore = 0;

        // Check for previous violations
        const violations = applicationHistory.filter(app => 
            app.status === 'rejected' || app.status === 'returned'
        );
        
        if (violations.length > 0) {
            riskScore += (violations.length / applicationHistory.length) * 40;
        }

        // Check for recent submissions (potential rapid submission pattern)
        const recentSubmissions = applicationHistory.filter(app => {
            const daysSinceSubmission = (Date.now() - new Date(app.created_at)) / (1000 * 60 * 60 * 24);
            return daysSinceSubmission < 7;
        });

        if (recentSubmissions.length > 5) {
            riskScore += 25;
        }

        return Math.min(100, riskScore);
    }

    /**
     * Get risk level from score
     */
    getRiskLevel(score) {
        if (score >= 70) return 'high';
        if (score >= 40) return 'medium';
        return 'low';
    }

    /**
     * Get color code for risk level
     */
    getColorCode(riskLevel) {
        const colors = {
            low: 'green',
            medium: 'yellow',
            high: 'red'
        };
        return colors[riskLevel] || 'gray';
    }

    /**
     * Get detailed risk factors
     */
    getRiskFactors(scores) {
        return Object.entries(scores).map(([factor, score]) => ({
            factor,
            score: Math.round(score),
            weight: this.riskFactors[factor]?.weight || 0,
            contribution: Math.round(score * (this.riskFactors[factor]?.weight || 0)),
            level: this.getRiskLevel(score)
        }));
    }

    /**
     * Generate risk assessment report
     */
    generateReport(riskAssessment) {
        const { overallRiskScore, riskLevel, colorCode, requiresInspection, requiresAdditionalReview, breakdown, factors } = riskAssessment;

        return {
            summary: {
                overallRiskScore,
                riskLevel,
                colorCode,
                requiresInspection,
                requiresAdditionalReview
            },
            breakdown: {
                fraudRisk: Math.round(breakdown.fraudRisk),
                complianceRisk: Math.round(breakdown.complianceRisk),
                valueRisk: Math.round(breakdown.valueRisk),
                documentationRisk: Math.round(breakdown.documentationRisk),
                historicalRisk: Math.round(breakdown.historicalRisk)
            },
            factors: factors.sort((a, b) => b.contribution - a.contribution),
            recommendations: this.generateRiskRecommendations(riskAssessment)
        };
    }

    /**
     * Generate recommendations based on risk assessment
     */
    generateRiskRecommendations(riskAssessment) {
        const recommendations = [];
        const { riskLevel, requiresInspection, requiresAdditionalReview, breakdown } = riskAssessment;

        if (requiresInspection) {
            recommendations.push('Physical inspection recommended');
            recommendations.push('Assign to senior customs officer');
        }

        if (requiresAdditionalReview) {
            recommendations.push('Additional documentation review required');
        }

        if (breakdown.fraudRisk > 50) {
            recommendations.push('Enhanced fraud screening recommended');
        }

        if (breakdown.documentationRisk > 50) {
            recommendations.push('Request additional supporting documents');
        }

        if (breakdown.valueRisk > 50) {
            recommendations.push('Verify declared values with invoice');
        }

        if (breakdown.complianceRisk > 50) {
            recommendations.push('Verify HS codes and regulatory compliance');
        }

        if (riskLevel === 'low') {
            recommendations.push('Standard processing workflow');
        }

        return recommendations;
    }

    /**
     * Compare risk with threshold
     */
    compareWithThreshold(riskAssessment, threshold = 50) {
        return {
            exceedsThreshold: riskAssessment.overallRiskScore >= threshold,
            difference: riskAssessment.overallRiskScore - threshold,
            actionRequired: riskAssessment.overallRiskScore >= threshold
        };
    }
}

export default RiskAssessment;
