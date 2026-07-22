-- ================================================================
-- ADD ESCALATED STATUS TO APPLICATION_STATUS ENUM
-- ================================================================
-- This migration adds the 'escalated' status to the application_status enum
-- This is needed for supervisor escalation workflow
-- ================================================================

-- Add escalated status to enum
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'escalated';

-- ================================================================
-- END OF MIGRATION
-- ================================================================
