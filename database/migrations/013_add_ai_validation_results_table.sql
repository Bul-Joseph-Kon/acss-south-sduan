-- ================================================================
-- MIGRATION 013: Add AI Validation Results Table
-- ================================================================

CREATE TABLE IF NOT EXISTS public.ai_validation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    
    -- Overall validation
    validation_passed BOOLEAN DEFAULT false,
    validation_score NUMERIC CHECK (validation_score >= 0 AND validation_score <= 100),
    validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'in_progress', 'completed', 'failed')),
    
    -- OCR Results
    ocr_processed BOOLEAN DEFAULT false,
    ocr_confidence NUMERIC CHECK (ocr_confidence >= 0 AND ocr_confidence <= 100),
    ocr_extracted_data JSONB DEFAULT '{}',
    ocr_errors TEXT[],
    
    -- Document Verification
    documents_verified BOOLEAN DEFAULT false,
    document_verification_score NUMERIC CHECK (document_verification_score >= 0 AND document_verification_score <= 100),
    missing_documents TEXT[],
    invalid_documents TEXT[],
    
    -- Risk Assessment
    fraud_detected BOOLEAN DEFAULT false,
    fraud_score NUMERIC CHECK (fraud_score >= 0 AND fraud_score <= 100),
    fraud_indicators JSONB DEFAULT '{}',
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    
    -- HS Code Validation
    hs_code_validated BOOLEAN DEFAULT false,
    hs_code_confidence NUMERIC CHECK (hs_code_confidence >= 0 AND hs_code_confidence <= 100),
    suggested_hs_codes JSONB DEFAULT '[]',
    
    -- Duty & Tax Calculation
    duty_calculated BOOLEAN DEFAULT false,
    duty_amount NUMERIC,
    tax_amount NUMERIC,
    total_amount NUMERIC,
    calculation_details JSONB DEFAULT '{}',
    
    -- AI Recommendations
    ai_recommendation TEXT,
    ai_reasoning TEXT,
    requires_manual_review BOOLEAN DEFAULT false,
    
    -- Processing metadata
    processing_time_ms INTEGER,
    model_version TEXT,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_validation_results_application_id ON public.ai_validation_results(application_id);
CREATE INDEX IF NOT EXISTS idx_ai_validation_results_validation_passed ON public.ai_validation_results(validation_passed);
CREATE INDEX IF NOT EXISTS idx_ai_validation_results_validation_status ON public.ai_validation_results(validation_status);
CREATE INDEX IF NOT EXISTS idx_ai_validation_results_risk_level ON public.ai_validation_results(risk_level);
CREATE INDEX IF NOT EXISTS idx_ai_validation_results_created_at ON public.ai_validation_results(created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_validation_results ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view AI validation for their applications"
    ON public.ai_validation_results FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.applications 
            WHERE applications.id = ai_validation_results.application_id 
            AND applications.user_id = get_current_profile_id()
        )
    );

CREATE POLICY "Agents can view AI validation for their applications"
    ON public.ai_validation_results FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.applications 
            WHERE applications.id = ai_validation_results.application_id 
            AND applications.agent_id = get_current_profile_id()
        )
    );

CREATE POLICY "Officers can view AI validation for assigned applications"
    ON public.ai_validation_results FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.applications 
            WHERE applications.id = ai_validation_results.application_id 
            AND applications.officer_id = get_current_profile_id()
        )
    );

CREATE POLICY "Administrators can view all AI validation results"
    ON public.ai_validation_results FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

CREATE POLICY "System can insert AI validation results"
    ON public.ai_validation_results FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "System can update AI validation results"
    ON public.ai_validation_results FOR UPDATE
    TO service_role
    WITH CHECK (true);

-- Update timestamp trigger
CREATE TRIGGER trigger_update_ai_validation_results_updated_at
    BEFORE UPDATE ON public.ai_validation_results
    FOR EACH ROW
    EXECUTE FUNCTION update_escalated_cases_updated_at();
