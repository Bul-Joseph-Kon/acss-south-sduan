-- ================================================================
-- MIGRATION 006: Add Compliance Reviews Table
-- ================================================================
-- This migration creates the compliance_reviews table for tracking
-- compliance review activities performed by officers
-- ================================================================

CREATE TABLE IF NOT EXISTS compliance_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    review_type TEXT DEFAULT 'standard' CHECK (review_type IN ('standard', 'detailed', 'random_audit')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    
    findings JSONB DEFAULT '{}',
    risk_assessment TEXT CHECK (risk_assessment IN ('low', 'medium', 'high', 'critical')),
    compliance_score NUMERIC,
    
    notes TEXT,
    
    completed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_compliance_reviews_application_id ON compliance_reviews(application_id);
CREATE INDEX IF NOT EXISTS idx_compliance_reviews_reviewer_id ON compliance_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_compliance_reviews_status ON compliance_reviews(status);
CREATE INDEX IF NOT EXISTS idx_compliance_reviews_risk_assessment ON compliance_reviews(risk_assessment);
CREATE INDEX IF NOT EXISTS idx_compliance_reviews_created_at ON compliance_reviews(created_at DESC);

-- ================================================================
-- END OF MIGRATION
-- ================================================================
