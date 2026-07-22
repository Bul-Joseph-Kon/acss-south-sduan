-- ================================================================
-- ADD AGENT UPDATE POLICY FOR APPLICATIONS
-- ================================================================
-- This migration adds the missing UPDATE policy to allow agents to update their own applications
-- This is needed for agents to change status from draft to submitted
-- ================================================================

-- Agents can update their own applications
DROP POLICY IF EXISTS "Agents can update own applications" ON public.applications;
CREATE POLICY "Agents can update own applications"
    ON public.applications FOR UPDATE
    USING (agent_id = get_current_profile_id())
    WITH CHECK (agent_id = get_current_profile_id());
