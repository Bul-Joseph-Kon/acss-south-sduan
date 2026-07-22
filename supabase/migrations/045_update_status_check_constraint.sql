-- ================================================================
-- MIGRATION 045: Update Applications Status Check Constraint
-- ================================================================
-- Replaces the restrictive applications_status_check constraint on the
-- applications table with a complete list of valid workflow statuses.
-- ================================================================

-- Drop the old constraint
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;

-- Create the new constraint with all standard statuses used in the codebase
ALTER TABLE applications ADD CONSTRAINT applications_status_check CHECK (
    status IN (
        'draft',
        'submitted',
        'pending_review',
        'high_risk_review',
        'under_review',
        'ai_validation',
        'under_inspection',
        'inspection_required',
        'inspection_completed',
        'escalated',
        'approved',
        'pending_supervisor',
        'clearance_approved',
        'payment_required',
        'paid',
        'payment_verified',
        'completed',
        'returned',
        'rejected',
        'cancelled'
    )
);
