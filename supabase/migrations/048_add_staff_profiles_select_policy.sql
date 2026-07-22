-- ================================================================
-- MIGRATION 048: Add Staff Select Policy on Profiles
-- ================================================================
-- Replaces the disabled/placeholder administrator view policy on profiles
-- with a comprehensive SELECT policy for all staff roles
-- (officers, inspectors, revenue, supervisors, administrators).
-- Uses get_user_role() to determine role access without causing recursion.
-- ================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Administrators can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Staff can view all profiles" ON profiles;

-- Create comprehensive SELECT policy for all staff roles
CREATE POLICY "Staff can view all profiles" ON profiles FOR SELECT
    USING (
        get_user_role() IN ('officer', 'inspector', 'revenue', 'supervisor', 'administrator')
    );
