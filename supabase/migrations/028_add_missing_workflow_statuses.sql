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
/* commented out */

-- Applications approved by supervisor but not yet paid
-- should be 'pending_supervisor' if they're awaiting supervisor review
/* commented out */

-- ================================================================
-- CREATE INDEXES FOR NEW STATUSES
-- ================================================================

/* commented out */

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
/* commented out */
