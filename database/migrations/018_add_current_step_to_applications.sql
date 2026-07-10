-- ================================================================
-- MIGRATION 018: Add current_step column to applications table
-- ================================================================
-- This adds the current_step column to track workflow progress
-- ================================================================

-- Add current_step column
ALTER TABLE applications ADD COLUMN IF NOT EXISTS current_step INTEGER DEFAULT 1;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_applications_current_step ON applications(current_step);

-- ================================================================
-- END OF MIGRATION
-- ================================================================
