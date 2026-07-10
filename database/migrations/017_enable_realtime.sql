-- ================================================================
-- MIGRATION 017: Enable Realtime on Required Tables
-- ================================================================
-- This enables Supabase Realtime on all tables needed for live updates
-- ================================================================

-- Helper function to add table to publication if not already added and table exists
CREATE OR REPLACE FUNCTION add_table_to_publication(target_table TEXT)
RETURNS VOID AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = target_table
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = target_table
    ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', target_table);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Enable realtime on applications table
SELECT add_table_to_publication('applications');

-- Enable realtime on documents table
SELECT add_table_to_publication('documents');

-- Enable realtime on payments table
SELECT add_table_to_publication('payments');

-- Enable realtime on notifications table
SELECT add_table_to_publication('notifications');

-- Enable realtime on activity_logs table
SELECT add_table_to_publication('activity_logs');

-- Enable realtime on audit_logs table
SELECT add_table_to_publication('audit_logs');

-- Enable realtime on escalated_cases table
SELECT add_table_to_publication('escalated_cases');

-- Enable realtime on risk_assessments table
SELECT add_table_to_publication('risk_assessments');

-- Enable realtime on ai_validation_results table
SELECT add_table_to_publication('ai_validation_results');

-- Enable realtime on ai_audit_logs table
SELECT add_table_to_publication('ai_audit_logs');

-- Enable realtime on profiles table (for user status updates)
SELECT add_table_to_publication('profiles');

-- Drop helper function
DROP FUNCTION add_table_to_publication(TEXT);

-- ================================================================
-- END OF MIGRATION
-- ================================================================
