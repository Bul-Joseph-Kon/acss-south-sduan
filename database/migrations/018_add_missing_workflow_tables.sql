-- ================================================================
-- ADD MISSING WORKFLOW TABLES
-- ================================================================

-- ================================================================
-- ESCALATED CASES TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS escalated_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    
    escalated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    escalated_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    escalation_reason TEXT NOT NULL,
    escalation_type TEXT CHECK (escalation_type IN ('inspection', 'valuation', 'compliance', 'other')),
    
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'resolved', 'rejected')),
    
    resolution_notes TEXT,
    resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_escalated_cases_application_id ON escalated_cases(application_id);
CREATE INDEX IF NOT EXISTS idx_escalated_cases_escalated_by ON escalated_cases(escalated_by);
CREATE INDEX IF NOT EXISTS idx_escalated_cases_status ON escalated_cases(status);
CREATE INDEX IF NOT EXISTS idx_escalated_cases_priority ON escalated_cases(priority);

-- ================================================================
-- RISK ASSESSMENTS TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS risk_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    
    overall_score NUMERIC,
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    
    fraud_score NUMERIC,
    compliance_score NUMERIC,
    valuation_score NUMERIC,
    
    risk_factors JSONB DEFAULT '{}',
    recommendations JSONB DEFAULT '[]',
    
    assessed_by TEXT DEFAULT 'ai',
    assessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_risk_assessments_application_id ON risk_assessments(application_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_risk_level ON risk_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_assessed_at ON risk_assessments(assessed_at DESC);

-- ================================================================
-- AI VALIDATION RESULTS TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS ai_validation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    
    validation_type TEXT CHECK (validation_type IN ('ocr', 'document_verification', 'hs_code_validation', 'fraud_detection', 'compliance_check')),
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'passed', 'failed', 'warning')),
    
    confidence_score NUMERIC,
    
    results JSONB DEFAULT '{}',
    errors JSONB DEFAULT '[]',
    warnings JSONB DEFAULT '[]',
    
    processing_time_ms INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_validation_results_application_id ON ai_validation_results(application_id);
CREATE INDEX IF NOT EXISTS idx_ai_validation_results_validation_type ON ai_validation_results(validation_type);
CREATE INDEX IF NOT EXISTS idx_ai_validation_results_status ON ai_validation_results(status);

-- ================================================================
-- CVET CERTIFICATES TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS cvet_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    
    certificate_number TEXT UNIQUE NOT NULL,
    qr_code TEXT,
    
    issued_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    valid_from DATE,
    valid_until DATE,
    
    certificate_data JSONB DEFAULT '{}',
    
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cvet_certificates_application_id ON cvet_certificates(application_id);
CREATE INDEX IF NOT EXISTS idx_cvet_certificates_certificate_number ON cvet_certificates(certificate_number);
CREATE INDEX IF NOT EXISTS idx_cvet_certificates_status ON cvet_certificates(status);

-- ================================================================
-- CARGO RELEASE DOCUMENTS TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS cargo_release_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    
    release_number TEXT UNIQUE NOT NULL,
    release_order_number TEXT UNIQUE,
    
    port_of_release TEXT,
    release_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    released_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    cargo_description TEXT,
    quantity NUMERIC,
    unit TEXT,
    
    release_conditions JSONB DEFAULT '{}',
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'released', 'on_hold', 'cancelled')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cargo_release_documents_application_id ON cargo_release_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_cargo_release_documents_release_number ON cargo_release_documents(release_number);
CREATE INDEX IF NOT EXISTS idx_cargo_release_documents_status ON cargo_release_documents(status);

-- ================================================================
-- INVOICES TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    
    invoice_number TEXT UNIQUE NOT NULL,
    
    subtotal NUMERIC NOT NULL,
    tax_amount NUMERIC NOT NULL,
    total_amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'SSP',
    
    due_date DATE,
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
    
    items JSONB DEFAULT '[]',
    
    generated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    paid_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_application_id ON invoices(application_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Add due_date column if it doesn't exist, then create index
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invoices' AND column_name = 'due_date'
    ) THEN
        ALTER TABLE invoices ADD COLUMN due_date DATE;
    END IF;
    CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- ================================================================
-- END OF MIGRATION
-- ================================================================
