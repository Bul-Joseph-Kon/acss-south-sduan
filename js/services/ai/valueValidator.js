/**
 * Customs Value Validator Module
 * Validates declared customs value against invoice value
 * Can be upgraded to use real LLM for complex analysis later
 */

export class ValueValidator {
    constructor() {
        this.tolerancePercent = 10; // 10% tolerance for value discrepancies
    }

    /**
     * Validate customs value against invoice value
     */
    validateCustomsValue(invoiceValue, declaredValue, goodsData) {
        if (!invoiceValue || !declaredValue) {
            return {
                status: 'Invalid',
                confidence: 0,
                message: 'Missing invoice or declared value',
                discrepancy: 0,
                discrepancyPercent: 0
            };
        }

        const invoiceNum = parseFloat(invoiceValue) || 0;
        const declaredNum = parseFloat(declaredValue) || 0;

        if (invoiceNum === 0 || declaredNum === 0) {
            return {
                status: 'Invalid',
                confidence: 0,
                message: 'Invalid value (zero)',
                discrepancy: 0,
                discrepancyPercent: 0
            };
        }

        const discrepancy = declaredNum - invoiceNum;
        const discrepancyPercent = (Math.abs(discrepancy) / invoiceNum) * 100;

        let status = 'Match';
        let message = 'Values match within tolerance';
        let confidence = 95;

        if (discrepancyPercent > this.tolerancePercent) {
            if (discrepancy > 0) {
                status = 'Possible Over Valuation';
                message = `Declared value is ${discrepancyPercent.toFixed(1)}% higher than invoice value`;
                confidence = Math.max(50, 95 - discrepancyPercent);
            } else {
                status = 'Possible Under Valuation';
                message = `Declared value is ${discrepancyPercent.toFixed(1)}% lower than invoice value`;
                confidence = Math.max(40, 95 - discrepancyPercent);
            }
        }

        // Calculate expected customs value from goods
        const calculatedValue = this.calculateFromGoods(goodsData);
        const goodsDiscrepancy = calculatedValue ? 
            Math.abs(declaredNum - calculatedValue) / calculatedValue * 100 : 0;

        return {
            status,
            confidence,
            message,
            discrepancy,
            discrepancyPercent,
            invoiceValue: invoiceNum,
            declaredValue: declaredNum,
            calculatedFromGoods: calculatedValue,
            goodsDiscrepancy
        };
    }

    /**
     * Calculate expected value from goods data
     */
    calculateFromGoods(goodsData) {
        if (!goodsData || !Array.isArray(goodsData) || goodsData.length === 0) {
            return null;
        }

        let total = 0;
        goodsData.forEach(item => {
            const quantity = parseFloat(item.quantity) || 0;
            const unitPrice = parseFloat(item.unit_price) || 0;
            total += quantity * unitPrice;
        });

        return total;
    }

    /**
     * Validate individual item values
     */
    validateItemValues(goodsData) {
        if (!goodsData || !Array.isArray(goodsData)) {
            return {
                valid: false,
                message: 'Invalid goods data',
                items: []
            };
        }

        const results = goodsData.map(item => {
            const quantity = parseFloat(item.quantity) || 0;
            const unitPrice = parseFloat(item.unit_price) || 0;
            const customsValue = parseFloat(item.customs_value) || 0;
            const calculatedValue = quantity * unitPrice;

            const discrepancy = Math.abs(customsValue - calculatedValue);
            const discrepancyPercent = calculatedValue > 0 ? 
                (discrepancy / calculatedValue) * 100 : 0;

            return {
                itemId: item.id,
                quantity,
                unitPrice,
                customsValue,
                calculatedValue,
                discrepancy,
                discrepancyPercent,
                isValid: discrepancyPercent <= this.tolerancePercent
            };
        });

        const invalidItems = results.filter(r => !r.isValid);

        return {
            valid: invalidItems.length === 0,
            message: invalidItems.length > 0 ? 
                `${invalidItems.length} items have value discrepancies` : 
                'All item values are consistent',
            items: results
        };
    }

    /**
     * Check for suspicious value patterns
     */
    detectSuspiciousPatterns(goodsData) {
        const patterns = [];

        if (!goodsData || !Array.isArray(goodsData)) {
            return patterns;
        }

        // Check for round numbers (potential estimation)
        goodsData.forEach(item => {
            const unitPrice = parseFloat(item.unit_price) || 0;
            if (unitPrice > 0 && this.isRoundNumber(unitPrice)) {
                patterns.push({
                    type: 'Round Number',
                    severity: 'low',
                    message: `Item has round unit price: ${unitPrice}`,
                    itemId: item.id
                });
            }
        });

        // Check for unusually high or low values
        const values = goodsData.map(item => parseFloat(item.unit_price) || 0);
        const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
        
        goodsData.forEach(item => {
            const unitPrice = parseFloat(item.unit_price) || 0;
            const deviation = Math.abs(unitPrice - avgValue) / avgValue * 100;
            
            if (deviation > 200) {
                patterns.push({
                    type: 'Value Outlier',
                    severity: 'medium',
                    message: `Unit price deviates ${deviation.toFixed(0)}% from average`,
                    itemId: item.id
                });
            }
        });

        // Check for zero values
        goodsData.forEach(item => {
            const unitPrice = parseFloat(item.unit_price) || 0;
            if (unitPrice === 0) {
                patterns.push({
                    type: 'Zero Value',
                    severity: 'high',
                    message: 'Item has zero unit price',
                    itemId: item.id
                });
            }
        });

        return patterns;
    }

    /**
     * Check if number is suspiciously round
     */
    isRoundNumber(num) {
        const rounded = Math.round(num);
        return Math.abs(num - rounded) < 0.01;
    }

    /**
     * Validate total declared value against sum of items
     */
    validateTotalAgainstItems(totalDeclared, goodsData) {
        const calculatedTotal = this.calculateFromGoods(goodsData);
        
        if (!calculatedTotal) {
            return {
                valid: false,
                message: 'Cannot calculate from goods data',
                totalDeclared,
                calculatedTotal
            };
        }

        const discrepancy = Math.abs(totalDeclared - calculatedTotal);
        const discrepancyPercent = (discrepancy / calculatedTotal) * 100;

        return {
            valid: discrepancyPercent <= this.tolerancePercent,
            message: discrepancyPercent <= this.tolerancePercent ?
                'Total matches sum of items' :
                `Total differs from sum of items by ${discrepancyPercent.toFixed(1)}%`,
            totalDeclared,
            calculatedTotal,
            discrepancy,
            discrepancyPercent
        };
    }
}

export default ValueValidator;
