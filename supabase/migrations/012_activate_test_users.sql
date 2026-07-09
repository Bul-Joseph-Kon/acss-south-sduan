-- ================================================================
-- MIGRATION 012: Activate Test Trader and Agent Accounts
-- ================================================================

-- 1. Confirm test trader and agent emails in auth.users
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email IN ('testtrader@example.com', 'clearingagent@example.com');

-- 2. Activate test trader and agent profiles
UPDATE public.profiles
SET status = 'active'
WHERE email IN ('testtrader@example.com', 'clearingagent@example.com');
