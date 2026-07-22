-- ================================================================
-- MIGRATION 036: Remove AI Validation Trigger
-- ================================================================
-- AI validation is now handled in the application layer using the internal AI service
-- This migration removes the database trigger that was doing mock validation
-- ================================================================

-- Drop the AI validation trigger
DROP TRIGGER IF EXISTS trigger_ai_validation ON public.applications;

-- Drop the AI validation function
DROP FUNCTION IF EXISTS perform_ai_validation();

-- ================================================================
-- END OF MIGRATION
-- ================================================================
