/**
 * HS Code Validator Module
 * Validates HS codes against commodity descriptions
 * Can be upgraded to use real LLM/HS code database later
 */

export class HSCodeValidator {
    constructor() {
        // Sample HS code patterns (in production, load from database)
        this.hsCodePatterns = {
            '01': 'Live animals',
            '02': 'Meat and edible meat offal',
            '03': 'Fish and crustaceans',
            '04': 'Dairy produce; birds eggs',
            '07': 'Edible vegetables and certain roots',
            '08': 'Edible fruit and nuts',
            '09': 'Coffee, tea, maté and spices',
            '10': 'Cereals',
            '15': 'Animal or vegetable fats and oils',
            '17': 'Sugars and sugar confectionery',
            '18': 'Cocoa and cocoa preparations',
            '19': 'Preparations of cereals, flour, starch',
            '20': 'Preparations of vegetables, fruit, nuts',
            '21': 'Miscellaneous edible preparations',
            '22': 'Beverages, spirits and vinegar',
            '23': 'Residues and waste from food industries',
            '24': 'Tobacco and manufactured tobacco substitutes',
            '25': 'Salt; sulphur; earths and stone',
            '26': 'Ores, slag and ash',
            '27': 'Mineral fuels, mineral oils',
            '28': 'Inorganic chemicals; organic compounds',
            '29': 'Organic chemicals',
            '30': 'Pharmaceutical products',
            '39': 'Plastics and articles thereof',
            '40': 'Rubber and articles thereof',
            '44': 'Wood and articles of wood',
            '47': 'Pulp of wood; paper and paperboard',
            '48': 'Paper and paperboard; articles thereof',
            '52': 'Cotton',
            '54': 'Man-made filaments',
            '55': 'Man-made staple fibers',
            '57': 'Carpets and other textile floor coverings',
            '61': 'Apparel and clothing accessories, knitted',
            '62': 'Apparel and clothing accessories, not knitted',
            '63': 'Other made-up textile articles',
            '64': 'Footwear, gaiters and the like',
            '71': 'Natural or cultured pearls, precious stones',
            '72': 'Iron and steel',
            '73': 'Articles of iron or steel',
            '74': 'Copper and articles thereof',
            '75': 'Nickel and articles thereof',
            '76': 'Aluminum and articles thereof',
            '81': 'Other base metals; cermets',
            '82': 'Tools, implements, cutlery, spoons and forks',
            '83': 'Miscellaneous articles of base metal',
            '84': 'Nuclear reactors, boilers, machinery',
            '85': 'Electrical machinery and equipment',
            '86': 'Railway or tramway locomotives',
            '87': 'Vehicles other than railway or tramway',
            '90': 'Optical, photographic, cinematographic',
            '91': 'Clocks and watches and parts thereof',
            '94': 'Furniture; bedding, mattresses',
            '95': 'Toys, games and sports requisites',
            '96': 'Miscellaneous manufactured articles'
        };
    }

    /**
     * Validate HS code against commodity description
     */
    validateHSCode(hsCode, commodityDescription) {
        if (!hsCode || !commodityDescription) {
            return {
                status: 'Invalid',
                confidence: 0,
                message: 'Missing HS code or commodity description',
                suggestedCode: null
            };
        }

        // Validate HS code format
        const formatValidation = this.validateHSCodeFormat(hsCode);
        if (!formatValidation.isValid) {
            return {
                status: 'Invalid',
                confidence: 0,
                message: formatValidation.message,
                suggestedCode: null
            };
        }

        // Check HS code against description
        const matchResult = this.checkDescriptionMatch(hsCode, commodityDescription);

        return {
            status: matchResult.status,
            confidence: matchResult.confidence,
            message: matchResult.message,
            suggestedCode: matchResult.suggestedCode
        };
    }

    /**
     * Validate HS code format
     */
    validateHSCodeFormat(hsCode) {
        // HS codes should be 4, 6, 8, or 10 digits
        const cleanedCode = hsCode.replace(/[^0-9]/g, '');
        
        if (cleanedCode.length < 4 || cleanedCode.length > 10) {
            return {
                isValid: false,
                message: 'HS code must be 4-10 digits'
            };
        }

        if (!/^\d+$/.test(cleanedCode)) {
            return {
                isValid: false,
                message: 'HS code must contain only digits'
            };
        }

        return {
            isValid: true,
            message: 'Valid format'
        };
    }

    /**
     * Check if HS code matches commodity description
     */
    checkDescriptionMatch(hsCode, description) {
        const cleanedCode = hsCode.replace(/[^0-9]/g, '');
        const firstTwoDigits = cleanedCode.substring(0, 2);
        
        const categoryDescription = this.hsCodePatterns[firstTwoDigits];
        
        if (!categoryDescription) {
            return {
                status: 'Warning',
                confidence: 50,
                message: 'Unknown HS code category',
                suggestedCode: null
            };
        }

        // Simple keyword matching (can be upgraded to LLM)
        const descriptionLower = description.toLowerCase();
        const categoryLower = categoryDescription.toLowerCase();
        
        // Check for keyword overlap
        const descriptionWords = descriptionLower.split(/\s+/);
        const categoryWords = categoryLower.split(/\s+/);
        
        let matchCount = 0;
        descriptionWords.forEach(word => {
            if (word.length > 3 && categoryWords.some(catWord => catWord.includes(word) || word.includes(catWord))) {
                matchCount++;
            }
        });

        const matchRatio = matchCount / Math.max(descriptionWords.length, 1);
        
        if (matchRatio > 0.3) {
            return {
                status: 'Valid',
                confidence: Math.min(95, 70 + matchRatio * 25),
                message: `HS code matches commodity description (${categoryDescription})`,
                suggestedCode: null
            };
        } else {
            return {
                status: 'Potential Mismatch',
                confidence: 40,
                message: `HS code category is "${categoryDescription}" but description may not match`,
                suggestedCode: this.suggestHSCode(description)
            };
        }
    }

    /**
     * Suggest HS code based on description (simple keyword matching)
     */
    suggestHSCode(description) {
        const descriptionLower = description.toLowerCase();
        let bestMatch = null;
        let bestScore = 0;

        Object.entries(this.hsCodePatterns).forEach(([code, category]) => {
            const categoryLower = category.toLowerCase();
            const descriptionWords = descriptionLower.split(/\s+/);
            const categoryWords = categoryLower.split(/\s+/);
            
            let score = 0;
            descriptionWords.forEach(word => {
                if (word.length > 3) {
                    categoryWords.forEach(catWord => {
                        if (catWord.includes(word) || word.includes(catWord)) {
                            score += 1;
                        }
                    });
                }
            });

            if (score > bestScore) {
                bestScore = score;
                bestMatch = code + '00000000'.substring(0, 8 - code.length);
            }
        });

        return bestScore > 0 ? bestMatch : null;
    }

    /**
     * Batch validate multiple HS codes
     */
    validateBatch(items) {
        return items.map(item => ({
            itemId: item.id,
            hsCode: item.hs_code,
            description: item.commodity_description,
            validation: this.validateHSCode(item.hs_code, item.commodity_description)
        }));
    }
}

export default HSCodeValidator;
