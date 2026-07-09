-- ================================================================
-- MIGRATION 005: Add Escalated Cases Table
-- ================================================================
-- This migration creates the escalated_cases table for tracking
-- escalated applications that require supervisor intervention
-- ================================================================

CREATE TABLE IF NOT EXISTS escalated_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    trader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    assigned_officer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    reason TEXT NOT NULL,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
    
    resolution TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_escalated_cases_application_id ON escalated_cases(application_id);
CREATE INDEX IF NOT EXISTS idx_escalated_cases_trader_id ON escalated_cases(trader_id);
CREATE INDEX IF NOT EXISTS idx_escalated_cases_assigned_officer_id ON escalated_cases(assigned_officer_id);
CREATE INDEX IF NOT EXISTS idx_escalated_cases_status ON escalated_cases(status);
CREATE INDEX IF NOT EXISTS idx_escalated_cases_priority ON escalated_cases(priority);
CREATE INDEX IF NOT EXISTS idx_escalated_cases_created_at ON escalated_cases(created_at DESC);

-- ================================================================
-- END OF MIGRATION
-- ================================================================
