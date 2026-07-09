-- ================================================================
-- MIGRATION 004: Fix RLS Recursion Issues
-- ================================================================
-- This migration fixes infinite recursion in RLS policies by:
-- 1. Creating a separate admin_users table to avoid self-referencing
-- 2. Removing self-referencing EXISTS queries from profiles policies
-- 3. Using admin_users table for admin checks instead of profiles
-- ================================================================

-- ================================================================
-- STEP 1: Create admin_users table
-- ================================================================

CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- STEP 2: Migrate existing administrators to admin_users
-- ================================================================

INSERT INTO public.admin_users (user_id, created_at)
SELECT user_id, NOW()
FROM public.profiles
WHERE role = 'administrator'
ON CONFLICT (user_id) DO NOTHING;

-- ================================================================
-- STEP 3: Drop all existing administrator-related policies on profiles
-- ================================================================

DROP POLICY IF EXISTS "Administrators can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Administrators can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;

-- ================================================================
-- STEP 4: Recreate profiles RLS policies without recursion
-- ================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (user_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (user_id = auth.uid());

-- Users can insert their own profile (for self-registration)
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Service role can insert profiles (for Edge Functions)
CREATE POLICY "Service role can insert profiles"
    ON public.profiles FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Administrators can view all profiles (uses admin_users, no recursion)
CREATE POLICY "Administrators can view all profiles"
    ON public.profiles FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- Administrators can update all profiles (uses admin_users, no recursion)
CREATE POLICY "Administrators can update all profiles"
    ON public.profiles FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- ================================================================
-- STEP 5: Update helper function to bypass RLS
-- ================================================================

CREATE OR REPLACE FUNCTION get_current_profile_id()
RETURNS UUID AS $$
    SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- ================================================================
-- STEP 6: Create admin_users RLS policies
-- ================================================================

-- Enable RLS on admin_users (idempotent check)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'admin_users'
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Only administrators can view admin_users
DROP POLICY IF EXISTS "Administrators can view admin_users" ON public.admin_users;
CREATE POLICY "Administrators can view admin_users"
    ON public.admin_users FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- Only service_role can insert admin_users (for Edge Functions)
DROP POLICY IF EXISTS "Service role can insert admin_users" ON public.admin_users;
CREATE POLICY "Service role can insert admin_users"
    ON public.admin_users FOR INSERT
    TO service_role
    WITH CHECK (true);

-- ================================================================
-- STEP 7: Update other table policies to use admin_users
-- ================================================================

-- Applications
DROP POLICY IF EXISTS "Officers can view assigned applications" ON public.applications;
CREATE POLICY "Officers can view assigned applications"
    ON public.applications FOR SELECT
    USING (officer_id = get_current_profile_id() OR EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Supervisors can view departmental applications" ON public.applications;
CREATE POLICY "Supervisors can view departmental applications"
    ON public.applications FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Administrators can view all applications" ON public.applications;
CREATE POLICY "Administrators can view all applications"
    ON public.applications FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Officers can update assigned applications" ON public.applications;
CREATE POLICY "Officers can update assigned applications"
    ON public.applications FOR UPDATE
    USING (officer_id = get_current_profile_id() OR EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- Documents
DROP POLICY IF EXISTS "Administrators can view all documents" ON public.documents;
CREATE POLICY "Administrators can view all documents"
    ON public.documents FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- Payments
DROP POLICY IF EXISTS "Administrators can view all payments" ON public.payments;
CREATE POLICY "Administrators can view all payments"
    ON public.payments FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- Audit logs
DROP POLICY IF EXISTS "Administrators can view all audit logs" ON public.audit_logs;
CREATE POLICY "Administrators can view all audit logs"
    ON public.audit_logs FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- Activity logs
DROP POLICY IF EXISTS "Administrators can view all activity logs" ON public.activity_logs;
CREATE POLICY "Administrators can view all activity logs"
    ON public.activity_logs FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- System settings
DROP POLICY IF EXISTS "Administrators can update system settings" ON public.system_settings;
CREATE POLICY "Administrators can update system settings"
    ON public.system_settings FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Administrators can insert system settings" ON public.system_settings;
CREATE POLICY "Administrators can insert system settings"
    ON public.system_settings FOR INSERT
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- Services
DROP POLICY IF EXISTS "Administrators can view all services" ON public.services;
CREATE POLICY "Administrators can view all services"
    ON public.services FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Administrators can insert services" ON public.services;
CREATE POLICY "Administrators can insert services"
    ON public.services FOR INSERT
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Administrators can update services" ON public.services;
CREATE POLICY "Administrators can update services"
    ON public.services FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- Departments
DROP POLICY IF EXISTS "Administrators can modify departments" ON public.departments;
CREATE POLICY "Administrators can modify departments"
    ON public.departments FOR ALL
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- Offices
DROP POLICY IF EXISTS "Administrators can view all offices" ON public.offices;
CREATE POLICY "Administrators can view all offices"
    ON public.offices FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Administrators can modify offices" ON public.offices;
CREATE POLICY "Administrators can modify offices"
    ON public.offices FOR ALL
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- Countries
DROP POLICY IF EXISTS "Administrators can view all countries" ON public.countries;
CREATE POLICY "Administrators can view all countries"
    ON public.countries FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Administrators can modify countries" ON public.countries;
CREATE POLICY "Administrators can modify countries"
    ON public.countries FOR ALL
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- Ports
DROP POLICY IF EXISTS "Administrators can view all ports" ON public.ports;
CREATE POLICY "Administrators can view all ports"
    ON public.ports FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Administrators can modify ports" ON public.ports;
CREATE POLICY "Administrators can modify ports"
    ON public.ports FOR ALL
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- Tariff codes
DROP POLICY IF EXISTS "Administrators can view all tariff codes" ON public.tariff_codes;
CREATE POLICY "Administrators can view all tariff codes"
    ON public.tariff_codes FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Administrators can modify tariff codes" ON public.tariff_codes;
CREATE POLICY "Administrators can modify tariff codes"
    ON public.tariff_codes FOR ALL
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- Currencies
DROP POLICY IF EXISTS "Administrators can view all currencies" ON public.currencies;
CREATE POLICY "Administrators can view all currencies"
    ON public.currencies FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Administrators can modify currencies" ON public.currencies;
CREATE POLICY "Administrators can modify currencies"
    ON public.currencies FOR ALL
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- Roles
DROP POLICY IF EXISTS "Administrators can insert roles" ON public.roles;
CREATE POLICY "Administrators can insert roles"
    ON public.roles FOR INSERT
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Administrators can update roles" ON public.roles;
CREATE POLICY "Administrators can update roles"
    ON public.roles FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Administrators can delete roles" ON public.roles;
CREATE POLICY "Administrators can delete roles"
    ON public.roles FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- ================================================================
-- STEP 8: Create sync trigger for admin_users
-- ================================================================

CREATE OR REPLACE FUNCTION sync_admin_on_role_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'administrator' AND (OLD.role IS NULL OR OLD.role != 'administrator') THEN
        INSERT INTO public.admin_users (user_id, created_at)
        VALUES (NEW.user_id, NOW())
        ON CONFLICT (user_id) DO NOTHING;
    ELSIF NEW.role != 'administrator' AND (OLD.role = 'administrator' OR OLD.role IS NULL) THEN
        DELETE FROM public.admin_users WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_admin_on_role_change ON public.profiles;
CREATE TRIGGER trigger_sync_admin_on_role_change
    AFTER INSERT OR UPDATE OF role ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_admin_on_role_change();

-- ================================================================
-- STEP 9: Verification queries
-- ================================================================

-- Verify admin_users contains current administrator
SELECT 'Admin users in admin_users table:' AS verification, COUNT(*) AS count
FROM public.admin_users;

-- Verify pending traders exist in profiles
SELECT 'Pending traders in profiles:' AS verification, COUNT(*) AS count
FROM public.profiles
WHERE status = 'pending';

-- Verify administrators can read all profiles (run as admin user)
-- SELECT COUNT(*) FROM public.profiles;

-- Verify no recursive policies remain
SELECT 'Profiles RLS policies (should not reference profiles):' AS verification, policyname, qual
FROM pg_policies
WHERE tablename = 'profiles'
AND qual ILIKE '%profiles%';

-- ================================================================
-- END OF MIGRATION
-- ================================================================
