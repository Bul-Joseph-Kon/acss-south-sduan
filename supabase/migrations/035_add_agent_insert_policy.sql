-- ================================================================
-- ADD AGENT INSERT POLICY FOR APPLICATIONS
-- ================================================================
-- This migration adds the missing INSERT policy to allow agents to create new applications
-- This is needed for agents to create vehicle queries, declarations, etc.
-- ================================================================

-- Agents can insert their own applications
DROP POLICY IF EXISTS "Agents can insert own applications" ON public.applications;
DROP POLICY IF EXISTS "Agents can insert own applications" ON public.applications;
CREATE POLICY "Agents can insert own applications" ON public.applications FOR INSERT
    WITH CHECK (agent_id = get_current_profile_id());
