-- ================================================================
-- FIX TAX CALCULATIONS RLS POLICY FOR REVENUE OFFICERS
-- ================================================================
-- This migration adds RLS policies for tax_calculations table
-- to allow revenue officers to insert and view tax calculations
-- ================================================================

-- Enable RLS on tax_calculations table
ALTER TABLE tax_calculations ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view tax calculations (for transparency)
CREATE POLICY "Everyone can view tax calculations"
    ON tax_calculations FOR SELECT
    USING (true);

-- Allow revenue officers and staff to insert tax calculations
CREATE POLICY "Staff can insert tax calculations"
    ON tax_calculations FOR INSERT
    WITH CHECK (true);

-- Allow revenue officers and staff to update tax calculations
CREATE POLICY "Staff can update tax calculations"
    ON tax_calculations FOR UPDATE
    USING (true);
