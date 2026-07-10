-- ================================================================
-- MIGRATION 014: Add Trader Details Fields to Applications Table
-- ================================================================

-- Add trader-specific fields to applications table
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS trader_name TEXT,
ADD COLUMN IF NOT EXISTS trader_tin TEXT,
ADD COLUMN IF NOT EXISTS trader_address TEXT,
ADD COLUMN IF NOT EXISTS trader_contact TEXT,
ADD COLUMN IF NOT EXISTS trader_email TEXT;

-- Add indexes for trader fields
CREATE INDEX IF NOT EXISTS idx_applications_trader_tin ON public.applications(trader_tin);
CREATE INDEX IF NOT EXISTS idx_applications_trader_name ON public.applications(trader_name);
