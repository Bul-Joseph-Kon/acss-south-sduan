-- ================================================================
-- MIGRATION 015: Create Test Users for Workflow Testing
-- ================================================================
-- This migration is skipped in automated runs.
-- Test users must be created manually via Supabase Auth Dashboard.
-- 
-- MANUAL SETUP INSTRUCTIONS:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Create the following users with email/password:
--    - agent@test.com (role: agent)
--    - officer@test.com (role: officer)
--    - inspector@test.com (role: inspector)
--    - supervisor@test.com (role: supervisor)
--    - revenue@test.com (role: revenue)
-- 3. After creating auth users, run the profile insertions below by replacing
--    the placeholder UUIDs with actual auth.user IDs from your project
-- ================================================================

-- The following INSERT statements are commented out to prevent errors
-- Uncomment and replace user_ids after creating auth users in Supabase Dashboard

/*
-- Clearing Agent Profile
INSERT INTO public.profiles (user_id, full_name, email, role, status, phone)
VALUES (
    'REPLACE_WITH_ACTUAL_AUTH_USER_ID',
    'John Clearing Agent',
    'agent@test.com',
    'agent',
    'active',
    '+211-123-456-789'
) ON CONFLICT (user_id) DO UPDATE SET
    role = 'agent',
    status = 'active';

-- Customs Officer Profile
INSERT INTO public.profiles (user_id, full_name, email, role, status, phone)
VALUES (
    'REPLACE_WITH_ACTUAL_AUTH_USER_ID',
    'Mary Customs Officer',
    'officer@test.com',
    'officer',
    'active',
    '+211-234-567-890'
) ON CONFLICT (user_id) DO UPDATE SET
    role = 'officer',
    status = 'active';

-- Inspector Profile
INSERT INTO public.profiles (user_id, full_name, email, role, status, phone)
VALUES (
    'REPLACE_WITH_ACTUAL_AUTH_USER_ID',
    'Peter Inspector',
    'inspector@test.com',
    'inspector',
    'active',
    '+211-345-678-901'
) ON CONFLICT (user_id) DO UPDATE SET
    role = 'inspector',
    status = 'active';

-- Supervisor Profile
INSERT INTO public.profiles (user_id, full_name, email, role, status, phone)
VALUES (
    'REPLACE_WITH_ACTUAL_AUTH_USER_ID',
    'Sarah Supervisor',
    'supervisor@test.com',
    'supervisor',
    'active',
    '+211-456-789-012'
) ON CONFLICT (user_id) DO UPDATE SET
    role = 'supervisor',
    status = 'active';

-- Revenue Officer Profile
INSERT INTO public.profiles (user_id, full_name, email, role, status, phone)
VALUES (
    'REPLACE_WITH_ACTUAL_AUTH_USER_ID',
    'David Revenue Officer',
    'revenue@test.com',
    'revenue',
    'active',
    '+211-567-890-123'
) ON CONFLICT (user_id) DO UPDATE SET
    role = 'revenue',
    status = 'active';

-- Add test users to admin_users for administrator access (if needed for testing)
INSERT INTO public.admin_users (user_id, created_at)
SELECT user_id, NOW()
FROM public.profiles
WHERE role IN ('supervisor', 'administrator')
ON CONFLICT (user_id) DO NOTHING;
*/

-- ================================================================
-- END OF MIGRATION
-- ================================================================
