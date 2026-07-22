-- ================================================================
-- MIGRATION 046: Update Applications Inspection Type Check Constraint
-- ================================================================
-- Replaces the restrictive applications_inspection_type_check constraint
-- on the applications table to allow all inspection types used in both
-- the database schemas and UI pages.
-- ================================================================

-- Drop the old constraint
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_inspection_type_check;

-- Create the new constraint with both UI-defined and schema-defined values
ALTER TABLE applications ADD CONSTRAINT applications_inspection_type_check CHECK (
    inspection_type IN (
        'cargo',
        'vehicle',
        'warehouse',
        'general',
        'physical',
        'document',
        'xray',
        'laboratory'
    )
);
