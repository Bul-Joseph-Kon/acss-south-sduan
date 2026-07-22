-- ================================================================
-- 019: COMPLETE WORKFLOW REFACTOR
-- ================================================================
-- Adds:
--   1. 'revenue' value to user_role enum
--   2. revenue_officer_id column to applications
--   3. awaiting_payment status (already present, ensure idempotent)
--   4. Enable realtime on all required tables
-- ================================================================

-- 1. Add 'revenue' to user_role enum (safe, idempotent in PG 12+)
DO $$
BEGIN
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'revenue';
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- 2. Add revenue_officer_id to applications
ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS revenue_officer_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Index for revenue officer queries
CREATE INDEX IF NOT EXISTS idx_applications_revenue_officer_id ON applications(revenue_officer_id);

-- 3. Ensure awaiting_payment is in application_status enum
-- (Already added in migration 005 as 'awaiting_payment'. This is a safety check.)
DO $$
BEGIN
    -- Try to add awaiting_payment if it somehow doesn't exist
    ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'awaiting_payment';
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- 4. Add invoice_number to applications if not present (convenience reference)
ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS service_type TEXT;

-- 5. Fix application_number constraint to allow 'DECL-' prefix
-- First remove old constraint if it only allows CVET/APP/LIC
ALTER TABLE applications
    DROP CONSTRAINT IF EXISTS applications_application_number_format;

-- Re-add constraint allowing CVET, APP, LIC, and DECL prefixes
ALTER TABLE applications
    ADD CONSTRAINT applications_application_number_format CHECK (
        application_number ~ '^(CVET|APP|LIC|DECL|ASSESS)-[A-Z0-9]{6,10}$'
    );

-- 6. Enable Realtime on all required tables (idempotent)
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY[
        'applications', 'documents', 'payments', 'notifications',
        'activity_logs', 'audit_logs', 'escalated_cases',
        'risk_assessments', 'ai_validation_results', 'invoices',
        'cvet_certificates', 'cargo_release_documents', 'documents_generated'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
        EXCEPTION
            WHEN duplicate_object THEN NULL;
            WHEN undefined_table THEN NULL;
        END;
    END LOOP;
END $$;

-- 7. Insert 'revenue' role into roles table if not present
INSERT INTO roles (name, description, permissions)
VALUES (
    'revenue',
    'Revenue Officer - Verify duties, generate invoices, confirm payments',
    '["view_approved_applications", "generate_invoice", "verify_payment", "confirm_duties"]'
)
ON CONFLICT (name) DO NOTHING;

-- 8. Ensure system settings has revenue-related configuration
INSERT INTO system_settings (key, value, description, category)
VALUES
    ('declaration_number_prefix', 'DECL', 'Prefix for declaration application numbers', 'applications'),
    ('invoice_number_prefix', 'INV', 'Prefix for invoice numbers', 'invoices'),
    ('receipt_number_prefix', 'RCP', 'Prefix for receipt numbers', 'payments'),
    ('cvet_number_prefix', 'CVET', 'Prefix for CVET certificate numbers', 'documents'),
    ('cargo_release_prefix', 'CRO', 'Prefix for cargo release order numbers', 'documents')
ON CONFLICT (key) DO NOTHING;

-- ================================================================
-- END OF MIGRATION 019
-- ================================================================
