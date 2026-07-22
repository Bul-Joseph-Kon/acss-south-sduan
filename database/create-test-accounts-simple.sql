-- Simple script to create test accounts
-- Run this in Supabase SQL Editor with service role privileges

-- Enable email confirmation bypass for testing
UPDATE auth.users SET email_confirmed_at = NOW() WHERE email IN (
  'agent@acss.test',
  'officer@acss.test', 
  'inspector@acss.test',
  'supervisor@acss.test',
  'revenue@acss.test'
);

-- If no users exist, create them using the admin API
-- For manual creation, use Supabase Dashboard > Authentication > Users > Add User
-- Or run this after creating users via dashboard:

-- Create profiles for test users
INSERT INTO profiles (user_id, full_name, email, phone, role, status, organization, created_at, updated_at)
SELECT 
  id,
  CASE email 
    WHEN 'agent@acss.test' THEN 'Test Agent'
    WHEN 'officer@acss.test' THEN 'Test Officer'
    WHEN 'inspector@acss.test' THEN 'Test Inspector'
    WHEN 'supervisor@acss.test' THEN 'Test Supervisor'
    WHEN 'revenue@acss.test' THEN 'Test Revenue Officer'
  END,
  email,
  CASE email 
    WHEN 'agent@acss.test' THEN '+211 123 456 789'
    WHEN 'officer@acss.test' THEN '+211 234 567 890'
    WHEN 'inspector@acss.test' THEN '+211 345 678 901'
    WHEN 'supervisor@acss.test' THEN '+211 456 789 012'
    WHEN 'revenue@acss.test' THEN '+211 567 890 123'
  END,
  CASE email 
    WHEN 'agent@acss.test' THEN 'agent'
    WHEN 'officer@acss.test' THEN 'officer'
    WHEN 'inspector@acss.test' THEN 'inspector'
    WHEN 'supervisor@acss.test' THEN 'supervisor'
    WHEN 'revenue@acss.test' THEN 'revenue'
  END::user_role,
  'active',
  CASE email 
    WHEN 'agent@acss.test' THEN 'Test Customs Agency'
    ELSE 'South Sudan Customs'
  END,
  NOW(),
  NOW()
FROM auth.users 
WHERE email IN ('agent@acss.test', 'officer@acss.test', 'inspector@acss.test', 'supervisor@acss.test', 'revenue@acss.test')
ON CONFLICT (user_id) DO NOTHING;
