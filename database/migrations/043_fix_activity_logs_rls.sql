-- ================================================================
-- FIX ACTIVITY LOGS RLS POLICY FOR SUPERVISORS
-- ================================================================
-- This migration adds a policy to allow supervisors and officers
-- to insert activity logs
-- ================================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Staff can insert activity logs" ON activity_logs;

-- Add policy for staff to insert activity logs
-- Using true temporarily since profiles RLS is disabled
CREATE POLICY "Staff can insert activity logs"
    ON activity_logs FOR INSERT
    WITH CHECK (true);
