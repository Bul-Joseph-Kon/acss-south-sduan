-- ================================================================
-- DIAGNOSTIC SCRIPT: Check Applications Table
-- ================================================================
-- Run this in Supabase SQL Editor to diagnose the issue
-- ================================================================

-- 1. Check if applications table exists and has data
SELECT 
    COUNT(*) as total_applications,
    COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
    COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted_count,
    COUNT(CASE WHEN status = 'pending_review' THEN 1 END) as pending_review_count,
    COUNT(CASE WHEN status = 'returned' THEN 1 END) as returned_count,
    COUNT(CASE WHEN status = 'under_review' THEN 1 END) as under_review_count,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count
FROM applications;

-- 2. Show all applications with CVET-related service types
SELECT 
    id,
    application_number,
    service_type,
    status,
    user_id,
    agent_id,
    officer_id,
    created_at,
    submitted_at
FROM applications
WHERE service_type IS NULL 
   OR LOWER(service_type) LIKE '%cvet%'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check RLS status on applications table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'applications';

-- 4. Check if RLS is enabled on applications table
SELECT 
    relname AS table_name,
    relrowsecurity AS rls_enabled,
    relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relname = 'applications';

-- 5. Check current user and their profile
SELECT 
    auth.uid() as current_user_id,
    p.id as profile_id,
    p.role,
    p.full_name,
    p.email
FROM profiles p
WHERE p.user_id = auth.uid();

-- 6. Test if current user can see applications (bypass RLS temporarily)
SET LOCAL row_security = off;
SELECT 
    id,
    application_number,
    service_type,
    status,
    user_id,
    agent_id,
    officer_id
FROM applications
LIMIT 5;
