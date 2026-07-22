-- ================================================================
-- MIGRATION 033: Add High Risk Review Status to Applications
-- ================================================================
-- This migration adds the high_risk_review and pending_review statuses
-- to the application_status enum to support AI routing
-- ================================================================

-- Add new values to the application_status enum
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'pending_review';
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'high_risk_review';

-- Add comment
COMMENT ON TYPE application_status IS 'Application status: draft, submitted, pending_review (AI passed), high_risk_review (AI flagged high risk), under_review, inspection_required, inspection_completed, escalated, approved, payment_required, paid, payment_verified, completed, returned, rejected';

