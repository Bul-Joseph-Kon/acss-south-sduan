-- ================================================================
-- MIGRATION 009: Add Missing Audit and System Columns
-- ================================================================

-- 1. Add missing AI validation columns to applications table
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS ai_validation_results JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ai_validation_passed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS returned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS validation JSONB DEFAULT '{}';

-- 2. Add missing payment processing columns to payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS payment_details JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS failure_reason TEXT,
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS refund_reason TEXT;

-- 3. Add missing audit column to system_settings table
ALTER TABLE public.system_settings
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
