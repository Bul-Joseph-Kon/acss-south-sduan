-- ================================================================
-- MIGRATION 010: Fix Status Enum Mismatches
-- ================================================================

-- Disable transaction wrap since ALTER TYPE ADD VALUE cannot run inside multi-statement transactions in some PG settings
-- (Supabase db push executes migration files individually)

ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'under_review';
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'paid';
