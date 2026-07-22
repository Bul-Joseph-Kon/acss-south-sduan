-- ================================================================
-- MIGRATION 044: Fix Staff Update Policy on Applications
-- ================================================================
-- Replaces the restrictive "Officers can update assigned applications"
-- policy with a comprehensive update policy for all authorized staff
-- roles (officers, inspectors, revenue, supervisors, administrators).
-- ================================================================

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Officers can update assigned applications" ON applications;
DROP POLICY IF EXISTS "Staff can update applications" ON applications;

-- Create comprehensive update policy for all staff roles
CREATE POLICY "Staff can update applications" ON applications FOR UPDATE
    USING (
        get_user_role() IN ('officer', 'inspector', 'revenue', 'supervisor', 'administrator')
    );
