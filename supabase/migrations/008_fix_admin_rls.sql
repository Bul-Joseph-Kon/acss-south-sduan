-- ================================================================
-- MIGRATION 008: Fix Administrator RLS Policies & Trigger Function
-- ================================================================

-- 1. Fix sync trigger function to avoid referencing OLD record during INSERT
CREATE OR REPLACE FUNCTION sync_admin_on_role_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.role = 'administrator' THEN
            INSERT INTO public.admin_users (user_id, created_at)
            VALUES (NEW.user_id, NOW())
            ON CONFLICT (user_id) DO NOTHING;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.role = 'administrator' AND (OLD.role IS DISTINCT FROM 'administrator') THEN
            INSERT INTO public.admin_users (user_id, created_at)
            VALUES (NEW.user_id, NOW())
            ON CONFLICT (user_id) DO NOTHING;
        ELSIF NEW.role != 'administrator' AND (OLD.role = 'administrator') THEN
            DELETE FROM public.admin_users WHERE user_id = NEW.user_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix the infinite recursion on admin_users select policy
DROP POLICY IF EXISTS "Administrators can view admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Administrators can view admin_users" ON public;
DROP POLICY IF EXISTS "Administrators can view admin_users" ON public.admin_users;
CREATE POLICY "Administrators can view admin_users" ON public.admin_users FOR SELECT
    USING (user_id = auth.uid());

-- 3. Add missing administrator RLS policies for notifications
DROP POLICY IF EXISTS "Administrators can view all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Administrators can view all notifications" ON public;
DROP POLICY IF EXISTS "Administrators can view all notifications" ON public.notifications;
CREATE POLICY "Administrators can view all notifications" ON public.notifications FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Administrators can update all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Administrators can update all notifications" ON public;
DROP POLICY IF EXISTS "Administrators can update all notifications" ON public.notifications;
CREATE POLICY "Administrators can update all notifications" ON public.notifications FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Administrators can delete all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Administrators can delete all notifications" ON public;
DROP POLICY IF EXISTS "Administrators can delete all notifications" ON public.notifications;
CREATE POLICY "Administrators can delete all notifications" ON public.notifications FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- 4. Ensure admin has UPDATE and DELETE access to applications
DROP POLICY IF EXISTS "Administrators can update all applications" ON public.applications;
DROP POLICY IF EXISTS "Administrators can update all applications" ON public;
DROP POLICY IF EXISTS "Administrators can update all applications" ON public.applications;
CREATE POLICY "Administrators can update all applications" ON public.applications FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Administrators can delete all applications" ON public.applications;
DROP POLICY IF EXISTS "Administrators can delete all applications" ON public;
DROP POLICY IF EXISTS "Administrators can delete all applications" ON public.applications;
CREATE POLICY "Administrators can delete all applications" ON public.applications FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- 5. Ensure admin has delete access to profiles
DROP POLICY IF EXISTS "Administrators can delete all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Administrators can delete all profiles" ON public;
DROP POLICY IF EXISTS "Administrators can delete all profiles" ON public.profiles;
CREATE POLICY "Administrators can delete all profiles" ON public.profiles FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));
