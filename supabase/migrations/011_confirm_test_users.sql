-- ================================================================
-- MIGRATION 011: Confirm Test Administrator and Setup Profile
-- ================================================================

-- 1. Confirm test admin email in auth.users
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'testadmin@gmail.com';

-- 2. Ensure profile exists for test admin
INSERT INTO public.profiles (id, user_id, full_name, email, role, status)
SELECT id, id, 'Test Administrator', email, 'administrator', 'active'
FROM auth.users
WHERE email = 'testadmin@gmail.com'
ON CONFLICT (id) DO UPDATE 
SET role = 'administrator', status = 'active';

-- 3. Link test admin to admin_users table
INSERT INTO public.admin_users (user_id)
SELECT id FROM auth.users WHERE email = 'testadmin@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- 4. Confirm test trader and agent emails in auth.users
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email IN ('testtrader@example.com', 'clearingagent@example.com');

-- 5. Activate test trader and agent profiles
UPDATE public.profiles
SET status = 'active'
WHERE email IN ('testtrader@example.com', 'clearingagent@example.com');
