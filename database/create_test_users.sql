-- ================================================================
-- CREATE TEST USERS FOR ALL ROLES
-- ================================================================
-- Run this SQL in Supabase SQL Editor to create test users
-- ================================================================

-- Test Agent User
INSERT INTO profiles (id, email, full_name, role, phone, is_active, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'agent@test.com',
    'Test Agent',
    'agent',
    '+211-123-456-789',
    true,
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Test Officer User
INSERT INTO profiles (id, email, full_name, role, phone, is_active, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'officer@test.com',
    'Test Officer',
    'officer',
    '+211-123-456-790',
    true,
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Test Inspector User
INSERT INTO profiles (id, email, full_name, role, phone, is_active, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000003',
    'inspector@test.com',
    'Test Inspector',
    'inspector',
    '+211-123-456-791',
    true,
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Test Supervisor User
INSERT INTO profiles (id, email, full_name, role, phone, is_active, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000004',
    'supervisor@test.com',
    'Test Supervisor',
    'supervisor',
    '+211-123-456-792',
    true,
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Test Administrator User
INSERT INTO profiles (id, email, full_name, role, phone, is_active, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000005',
    'admin@test.com',
    'Test Administrator',
    'administrator',
    '+211-123-456-793',
    true,
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- NOTES:
-- 1. You need to create corresponding auth.users entries via Supabase Auth
-- 2. Use the Supabase Dashboard > Authentication > Users to create these users
-- 3. Set their passwords and confirm their emails
-- 4. The UUIDs above are placeholders - use the actual UUIDs from auth.users
-- ================================================================
