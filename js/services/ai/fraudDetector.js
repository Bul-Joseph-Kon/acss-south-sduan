/**
 * Fraud Detector Module
 * Detects potential fraud indicators in customs declarations
 * Can be upgraded to use real ML models later
 */

export class FraudDetector {
    constructor() {
        this.indicators = {
            missingDocuments: { weight: 30, severity: 'high' },
            suspiciousValues: { weight: 25, severity: 'medium' },
            duplicateDeclarations: { weight: 40, severity: 'high' },
            invalidHSCodes: { weight: 20, severity: 'medium' },
            valueDiscrepancies: { weight: 25, severity: 'medium' },
            roundNumbers: { weight: 15, severity: 'low' },
            zeroValues: { weight: 35, severity: 'high' },
            inconsistentData: { weight: 20, severity: 'medium' },
            rapidSubmissions: { weight: 25, severity: 'medium' },
            unusualPatterns: { weight: 20, severity: 'low' }
        };
    }

    /**
     * Detect fraud indicators in a declaration
     */
    detectFraindicators(applicationData, existingApplications = []) {
        const indicators = [];
        let totalRiskScore = 0;

        // Check for missing documents
        const docIndicators = this.checkMissingDocuments(applicationData.documents);
        indicators.push(...docIndicators);
        totalRiskScore += docIndicators.reduce((sum, i) => sum + this.indicators[i.type].weight, 0);

        // Check for suspicious values
        const valueIndicators = this.checkSuspiciousValues(applicationData.goods_data);
        indicators.push(...valueIndicators);
        totalRiskScore += valueIndicators.reduce((sum, i) => sum + this.indicators[i.type].weight, 0);

        // Check for duplicate declarations
        const duplicateIndicators = this.checkDuplicates(applicationData, existingApplications);
        indicators.push(...duplicateIndicators);
        totalRiskScore += duplicateIndicators.reduce((sum, i) => sum + this.indicators[i.type].weight, 0);

        // Check for invalid HS codes
        const hsIndicators = this.checkInvalidHSCodes(applicationData.goods_data);
        indicators.push(...hsIndicators);
        totalRiskScore += hsIndicators.reduce((sum, i) => sum + this.indicators[i.type].weight, 0);

        // Check for value discrepancies
        const valueDiscrepancyIndicators = this.checkValueDiscrepancies(applicationData);
        indicators.push(...valueDiscrepancyIndicators);
        totalRiskScore += valueDiscrepancyIndicators.reduce((sum, i) => sum + this.indicators[i.type].weight, 0);

        // Check for inconsistent data
        const inconsistencyIndicators = this.checkInconsistencies(applicationData);
        indicators.push(...inconsistencyIndicators);
        totalRiskScore += inconsistencyIndicators.reduce((sum, i) => sum + this.indicators[i.type].weight, 0);

        // Calculate overall fraud risk
        const maxPossibleScore = Object.values(this.indicators).reduce((sum, i) => sum + i.weight, 0);
        const fraudRiskScore = Math.min(100, (totalRiskScore / maxPossibleScore) * 100);

        return {
            fraudDetected: fraudRiskScore > 50,
            fraudRiskScore: Math.round(fraudRiskScore),
            indicators,
            totalIndicators: indicators.length,
            highSeverityIndicators: indicators.filter(i => this.indicators[i.type]?.severity === 'high').length
        };
    }

    /**
     * Check for missing documents
     */
    checkMissingDocuments(documents) {
        const indicators = [];
        const requiredDocs = ['commercial_invoice', 'packing_list', 'bill_of_lading'];
        
        if (!documents || documents.length === 0) {
            indicators.push({
                type: 'missingDocuments',
                severity: 'high',
                message: 'No documents uploaded',
                recommendation: 'Upload all required documents'
            });
            return indicators;
        }

        const uploadedTypes = documents.map(d => d.document_type);
        requiredDocs.forEach(reqType => {
            if (!uploadedTypes.includes(reqType)) {
                indicators.push({
                    type: 'missingDocuments',
                    severity: 'high',
                    message: `Missing required document: ${reqType}`,
                    recommendation: `Upload ${reqType}`
                });
            }
        });

        return indicators;
    }

    /**
     * Check for suspicious values
     */
    checkSuspiciousValues(goodsData) {
        const indicators = [];

        if (!goodsData || !Array.isArray(goodsData)) {
            return indicators;
        }

        goodsData.forEach(item => {
            const unitPrice = parseFloat(item.unit_price) || 0;
            const quantity = parseFloat(item.quantity) || 0;

            // Check for zero values
            if (unitPrice === 0 && quantity > 0) {
                indicators.push({
                    type: 'zeroValues',
                    severity: 'high',
                    message: `Item has zero unit price`,
                    itemId: item.id,
                    recommendation: 'Verify unit price is correct'
                });
            }

            // Check for suspiciously round numbers
            if (this.isRoundNumber(unitPrice) && unitPrice > 1000) {
                indicators.push({
                    type: 'roundNumbers',
                    severity: 'low',
                    message: `Suspiciously round unit price: ${unitPrice}`,
                    itemId: item.id,
                    recommendation: 'Verify price accuracy'
                });
            }

            // Check for unusually high quantities
            if (quantity > 10000) {
                indicators.push({
                    type: 'suspiciousValues',
                    severity: 'medium',
                    message: `Unusually high quantity: ${quantity}`,
                    itemId: item.id,
                    recommendation: 'Verify quantity is correct'
                });
            }
        });

        return indicators;
    }

    /**
     * Check for duplicate declarations
     */
    checkDuplicates(applicationData, existingApplications) {
        const indicators = [];

        if (!existingApplications || existingApplications.length === 0) {
            return indicators;
        }

        const currentApp = {
            declarationNumber: applicationData.application_number,
            importer: applicationData.importer_id,
            exporter: applicationData.exporter_id,
            invoiceNumber: applicationData.invoice_number,
            containerNumber: applicationData.container_number
        };

        existingApplications.forEach(app => {
            // Check for duplicate declaration number
            if (app.application_number === currentApp.declarationNumber && app.id !== applicationData.id) {
                indicators.push({
                    type: 'duplicateDeclarations',
                    severity: 'high',
                    message: 'Duplicate declaration number found',
                    recommendation: 'Verify declaration number is unique'
                });
            }

            // Check for duplicate invoice number
            if (app.invoice_number === currentApp.invoiceNumber && app.id !== applicationData.id) {
                indicators.push({
                    type: 'duplicateDeclarations',
                    severity: 'high',
                    message: 'Duplicate invoice number found',
                    recommendation: 'Verify invoice number is unique'
                });
            }

            // Check for duplicate container number
            if (app.container_number === currentApp.containerNumber && app.id !== applicationData.id) {
                indicators.push({
                    type: 'duplicateDeclarations',
                    severity: 'medium',
                    message: 'Duplicate container number found',
                    recommendation: 'Verify container number is correct'
                });
            }
        });

        return indicators;
    }

    /**
     * Check for invalid HS codes
     */
    checkInvalidHSCodes(goodsData) {
        const indicators = [];

        if (!goodsData || !Array.isArray(goodsData)) {
            return indicators;
        }

        goodsData.forEach(item => {
            const hsCode = item.hs_code;
            
            if (!hsCode) {
                indicators.push({
                    type: 'invalidHSCodes',
                    severity: 'medium',
                    message: 'Missing HS code',
                    itemId: item.id,
                    recommendation: 'Provide valid HS code'
                });
                return;
            }

            // Check HS code format
            const cleanedCode = hsCode.replace(/[^0-9]/g, '');
            if (cleanedCode.length < 4 || cleanedCode.length > 10) {
                indicators.push({
                    type: 'invalidHSCodes',
                    severity: 'medium',
                    message: `Invalid HS code format: ${hsCode}`,
                    itemId: item.id,
                    recommendation: 'Use 4-10 digit HS code'
                });
            }
        });

        return indicators;
    }

    /**
     * Check for value discrepancies
     */
    checkValueDiscrepancies(applicationData) {
        const indicators = [];
        
        const invoiceValue = parseFloat(applicationData.invoice_value) || 0;
        const declaredValue = parseFloat(applicationData.declared_value) || 0;

        if (invoiceValue > 0 && declaredValue > 0) {
            const discrepancy = Math.abs(declaredValue - invoiceValue) / invoiceValue * 100;
            
            if (discrepancy > 30) {
                indicators.push({
                    type: 'valueDiscrepancies',
                    severity: 'high',
                    message: `Large value discrepancy: ${discrepancy.toFixed(1)}%`,
                    recommendation: 'Verify declared value accuracy'
                });
            } else if (discrepancy > 15) {
                indicators.push({
                    type: 'valueDiscrepancies',
                    severity: 'medium',
                    message: `Value discrepancy: ${discrepancy.toFixed(1)}%`,
                    recommendation: 'Review value accuracy'
                });
            }
        }

        return indicators;
    }

    /**
     * Check for data inconsistencies
     */
    checkInconsistencies(applicationData) {
        const indicators = [];

        // Check if goods total matches declared value
        if (applicationData.goods_data && Array.isArray(applicationData.goods_data)) {
            const goodsTotal = applicationData.goods_data.reduce((sum, item) => {
                return sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0));
            }, 0);

            const declaredValue = parseFloat(applicationData.declared_value) || 0;

            if (goodsTotal > 0 && declaredValue > 0) {
                const discrepancy = Math.abs(declaredValue - goodsTotal) / goodsTotal * 100;
                
                if (discrepancy > 20) {
                    indicators.push({
                        type: 'inconsistentData',
                        severity: 'medium',
                        message: `Goods total (${goodsTotal}) differs from declared value (${declaredValue}) by ${discrepancy.toFixed(1)}%`,
                        recommendation: 'Verify value calculations'
                    });
                }
            }
        }

        // Check if origin/destination countries are valid
        if (applicationData.origin_country === applicationData.destination_country) {
            indicators.push({
                type: 'inconsistentData',
                severity: 'high',
                message: 'Origin and destination countries are the same',
                recommendation: 'Verify country codes'
            });
        }

        return indicators;
    }

    /**
     * Check if number is suspiciously round
     */
    isRoundNumber(num) {
        const rounded = Math.round(num);
        return Math.abs(num - rounded) < 0.01;
    }

    /**
     * Generate fraud detection report
     */
    generateReport(fraudDetectionResult) {
        const { fraudDetected, fraudRiskScore, indicators, totalIndicators, highSeverityIndicators } = fraudDetectionResult;

        return {
            summary: {
                fraudDetected,
                fraudRiskScore,
                totalIndicators,
                highSeverityIndicators,
                riskLevel: this.getRiskLevel(fraudRiskScore)
            },
            indicators: indicators.sort((a, b) => {
                const severityOrder = { high: 0, medium: 1, low: 2 };
                return severityOrder[a.severity] - severityOrder[b.severity];
            }),
            recommendations: this.generateRecommendations(indicators)
        };
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
     * Generate recommendations from indicators
     */
    generateRecommendations(indicators) {
        const recommendations = new Set();
        
        indicators.forEach(indicator => {
            if (indicator.recommendation) {
                recommendations.add(indicator.recommendation);
            }
        });

        // Add general recommendations based on risk level
        const highSeverityCount = indicators.filter(i => i.severity === 'high').length;
        
        if (highSeverityCount > 2) {
            recommendations.add('Immediate manual review recommended');
        } else if (highSeverityCount > 0) {
            recommendations.add('Additional documentation may be required');
        }

        return Array.from(recommendations);
    }
}

export default FraudDetector;
