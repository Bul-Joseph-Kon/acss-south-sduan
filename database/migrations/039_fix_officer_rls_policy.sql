-- ================================================================
-- FIX OFFICER RLS POLICY TO VIEW ALL APPLICATIONS
-- ================================================================
-- This migration fixes the RLS policy to allow officers to view
-- all applications for review, not just assigned ones
-- ================================================================

-- Drop existing officer policy
DROP POLICY IF EXISTS "Officers can view assigned applications" ON applications;

-- Recreate officer policy to allow viewing all applications
CREATE POLICY "Officers can view all applications"
    ON applications FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role IN ('officer', 'supervisor', 'administrator')
        )
    );

-- Update user policy to include agent_id
DROP POLICY IF EXISTS "Users can view own applications" ON applications;

CREATE POLICY "Users can view own applications"
    ON applications FOR SELECT
    USING (user_id = get_current_profile_id() OR agent_id = get_current_profile_id());
