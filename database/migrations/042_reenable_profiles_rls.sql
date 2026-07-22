-- ================================================================
-- RE-ENABLE PROFILES RLS WITH PROPER POLICIES
-- ================================================================
-- This migration re-enables RLS on profiles with simplified policies
-- that avoid recursion by using auth.uid() directly
-- ================================================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Administrators can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Administrators can update all profiles" ON profiles;

-- Re-enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create simple policies that don't use subqueries on profiles table
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can insert profiles"
    ON profiles FOR INSERT
    TO service_role
    WITH CHECK (true);

-- For administrators, use a simple check without subqueries
-- Note: This is a simplified approach - in production you may want to
-- use a separate admin_users table or other mechanism
CREATE POLICY "Administrators can view all profiles"
    ON profiles FOR SELECT
    USING (false); -- Disabled for now to avoid recursion

CREATE POLICY "Administrators can update all profiles"
    ON profiles FOR UPDATE
    USING (false); -- Disabled for now to avoid recursion
