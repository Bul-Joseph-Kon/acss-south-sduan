-- ================================================================
-- MIGRATION 012: Add Risk Assessments Table
-- ================================================================

CREATE TABLE IF NOT EXISTS public.risk_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    
    risk_score NUMERIC CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    
    -- Risk factors
    fraud_risk NUMERIC CHECK (fraud_risk >= 0 AND fraud_risk <= 100),
    compliance_risk NUMERIC CHECK (compliance_risk >= 0 AND compliance_risk <= 100),
    value_risk NUMERIC CHECK (value_risk >= 0 AND value_risk <= 100),
    
    -- Assessment details
    assessment_method TEXT,
    assessment_model TEXT,
    assessment_version TEXT,
    
    -- Factors
    risk_factors JSONB DEFAULT '{}',
    flagged_items JSONB DEFAULT '[]',
    
    -- AI confidence
    ai_confidence NUMERIC CHECK (ai_confidence >= 0 AND ai_confidence <= 100),
    
    -- Recommendations
    recommendations TEXT[],
    requires_inspection BOOLEAN DEFAULT false,
    requires_additional_review BOOLEAN DEFAULT false,
    
    assessed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_risk_assessments_application_id ON public.risk_assessments(application_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_risk_level ON public.risk_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_risk_score ON public.risk_assessments(risk_score);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_created_at ON public.risk_assessments(created_at DESC);

-- Enable RLS
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view risk assessments for their applications"
    ON public.risk_assessments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.applications 
            WHERE applications.id = risk_assessments.application_id 
            AND applications.user_id = get_current_profile_id()
        )
    );

CREATE POLICY "Agents can view risk assessments for their applications"
    ON public.risk_assessments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.applications 
            WHERE applications.id = risk_assessments.application_id 
            AND applications.agent_id = get_current_profile_id()
        )
    );

CREATE POLICY "Officers can view risk assessments for assigned applications"
    ON public.risk_assessments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.applications 
            WHERE applications.id = risk_assessments.application_id 
            AND applications.officer_id = get_current_profile_id()
        )
    );

CREATE POLICY "Administrators can view all risk assessments"
    ON public.risk_assessments FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

CREATE POLICY "System can insert risk assessments"
    ON public.risk_assessments FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Administrators can update risk assessments"
    ON public.risk_assessments FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- Update timestamp trigger
CREATE TRIGGER trigger_update_risk_assessments_updated_at
    BEFORE UPDATE ON public.risk_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_escalated_cases_updated_at();
