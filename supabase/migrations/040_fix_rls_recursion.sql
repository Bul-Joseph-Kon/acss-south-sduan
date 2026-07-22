-- ================================================================
-- FIX INFINITE RECURSION IN RLS POLICIES
-- ================================================================
-- This migration fixes the infinite recursion error in profiles RLS
-- by creating a function that bypasses RLS and using it in policies
-- ================================================================

-- Create a function to get user role that bypasses RLS
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
    SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

-- Recreate helper function with SECURITY DEFINER to avoid recursion
CREATE OR REPLACE FUNCTION get_current_profile_id()
RETURNS UUID AS $$
    SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

-- Drop existing profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Administrators can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Administrators can update all profiles" ON profiles;

-- Recreate profiles policies using auth.uid() directly
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
CREATE POLICY "Service role can insert profiles" ON profiles FOR INSERT
    TO service_role
    WITH CHECK (true);

DROP POLICY IF EXISTS "Administrators can view all profiles" ON profiles;
CREATE POLICY "Administrators can view all profiles" ON profiles FOR SELECT
    USING (get_user_role() = 'administrator');

DROP POLICY IF EXISTS "Administrators can update all profiles" ON profiles;
CREATE POLICY "Administrators can update all profiles" ON profiles FOR UPDATE
    USING (get_user_role() = 'administrator');
