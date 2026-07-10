-- ================================================================
-- ADD DELETE POLICY FOR APPLICATIONS TABLE
-- ================================================================
-- This migration adds the missing DELETE policy to allow users to delete their own draft applications
-- ================================================================

-- Users can delete their own draft applications
DROP POLICY IF EXISTS "Users can delete own draft applications" ON applications;
CREATE POLICY "Users can delete own draft applications"
    ON applications FOR DELETE
    USING (
        user_id = get_current_profile_id() AND
        status = 'draft'
    );

-- Administrators can delete any application
DROP POLICY IF EXISTS "Administrators can delete applications" ON applications;
CREATE POLICY "Administrators can delete applications"
    ON applications FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid()
        )
    );

-- ================================================================
-- END OF MIGRATION
-- ================================================================
