-- ================================================================
-- FIX APPLICATION NUMBER GENERATION
-- ================================================================
-- This migration fixes the application number generation by allowing the
-- generate_application_number function to update system_settings sequence
-- ================================================================

-- Add a policy to allow the application number generation function to update the sequence
-- This is needed because the function needs to increment the sequence counter
DROP POLICY IF EXISTS "Allow application number sequence update" ON system_settings;
CREATE POLICY "Allow application number sequence update"
    ON system_settings FOR UPDATE
    TO service_role
    USING (key = 'application_number_sequence')
    WITH CHECK (key = 'application_number_sequence');

-- Also allow insert for the initial sequence creation
DROP POLICY IF EXISTS "Allow application number sequence insert" ON system_settings;
CREATE POLICY "Allow application number sequence insert"
    ON system_settings FOR INSERT
    TO service_role
    WITH CHECK (key = 'application_number_sequence');

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS generate_application_number_trigger ON applications;
CREATE TRIGGER generate_application_number_trigger
    BEFORE INSERT ON applications
    FOR EACH ROW
    WHEN (NEW.application_number IS NULL OR NEW.application_number = '')
    EXECUTE FUNCTION generate_application_number();

-- ================================================================
-- END OF MIGRATION
-- ================================================================
