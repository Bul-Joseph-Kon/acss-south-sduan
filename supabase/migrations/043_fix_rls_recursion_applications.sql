-- ================================================================
-- MIGRATION 043: Fix RLS Recursion on Applications
-- ================================================================
-- Recreates the officers RLS policy on applications using the
-- get_user_role() security definer function to avoid infinite recursion.
-- ================================================================

-- Drop the recursive policy
DROP POLICY IF EXISTS "Officers can view all applications" ON applications;

-- Recreate policy using get_user_role() instead of querying profiles directly
CREATE POLICY "Officers can view all applications" ON applications FOR SELECT
    USING (
        get_user_role() IN ('officer', 'supervisor', 'administrator')
    );
