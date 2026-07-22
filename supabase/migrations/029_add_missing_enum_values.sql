-- ================================================================
-- MIGRATION 029: Add Missing Status Values to application_status Enum
-- ================================================================
-- Adds new values to the enum in a separate transaction so they can be
-- used in check constraints and data updates in subsequent migrations.
-- ================================================================

ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'inspection_required';
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'inspection_completed';
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'payment_required';
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'payment_verified';
