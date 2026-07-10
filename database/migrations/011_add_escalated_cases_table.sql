-- ================================================================
-- MIGRATION 011: Add Escalated Cases Table
-- ================================================================

-- Drop table if it exists to ensure clean schema
DROP TABLE IF EXISTS public.escalated_cases CASCADE;

CREATE TABLE public.escalated_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    escalated_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    escalated_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    escalation_reason TEXT NOT NULL,
    escalation_type TEXT NOT NULL CHECK (escalation_type IN ('inspection', 'review', 'payment', 'general')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'resolved', 'rejected')),
    
    resolution_notes TEXT,
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_escalated_cases_application_id ON public.escalated_cases(application_id);
CREATE INDEX IF NOT EXISTS idx_escalated_cases_escalated_by ON public.escalated_cases(escalated_by);
CREATE INDEX IF NOT EXISTS idx_escalated_cases_escalated_to ON public.escalated_cases(escalated_to);
CREATE INDEX IF NOT EXISTS idx_escalated_cases_status ON public.escalated_cases(status);
CREATE INDEX IF NOT EXISTS idx_escalated_cases_created_at ON public.escalated_cases(created_at DESC);

-- Enable RLS
ALTER TABLE public.escalated_cases ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view escalated cases assigned to them" ON public.escalated_cases;
DROP POLICY IF EXISTS "Users can view escalated cases they created" ON public.escalated_cases;
DROP POLICY IF EXISTS "Administrators can view all escalated cases" ON public.escalated_cases;
DROP POLICY IF EXISTS "Users can insert escalated cases" ON public.escalated_cases;
DROP POLICY IF EXISTS "Users can update escalated cases assigned to them" ON public.escalated_cases;
DROP POLICY IF EXISTS "Administrators can update all escalated cases" ON public.escalated_cases;

-- Policies
CREATE POLICY "Users can view escalated cases assigned to them"
    ON public.escalated_cases FOR SELECT
    USING (escalated_to = get_current_profile_id());

CREATE POLICY "Users can view escalated cases they created"
    ON public.escalated_cases FOR SELECT
    USING (escalated_by = get_current_profile_id());

CREATE POLICY "Administrators can view all escalated cases"
    ON public.escalated_cases FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert escalated cases"
    ON public.escalated_cases FOR INSERT
    WITH CHECK (escalated_by = get_current_profile_id());

CREATE POLICY "Users can update escalated cases assigned to them"
    ON public.escalated_cases FOR UPDATE
    USING (escalated_to = get_current_profile_id());

CREATE POLICY "Administrators can update all escalated cases"
    ON public.escalated_cases FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- Update timestamp trigger
DROP FUNCTION IF EXISTS update_escalated_cases_updated_at() CASCADE;
CREATE OR REPLACE FUNCTION update_escalated_cases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_escalated_cases_updated_at ON public.escalated_cases;
CREATE TRIGGER trigger_update_escalated_cases_updated_at
    BEFORE UPDATE ON public.escalated_cases
    FOR EACH ROW
    EXECUTE FUNCTION update_escalated_cases_updated_at();

-- ================================================================
-- END OF MIGRATION
-- ================================================================
