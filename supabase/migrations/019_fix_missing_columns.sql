-- ================================================================
-- FIX MISSING COLUMNS IN EXISTING TABLES
-- ================================================================

-- Add missing columns to ai_validation_results table if they don't exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ai_validation_results') THEN
        -- Add validation_type column if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'ai_validation_results'::regclass AND attname = 'validation_type') THEN
            ALTER TABLE ai_validation_results ADD COLUMN validation_type TEXT CHECK (validation_type IN ('ocr', 'document_verification', 'hs_code_validation', 'fraud_detection', 'compliance_check'));
        END IF;
        
        -- Add status column if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'ai_validation_results'::regclass AND attname = 'status') THEN
            ALTER TABLE ai_validation_results ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'passed', 'failed', 'warning'));
        END IF;
        
        -- Add confidence_score column if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'ai_validation_results'::regclass AND attname = 'confidence_score') THEN
            ALTER TABLE ai_validation_results ADD COLUMN confidence_score NUMERIC;
        END IF;
        
        -- Add results column if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'ai_validation_results'::regclass AND attname = 'results') THEN
            ALTER TABLE ai_validation_results ADD COLUMN results JSONB DEFAULT '{}';
        END IF;
        
        -- Add errors column if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'ai_validation_results'::regclass AND attname = 'errors') THEN
            ALTER TABLE ai_validation_results ADD COLUMN errors JSONB DEFAULT '[]';
        END IF;
        
        -- Add warnings column if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'ai_validation_results'::regclass AND attname = 'warnings') THEN
            ALTER TABLE ai_validation_results ADD COLUMN warnings JSONB DEFAULT '[]';
        END IF;
        
        -- Add processing_time_ms column if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'ai_validation_results'::regclass AND attname = 'processing_time_ms') THEN
            ALTER TABLE ai_validation_results ADD COLUMN processing_time_ms INTEGER;
        END IF;
        
        -- Add updated_at column if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'ai_validation_results'::regclass AND attname = 'updated_at') THEN
            ALTER TABLE ai_validation_results ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- Create indexes for ai_validation_results if they don't exist
CREATE INDEX IF NOT EXISTS idx_ai_validation_results_validation_type ON ai_validation_results(validation_type);
CREATE INDEX IF NOT EXISTS idx_ai_validation_results_status ON ai_validation_results(status);

-- Create cvet_certificates table if it doesn't exist
CREATE TABLE IF NOT EXISTS cvet_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    CONSTRAINT fk_cvet_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- Create indexes for cvet_certificates
CREATE INDEX IF NOT EXISTS idx_cvet_certificates_application_id ON cvet_certificates(application_id);
CREATE INDEX IF NOT EXISTS idx_cvet_certificates_certificate_number ON cvet_certificates(certificate_number);
CREATE INDEX IF NOT EXISTS idx_cvet_certificates_status ON cvet_certificates(status);

-- Create cargo_release_documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS cargo_release_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    
    release_number TEXT UNIQUE NOT NULL,
    release_order_number TEXT UNIQUE,
    
    port_of_release TEXT,
    release_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    released_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    cargo_description TEXT,
    quantity NUMERIC,
    unit TEXT,
    
    status TEXT DEFAULT 'released' CHECK (status IN ('pending', 'released', 'cancelled')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_cargo_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- Create indexes for cargo_release_documents
CREATE INDEX IF NOT EXISTS idx_cargo_release_documents_application_id ON cargo_release_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_cargo_release_documents_release_number ON cargo_release_documents(release_number);
CREATE INDEX IF NOT EXISTS idx_cargo_release_documents_status ON cargo_release_documents(status);

-- Create invoices table if it doesn't exist
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    
    invoice_number TEXT UNIQUE NOT NULL,
    
    subtotal NUMERIC NOT NULL,
    tax_amount NUMERIC NOT NULL,
    total_amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'SSP',
    
    due_date DATE,
    paid_at TIMESTAMP WITH TIME ZONE,
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    
    items JSONB DEFAULT '[]',
    notes TEXT,
    
    generated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_invoice_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- Create indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_application_id ON invoices(application_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
