-- ================================================================
-- MIGRATION 047: Fix Staff Select Policy on Applications
-- ================================================================
-- Replaces the restrictive "Officers can view all applications"
-- policy with a comprehensive select policy for all staff roles
-- (officers, inspectors, revenue, supervisors, administrators).
-- ================================================================

-- Drop the old recursive/restrictive policies
DROP POLICY IF EXISTS "Officers can view all applications" ON applications;
DROP POLICY IF EXISTS "Staff can view all applications" ON applications;

-- Create comprehensive SELECT policy for all staff roles
CREATE POLICY "Staff can view all applications" ON applications FOR SELECT
    USING (
        get_user_role() IN ('officer', 'inspector', 'revenue', 'supervisor', 'administrator')
    );
