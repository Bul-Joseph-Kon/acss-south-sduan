-- ================================================================
-- ADD AGENT SELECT POLICY FOR APPLICATIONS
-- ================================================================
-- This migration adds the missing SELECT policy to allow agents to view their own applications
-- This is needed for agents to load their applications and clients on the dashboard
-- ================================================================

-- Agents can select their own applications
DROP POLICY IF EXISTS "Agents can view own applications" ON public.applications;
CREATE POLICY "Agents can view own applications"
    ON public.applications FOR SELECT
    USING (agent_id = get_current_profile_id());

-- Agents can view profiles of users who have applications with them
DROP POLICY IF EXISTS "Agents can view client profiles" ON public.profiles;
CREATE POLICY "Agents can view client profiles"
    ON public.profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.applications
            WHERE applications.user_id = profiles.id
            AND applications.agent_id = get_current_profile_id()
        )
    );

-- ================================================================
-- END OF MIGRATION
-- ================================================================
