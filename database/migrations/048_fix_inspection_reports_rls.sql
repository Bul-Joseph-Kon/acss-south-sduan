-- ================================================================
-- FIX INSPECTION_REPORTS RLS POLICY FOR INSPECTORS
-- ================================================================
-- This migration fixes the RLS policy for inspection_reports
-- to properly allow inspectors to insert inspection reports
-- ================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view inspection reports for their applications" ON inspection_reports;
DROP POLICY IF EXISTS "Inspectors can insert inspection reports" ON inspection_reports;
DROP POLICY IF EXISTS "Inspectors can update their inspection reports" ON inspection_reports;

-- Enable RLS
ALTER TABLE inspection_reports ENABLE ROW LEVEL SECURITY;

-- Policy for users to view inspection reports for their applications
CREATE POLICY "Users can view inspection reports for their applications"
    ON inspection_reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM applications
            WHERE applications.id = inspection_reports.application_id
            AND applications.user_id IN (
                SELECT id FROM profiles WHERE user_id = auth.uid()
            )
        )
        OR inspection_reports.inspector_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id IN (
                SELECT id FROM profiles WHERE user_id = auth.uid()
            )
            AND profiles.role = 'inspector'
        )
    );

-- Policy for inspectors to insert inspection reports
CREATE POLICY "Inspectors can insert inspection reports"
    ON inspection_reports FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'inspector'
        )
    );

-- Policy for inspectors to update their inspection reports
CREATE POLICY "Inspectors can update their inspection reports"
    ON inspection_reports FOR UPDATE
    USING (
        inspector_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );
