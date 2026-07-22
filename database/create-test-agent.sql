-- Create test accounts for all roles directly in database
-- Run this in Supabase SQL Editor with service role privileges

-- Step 1: Create auth users (insert only if not exists)
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    last_sign_in_at,
    raw_app_meta_data,
    is_super_admin,
    role,
    aud
) 
SELECT 
    gen_random_uuid(),
    email,
    crypt('Test123456', gen_salt('bf')),
    NOW(),
    CASE 
        WHEN email = 'agent@acss.test' THEN '{"full_name": "Test Agent"}'::jsonb
        WHEN email = 'officer@acss.test' THEN '{"full_name": "Test Officer"}'::jsonb
        WHEN email = 'inspector@acss.test' THEN '{"full_name": "Test Inspector"}'::jsonb
        WHEN email = 'supervisor@acss.test' THEN '{"full_name": "Test Supervisor"}'::jsonb
        WHEN email = 'revenue@acss.test' THEN '{"full_name": "Test Revenue Officer"}'::jsonb
    END,
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    false,
    'authenticated',
    'authenticated'
FROM (VALUES 
    ('agent@acss.test'),
    ('officer@acss.test'),
    ('inspector@acss.test'),
    ('supervisor@acss.test'),
    ('revenue@acss.test')
) AS emails(email)
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE auth.users.email = emails.email
);

-- Step 2: Create profiles (insert without ON CONFLICT to avoid constraint errors)
INSERT INTO profiles (
    user_id,
    full_name,
    email,
    phone,
    role,
    status,
    organization,
    created_at,
    updated_at
) 
SELECT 
    id,
    raw_user_meta_data->>'full_name',
    email,
    CASE 
        WHEN email = 'agent@acss.test' THEN '+211 123 456 789'
        WHEN email = 'officer@acss.test' THEN '+211 234 567 890'
        WHEN email = 'inspector@acss.test' THEN '+211 345 678 901'
        WHEN email = 'supervisor@acss.test' THEN '+211 456 789 012'
        WHEN email = 'revenue@acss.test' THEN '+211 567 890 123'
    END,
    CASE 
        WHEN email = 'agent@acss.test' THEN 'agent'::user_role
        WHEN email = 'officer@acss.test' THEN 'officer'::user_role
        WHEN email = 'inspector@acss.test' THEN 'inspector'::user_role
        WHEN email = 'supervisor@acss.test' THEN 'supervisor'::user_role
        WHEN email = 'revenue@acss.test' THEN 'revenue'::user_role
    END,
    'active',
    CASE 
        WHEN email = 'agent@acss.test' THEN 'Test Customs Agency'
        ELSE 'South Sudan Customs'
    END,
    NOW(),
    NOW()
FROM auth.users 
WHERE email IN ('agent@acss.test', 'officer@acss.test', 'inspector@acss.test', 'supervisor@acss.test', 'revenue@acss.test')
AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = auth.users.id
);
