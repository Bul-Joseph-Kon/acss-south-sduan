-- ================================================================
-- DISABLE PROFILES RLS TEMPORARILY TO FIX RECURSION
-- ================================================================
-- This migration temporarily disables RLS on profiles to allow login
-- while we fix the recursion issue properly
-- ================================================================

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Administrators can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Administrators can update all profiles" ON profiles;

-- Disable RLS on profiles table temporarily
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- This will allow all users to view profiles temporarily
-- After login is working, we can re-enable with proper policies
