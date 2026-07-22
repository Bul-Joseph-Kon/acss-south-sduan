-- ================================================================
-- MIGRATION 028: Add Missing Workflow Statuses
-- ================================================================
-- This migration adds missing status values to the application_status enum
-- to match the comprehensive ACSS workflow specification
-- ================================================================

-- Add missing status values to application_status enum
-- Note: PostgreSQL doesn't support adding values in the middle of an enum,
-- so we'll add them at the end

ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'ai_validation';
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'pending_supervisor';
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'clearance_approved';

-- ================================================================
-- UPDATE EXISTING DATA IF NEEDED
-- ================================================================

-- Update applications that might be in transitional states
-- This ensures data consistency with the new workflow

-- Applications in 'submitted' status that have AI validation results
-- should be updated to 'ai_validation' if they're still being processed
UPDATE applications
SET status = 'ai_validation'
WHERE status = 'submitted'
  AND ai_validation_results IS NOT NULL
  AND ai_validation_results->>'status' = 'processing';

-- Applications approved by supervisor but not yet paid
-- should be 'pending_supervisor' if they're awaiting supervisor review
UPDATE applications
SET status = 'pending_supervisor'
WHERE status = 'pending_review'
  AND supervisor_id IS NOT NULL
  AND officer_id IS NOT NULL;

-- ================================================================
-- CREATE INDEXES FOR NEW STATUSES
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_applications_ai_validation ON applications(status) 
WHERE status = 'ai_validation';

CREATE INDEX IF NOT EXISTS idx_applications_pending_supervisor ON applications(status) 
WHERE status = 'pending_supervisor';

CREATE INDEX IF NOT EXISTS idx_applications_clearance_approved ON applications(status) 
WHERE status = 'clearance_approved';

-- ================================================================
-- GRANT PERMISSIONS
-- ================================================================

GRANT USAGE ON TYPE public.application_status TO service_role;
GRANT SELECT ON applications TO service_role;
GRANT UPDATE ON applications TO service_role;

-- ================================================================
-- VERIFICATION
-- ================================================================

-- Verify the new statuses were added
SELECT unnest(enum_range(NULL::application_status)) AS status_values;
