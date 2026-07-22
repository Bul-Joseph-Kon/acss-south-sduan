-- ================================================================
-- ACSS WORKFLOW MIGRATION
-- ================================================================
-- Implements the complete ACSS customs clearance workflow
-- ================================================================

-- ================================================================
-- UPDATE APPLICATIONS TABLE WITH NEW WORKFLOW STATUSES
-- ================================================================

-- Add new columns for workflow tracking (non-referencing columns first)
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS inspection_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS escalated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS escalated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cleared_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Update status check constraint to include all new statuses
ALTER TABLE applications
DROP CONSTRAINT IF EXISTS applications_status_check;

ALTER TABLE applications
ADD CONSTRAINT applications_status_check
CHECK (status IN (
    'draft',
    'submitted',
    'under_review',
    'inspection_required',
    'inspection_completed',
    'escalated',
    'approved',
    'payment_required',
    'paid',
    'payment_verified',
    'completed',
    'returned',
    'rejected'
));

-- ================================================================
-- CREATE OR UPDATE AI_VALIDATION_RESULTS TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS ai_validation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    validation_status TEXT NOT NULL DEFAULT 'pending',
    validation_passed BOOLEAN,
    validation_score INTEGER,
    
    -- OCR Results
    ocr_extracted_data JSONB,
    ocr_confidence DECIMAL(5,2),
    
    -- Document Verification
    document_verification JSONB,
    
    -- HS Code Validation
    hs_code_validation JSONB,
    
    -- Customs Value Verification
    customs_value_verification JSONB,
    
    -- Duty & Tax Calculation
    duty_calculated DECIMAL(15,2),
    tax_calculated DECIMAL(15,2),
    total_calculated DECIMAL(15,2),
    duty_calculation JSONB,
    
    -- Duplicate Detection
    duplicate_found BOOLEAN DEFAULT FALSE,
    duplicate_references TEXT[],
    
    -- Fraud Detection
    fraud_detected BOOLEAN DEFAULT FALSE,
    fraud_indicators JSONB,
    
    -- Risk Assessment
    risk_level TEXT,
    risk_score INTEGER,
    risk_factors JSONB,
    
    -- Recommendations
    recommendations JSONB,
    
    -- Validation Report
    validation_report TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT ai_validation_status_check
    CHECK (validation_status IN ('pending', 'in_progress', 'completed', 'failed'))
);

-- Create index on application_id
CREATE INDEX IF NOT EXISTS idx_ai_validation_application_id ON ai_validation_results(application_id);

-- Enable RLS
ALTER TABLE ai_validation_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view AI validation results for their applications" ON ai_validation_results;
CREATE POLICY "Users can view AI validation results for their applications" ON ai_validation_results FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM applications
        WHERE applications.id = ai_validation_results.application_id
        AND applications.user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('administrator', 'officer', 'inspector', 'supervisor', 'revenue')
    )
);

DROP POLICY IF EXISTS "System can insert AI validation results" ON ai_validation_results;
CREATE POLICY "System can insert AI validation results" ON ai_validation_results FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "System can update AI validation results" ON ai_validation_results;
CREATE POLICY "System can update AI validation results" ON ai_validation_results FOR UPDATE
WITH CHECK (true);

-- ================================================================
-- CREATE OR UPDATE INSPECTION_REPORTS TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS inspection_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    inspector_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Inspection Details
    inspection_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    inspection_location TEXT,
    container_number TEXT,
    
    -- Findings
    findings_summary TEXT,
    discrepancies TEXT,
    violations TEXT,
    
    -- Recommendation
    recommendation TEXT NOT NULL,
    recommendation_reason TEXT,
    
    -- Supporting Documents
    supporting_documents TEXT[],
    
    -- Status
    status TEXT NOT NULL DEFAULT 'submitted',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT inspection_recommendation_check
    CHECK (recommendation IN ('approve', 'reject', 'return')),
    CONSTRAINT inspection_status_check
    CHECK (status IN ('submitted', 'reviewed', 'accepted', 'rejected'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inspection_application_id ON inspection_reports(application_id);
CREATE INDEX IF NOT EXISTS idx_inspection_inspector_id ON inspection_reports(inspector_id);

-- Enable RLS
ALTER TABLE inspection_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view inspection reports for their applications" ON inspection_reports;
CREATE POLICY "Users can view inspection reports for their applications" ON inspection_reports FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM applications
        WHERE applications.id = inspection_reports.application_id
        AND applications.user_id = auth.uid()
    )
    OR inspection_reports.inspector_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('administrator', 'officer', 'supervisor', 'revenue')
    )
);

DROP POLICY IF EXISTS "Inspectors can insert inspection reports" ON inspection_reports;
CREATE POLICY "Inspectors can insert inspection reports" ON inspection_reports FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'inspector'
    )
);

DROP POLICY IF EXISTS "Inspectors can update their inspection reports" ON inspection_reports;
CREATE POLICY "Inspectors can update their inspection reports" ON inspection_reports FOR UPDATE
USING (inspector_id = auth.uid());

-- ================================================================
-- CREATE OR UPDATE GENERATED_DOCUMENTS TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS generated_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    document_number TEXT,
    file_path TEXT,
    file_url TEXT,
    generated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT document_type_check
    CHECK (document_type IN ('receipt', 'cvet', 'cargo_release_order', 'clearance_certificate'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_generated_documents_application_id ON generated_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_type ON generated_documents(document_type);

-- Enable RLS
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view generated documents for their applications" ON generated_documents;
CREATE POLICY "Users can view generated documents for their applications" ON generated_documents FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM applications
        WHERE applications.id = generated_documents.application_id
        AND applications.user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('administrator', 'officer', 'inspector', 'supervisor', 'revenue')
    )
);

DROP POLICY IF EXISTS "System can insert generated documents" ON generated_documents;
CREATE POLICY "System can insert generated documents" ON generated_documents FOR INSERT
WITH CHECK (true);

-- ================================================================
-- CREATE OR UPDATE WORKFLOW_LOGS TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS workflow_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    action TEXT NOT NULL,
    notes TEXT,
    performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workflow_logs_application_id ON workflow_logs(application_id);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_performed_at ON workflow_logs(performed_at DESC);

-- Enable RLS
ALTER TABLE workflow_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view workflow logs for their applications" ON workflow_logs;
CREATE POLICY "Users can view workflow logs for their applications" ON workflow_logs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM applications
        WHERE applications.id = workflow_logs.application_id
        AND applications.user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('administrator', 'officer', 'inspector', 'supervisor', 'revenue')
    )
);

DROP POLICY IF EXISTS "System can insert workflow logs" ON workflow_logs;
CREATE POLICY "System can insert workflow logs" ON workflow_logs FOR INSERT
WITH CHECK (true);

-- ================================================================
-- CREATE OR UPDATE INVOICES TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    
    -- Amounts
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    duty_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    fees_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Dates
    issue_date DATE NOT NULL,
    due_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending',
    
    -- Generated by
    generated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT invoice_status_check
    CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoices_application_id ON invoices(application_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view invoices for their applications" ON invoices;
CREATE POLICY "Users can view invoices for their applications" ON invoices FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM applications
        WHERE applications.id = invoices.application_id
        AND applications.user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('administrator', 'officer', 'inspector', 'supervisor', 'revenue')
    )
);

DROP POLICY IF EXISTS "Revenue officers can insert invoices" ON invoices;
CREATE POLICY "Revenue officers can insert invoices" ON invoices FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'revenue'
    )
);

DROP POLICY IF EXISTS "Revenue officers can update invoices" ON invoices;
CREATE POLICY "Revenue officers can update invoices" ON invoices FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'revenue'
    )
);

-- ================================================================
-- CREATE OR UPDATE PAYMENTS TABLE
-- ================================================================

-- Ensure invoice_id exists in payments table in case it was created manually
DO $
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
        IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'payments'::regclass AND attname = 'invoice_id') THEN
            ALTER TABLE payments ADD COLUMN invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $;

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number TEXT UNIQUE NOT NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    
    -- Amount
    amount DECIMAL(15,2) NOT NULL,
    
    -- Payment Details
    payment_method TEXT,
    payment_reference TEXT,
    proof_document TEXT,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending',
    
    -- Paid by
    paid_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Verified by
    verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT payment_status_check
    CHECK (status IN ('pending', 'processing', 'completed', 'verified', 'rejected', 'failed'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payments_application_id ON payments(application_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_number ON payments(payment_number);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view payments for their applications" ON payments;
CREATE POLICY "Users can view payments for their applications" ON payments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM applications
        WHERE applications.id = payments.application_id
        AND applications.user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('administrator', 'officer', 'inspector', 'supervisor', 'revenue')
    )
);

DROP POLICY IF EXISTS "Agents can insert payments" ON payments;
CREATE POLICY "Agents can insert payments" ON payments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'agent'
    )
);

DROP POLICY IF EXISTS "Revenue officers can update payments" ON payments;
CREATE POLICY "Revenue officers can update payments" ON payments FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'revenue'
    )
);

-- ================================================================
-- CREATE TRIGGER FOR UPDATED_AT
-- ================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER update_ai_validation_updated_at
    BEFORE UPDATE ON ai_validation_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspection_report_updated_at
    BEFORE UPDATE ON inspection_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- GRANT PERMISSIONS
-- ================================================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant select on all tables to authenticated
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant insert/update on specific tables
GRANT INSERT, UPDATE ON ai_validation_results TO authenticated;
GRANT INSERT, UPDATE ON inspection_reports TO authenticated;
GRANT INSERT, UPDATE ON generated_documents TO authenticated;
GRANT INSERT, UPDATE ON workflow_logs TO authenticated;
GRANT INSERT, UPDATE ON invoices TO authenticated;
GRANT INSERT, UPDATE ON payments TO authenticated;

-- ================================================================
-- ADD FOREIGN KEY COLUMNS TO APPLICATIONS (AFTER REFERENCED TABLES EXIST)
-- ================================================================
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS ai_validation_id UUID REFERENCES ai_validation_results(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS inspection_report_id UUID REFERENCES inspection_reports(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS inspector_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
