-- ================================================================
-- MIGRATION 007: Add Application Tracking Columns
-- ================================================================
-- This migration adds missing columns to the applications table:
-- - risk_level: For tracking shipment risk assessment
-- - rejected_at: For tracking rejection timestamp
-- ================================================================

-- Add risk_level column
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical'));

-- Add rejected_at column
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;

-- Add index for risk_level
CREATE INDEX IF NOT EXISTS idx_applications_risk_level ON applications(risk_level);

-- ================================================================
-- END OF MIGRATION
-- ================================================================
