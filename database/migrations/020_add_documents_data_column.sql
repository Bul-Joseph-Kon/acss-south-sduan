-- ================================================================
-- 020: ADD DOCUMENTS_DATA COLUMN TO APPLICATIONS
-- ================================================================
-- Adds documents_data JSONB column to applications table
-- to store document information for trader workflow
-- ================================================================

ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS documents_data JSONB DEFAULT '{}';

-- ================================================================
-- END OF MIGRATION 020
-- ================================================================
