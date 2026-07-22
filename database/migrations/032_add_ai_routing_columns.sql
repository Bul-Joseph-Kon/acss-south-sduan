-- ================================================================
-- MIGRATION 032: Add AI Routing Columns to AI Validation Results
-- ================================================================
-- This migration adds routing decision and next status columns to support
-- automatic workflow routing based on AI validation results
-- ================================================================

-- Add routing_decision column
ALTER TABLE public.ai_validation_results 
ADD COLUMN IF NOT EXISTS routing_decision TEXT 
CHECK (routing_decision IN ('passed', 'validation_errors', 'high_risk'));

-- Add next_status column
ALTER TABLE public.ai_validation_results 
ADD COLUMN IF NOT EXISTS next_status TEXT;

-- Add document_verification column (JSONB for detailed results)
ALTER TABLE public.ai_validation_results 
ADD COLUMN IF NOT EXISTS document_verification JSONB DEFAULT '{}';

-- Add hs_code_validation column (JSONB for detailed results)
ALTER TABLE public.ai_validation_results 
ADD COLUMN IF NOT EXISTS hs_code_validation JSONB DEFAULT '{}';

-- Add customs_value_verification column (JSONB for detailed results)
ALTER TABLE public.ai_validation_results 
ADD COLUMN IF NOT EXISTS customs_value_verification JSONB DEFAULT '{}';

-- Add duty_calculation column (JSONB for detailed results)
ALTER TABLE public.ai_validation_results 
ADD COLUMN IF NOT EXISTS duty_calculation JSONB DEFAULT '{}';

-- Add duplicate_found column
ALTER TABLE public.ai_validation_results 
ADD COLUMN IF NOT EXISTS duplicate_found BOOLEAN DEFAULT false;

-- Add duplicate_references column (TEXT array)
ALTER TABLE public.ai_validation_results 
ADD COLUMN IF NOT EXISTS duplicate_references TEXT[] DEFAULT '{}';

-- Add fraud_detected column
ALTER TABLE public.ai_validation_results 
ADD COLUMN IF NOT EXISTS fraud_detected BOOLEAN DEFAULT false;

-- Add fraud_indicators column (TEXT array)
ALTER TABLE public.ai_validation_results 
ADD COLUMN IF NOT EXISTS fraud_indicators TEXT[] DEFAULT '{}';

-- Add risk_score column
ALTER TABLE public.ai_validation_results 
ADD COLUMN IF NOT EXISTS risk_score NUMERIC CHECK (risk_score >= 0 AND risk_score <= 100);

-- Add risk_factors column (TEXT array)
ALTER TABLE public.ai_validation_results 
ADD COLUMN IF NOT EXISTS risk_factors TEXT[] DEFAULT '{}';

-- Add recommendations column (JSONB for detailed recommendations)
ALTER TABLE public.ai_validation_results 
ADD COLUMN IF NOT EXISTS recommendations JSONB DEFAULT '{}';

-- Add validation_report column (TEXT for the full report)
ALTER TABLE public.ai_validation_results 
ADD COLUMN IF NOT EXISTS validation_report TEXT;

-- Add index on routing_decision
CREATE INDEX IF NOT EXISTS idx_ai_validation_results_routing_decision 
ON public.ai_validation_results(routing_decision);

-- Add index on next_status
CREATE INDEX IF NOT EXISTS idx_ai_validation_results_next_status 
ON public.ai_validation_results(next_status);

-- Add comment
COMMENT ON COLUMN public.ai_validation_results.routing_decision IS 'AI routing decision: passed (to officer), validation_errors (returned to agent), or high_risk (to officer as high priority)';
COMMENT ON COLUMN public.ai_validation_results.next_status IS 'Next workflow status based on AI decision: pending_review, returned, or high_risk_review';
COMMENT ON COLUMN public.ai_validation_results.validation_report IS 'Full AI validation report text';
