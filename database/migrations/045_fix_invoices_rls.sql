-- ================================================================
-- FIX INVOICES RLS POLICY FOR REVENUE OFFICERS AND TRADERS
-- ================================================================
-- This migration adds RLS policies for invoices table
-- to allow revenue officers to insert and view invoices
-- and traders to view their own invoices
-- ================================================================

-- Drop ALL existing policies on invoices table
DROP POLICY IF EXISTS "Everyone can view invoices" ON invoices;
DROP POLICY IF EXISTS "Staff can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Staff can update invoices" ON invoices;
DROP POLICY IF EXISTS "Traders can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Staff can view all invoices" ON invoices;
DROP POLICY IF EXISTS "Users can view invoices for their applications" ON invoices;
DROP POLICY IF EXISTS "Revenue officers can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Revenue officers can update invoices" ON invoices;

-- Enable RLS on invoices table
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Allow traders to view their own invoices via applications
CREATE POLICY "Traders can view own invoices"
    ON invoices FOR SELECT
    USING (
        application_id IN (
            SELECT id FROM applications WHERE user_id IN (
                SELECT id FROM profiles WHERE user_id = auth.uid()
            )
        )
    );

-- Allow revenue officers and staff to view all invoices
CREATE POLICY "Staff can view all invoices"
    ON invoices FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role IN ('revenue', 'supervisor')
        )
    );

-- Allow revenue officers and staff to insert invoices
CREATE POLICY "Staff can insert invoices"
    ON invoices FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role IN ('revenue', 'supervisor')
        )
    );

-- Allow revenue officers and staff to update invoices
CREATE POLICY "Staff can update invoices"
    ON invoices FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role IN ('revenue', 'supervisor')
        )
    );
