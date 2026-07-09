-- ================================================================
-- ADD STAFF FIELDS TO PROFILES TABLE
-- ================================================================
-- This migration adds employee_id, department, and customs_office fields
-- to support staff account creation by administrators
-- ================================================================

-- Add employee_id field
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS employee_id TEXT;

-- Add department field
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS department TEXT;

-- Add customs_office field
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS customs_office TEXT;

-- Add index for employee_id
CREATE INDEX IF NOT EXISTS idx_profiles_employee_id ON profiles(employee_id);

-- Add index for department
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(department);

-- Add index for customs_office
CREATE INDEX IF NOT EXISTS idx_profiles_customs_office ON profiles(customs_office);

-- ================================================================
-- END OF MIGRATION
-- ================================================================
