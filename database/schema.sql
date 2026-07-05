-- ================================================================
-- ACSS SOUTH SUDAN - COMPLETE POSTGRESQL SCHEMA
-- ================================================================
-- Supabase Project: https://avpoufxsjiecbsxvngip.supabase.co
-- ================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================================
-- ENUM TYPES
-- ================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'user_role'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.user_role AS ENUM (
      'trader',
      'agent',
      'officer',
      'inspector',
      'supervisor',
      'administrator'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'application_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.application_status AS ENUM (
      'draft',
      'submitted',
      'pending_review',
      'under_inspection',
      'returned',
      'approved',
      'rejected',
      'paid',
      'completed',
      'cancelled'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'notification_type'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.notification_type AS ENUM (
      'info',
      'success',
      'warning',
      'error',
      'system'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'payment_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.payment_status AS ENUM (
      'pending',
      'processing',
      'completed',
      'failed',
      'refunded'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'document_type'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.document_type AS ENUM (
      'pdf',
      'docx',
      'jpg',
      'jpeg',
      'png',
      'zip'
    );
  END IF;
END $$;

-- ================================================================
-- PROFILES TABLE
-- ================================================================

CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    nationality TEXT DEFAULT 'South Sudan',
    applicant_type TEXT DEFAULT 'not_applicable' CHECK (applicant_type IN ('citizen', 'foreigner', 'not_applicable')),
    organization TEXT,
    company TEXT,
    avatar TEXT,
    role user_role NOT NULL DEFAULT 'trader',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT profiles_email_unique UNIQUE (email),
    CONSTRAINT profiles_user_id_unique UNIQUE (user_id)
);

-- Indexes
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(status);

-- ================================================================
-- ROLES TABLE (for role management)
-- ================================================================

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name user_role NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- APPLICATIONS TABLE
-- ================================================================

CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_number TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    officer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    inspector_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    supervisor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    application_type TEXT NOT NULL,
    service_type TEXT,
    
    status application_status DEFAULT 'draft',
    
    -- Application data
    declaration_data JSONB DEFAULT '{}',
    goods_data JSONB DEFAULT '{}',
    vehicle_data JSONB DEFAULT '{}',
    
    -- Tracking
    submitted_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    inspected_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Notes
    notes TEXT,
    rejection_reason TEXT,
    return_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT applications_application_number_format CHECK (
        application_number ~ '^CVET-\d{6}$' OR 
        application_number ~ '^APP-\d{6}$' OR
        application_number ~ '^LIC-\d{6}$'
    )
);

-- Indexes
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_agent_id ON applications(agent_id);
CREATE INDEX idx_applications_officer_id ON applications(officer_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_application_number ON applications(application_number);
CREATE INDEX idx_applications_application_type ON applications(application_type);
CREATE INDEX idx_applications_created_at ON applications(created_at DESC);

-- ================================================================
-- APPLICATION ITEMS TABLE
-- ================================================================

CREATE TABLE application_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    
    item_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    hs_code TEXT,
    quantity NUMERIC NOT NULL,
    unit TEXT,
    unit_price NUMERIC,
    total_value NUMERIC,
    weight NUMERIC,
    origin_country TEXT,
    
    tariff_rate NUMERIC,
    duty_amount NUMERIC,
    tax_amount NUMERIC,
    total_duty NUMERIC,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_application_items_application_id ON application_items(application_id);
CREATE INDEX idx_application_items_hs_code ON application_items(hs_code);

-- ================================================================
-- DOCUMENTS TABLE
-- ================================================================

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    document_name TEXT NOT NULL,
    document_type document_type NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    
    storage_bucket TEXT DEFAULT 'documents',
    storage_path TEXT NOT NULL,
    
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES profiles(id)
);

-- Indexes
CREATE INDEX idx_documents_application_id ON documents(application_id);
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_storage_path ON documents(storage_path);

-- ================================================================
-- NOTIFICATIONS TABLE
-- ================================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type notification_type DEFAULT 'info',
    
    link TEXT,
    reference_id UUID,
    reference_type TEXT,
    
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_reference ON notifications(reference_type, reference_id);

-- ================================================================
-- PAYMENTS TABLE
-- ================================================================

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    payment_number TEXT UNIQUE NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'SSP',
    
    status payment_status DEFAULT 'pending',
    
    payment_method TEXT,
    transaction_id TEXT,
    receipt_number TEXT,
    
    paid_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payments_application_id ON payments(application_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_payment_number ON payments(payment_number);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id);

-- ================================================================
-- AUDIT LOGS TABLE
-- ================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    
    ip_address TEXT,
    user_agent TEXT,
    
    status TEXT DEFAULT 'success',
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ================================================================
-- ACTIVITY LOGS TABLE
-- ================================================================

CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    activity_type TEXT NOT NULL,
    description TEXT NOT NULL,
    
    metadata JSONB DEFAULT '{}',
    
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_activity_type ON activity_logs(activity_type);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- ================================================================
-- AI AUDIT LOGS TABLE
-- ================================================================

CREATE TABLE ai_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    action_type TEXT NOT NULL,
    application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
    
    details JSONB DEFAULT '{}',
    
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ai_audit_logs_user_id ON ai_audit_logs(user_id);
CREATE INDEX idx_ai_audit_logs_application_id ON ai_audit_logs(application_id);
CREATE INDEX idx_ai_audit_logs_action_type ON ai_audit_logs(action_type);
CREATE INDEX idx_ai_audit_logs_timestamp ON ai_audit_logs(timestamp DESC);

-- ================================================================
-- SYSTEM SETTINGS TABLE
-- ================================================================

CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    category TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_system_settings_key ON system_settings(key);
CREATE INDEX idx_system_settings_category ON system_settings(category);

-- ================================================================
-- SERVICES TABLE
-- ================================================================

CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    category TEXT,
    
    fee_amount NUMERIC DEFAULT 0,
    fee_currency TEXT DEFAULT 'SSP',
    
    processing_days INTEGER DEFAULT 0,
    
    required_documents JSONB DEFAULT '[]',
    form_schema JSONB DEFAULT '{}',
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_services_code ON services(code);
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_services_is_active ON services(is_active);

-- ================================================================
-- DEPARTMENTS TABLE
-- ================================================================

CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    
    head_id UUID REFERENCES profiles(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_departments_code ON departments(code);

-- ================================================================
-- OFFICES TABLE
-- ================================================================

CREATE TABLE offices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    location TEXT,
    address TEXT,
    
    phone TEXT,
    email TEXT,
    
    operating_hours JSONB DEFAULT '{}',
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_offices_code ON offices(code);
CREATE INDEX idx_offices_department_id ON offices(department_id);
CREATE INDEX idx_offices_is_active ON offices(is_active);

-- ================================================================
-- COUNTRIES TABLE
-- ================================================================

CREATE TABLE countries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    iso3 TEXT,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_countries_code ON countries(code);
CREATE INDEX idx_countries_is_active ON countries(is_active);

-- ================================================================
-- PORTS TABLE
-- ================================================================

CREATE TABLE ports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    country_id UUID REFERENCES countries(id),
    
    port_type TEXT,
    location TEXT,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ports_code ON ports(code);
CREATE INDEX idx_ports_country_id ON ports(country_id);
CREATE INDEX idx_ports_is_active ON ports(is_active);

-- ================================================================
-- TARIFF CODES TABLE
-- ================================================================

CREATE TABLE tariff_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hs_code TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    
    duty_rate NUMERIC,
    tax_rate NUMERIC,
    
    category TEXT,
    chapter TEXT,
    
    effective_from DATE,
    effective_to DATE,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tariff_codes_hs_code ON tariff_codes(hs_code);
CREATE INDEX idx_tariff_codes_category ON tariff_codes(category);
CREATE INDEX idx_tariff_codes_is_active ON tariff_codes(is_active);

-- ================================================================
-- CURRENCIES TABLE
-- ================================================================

CREATE TABLE currencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    symbol TEXT,
    
    exchange_rate NUMERIC DEFAULT 1,
    base_currency TEXT DEFAULT 'SSP',
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_currencies_code ON currencies(code);
CREATE INDEX idx_currencies_is_active ON currencies(is_active);

-- ================================================================
-- INITIAL DATA
-- ================================================================

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
('trader', 'Trader - Import/Export goods', '["create_application", "view_own_applications", "make_payment"]'),
('agent', 'Clearing Agent - Process customs on behalf of traders', '["create_application", "view_assigned_applications", "submit_documents", "make_payment"]'),
('officer', 'Customs Officer - Review and process declarations', '["review_applications", "approve_reject", "assign_inspector"]'),
('inspector', 'Inspector - Physical inspection of goods', '["perform_inspections", "upload_reports", "update_status"]'),
('supervisor', 'Supervisor - Oversight and escalations', '["view_all_applications", "override_decisions", "manage_team"]'),
('administrator', 'Administrator - Full system access', '["*"]');

-- Insert default services
INSERT INTO services (name, code, description, category, fee_amount, processing_days, required_documents) VALUES
('Customs Agent License Application', 'LIC-AGENT', 'Apply for or renew customs agent license', 'license', 500.00, 5, '["ID Document", "Certificate", "Tax Clearance"]'),
('Customs Declaration Direct Assessment', 'ASSESS-DIRECT', 'Submit goods for direct customs assessment', 'declaration', 0, 3, '["Invoice", "Packing List", "Bill of Lading"]'),
('Customs Declaration CVET', 'CVET-DECL', 'Unified customs workflow for CVET declarations', 'declaration', 0, 5, '["Invoice", "Packing List", "Bill of Lading", "Certificate of Origin"]'),
('Vehicle Registration Query', 'QUERY-VEH', 'Check vehicle registration and customs status', 'query', 0, 1, '["Vehicle Registration Number"]');

-- Insert default countries
INSERT INTO countries (name, code, iso3) VALUES
('South Sudan', 'SS', 'SSD'),
('Uganda', 'UG', 'UGA'),
('Kenya', 'KE', 'KEN'),
('Ethiopia', 'ET', 'ETH'),
('Sudan', 'SD', 'SDN'),
('Egypt', 'EG', 'EGY');

-- Insert default currencies
INSERT INTO currencies (code, name, symbol, exchange_rate) VALUES
('SSP', 'South Sudanese Pound', '£', 1.00),
('USD', 'United States Dollar', '$', 0.0076),
('UGX', 'Ugandan Shilling', 'USh', 28.50),
('KES', 'Kenyan Shilling', 'KSh', 0.78);

-- Insert default system settings
INSERT INTO system_settings (key, value, description, category) VALUES
('application_number_prefix', 'CVET', 'Application number prefix', 'applications'),
('application_number_sequence', '1', 'Current application number sequence', 'applications'),
('system_maintenance', 'false', 'System maintenance mode', 'system'),
('max_file_size', '10485760', 'Maximum file upload size in bytes', 'storage'),
('allowed_file_types', '["pdf","docx","jpg","jpeg","png","zip"]', 'Allowed file types for upload', 'storage');

-- ================================================================
-- END OF SCHEMA
-- ================================================================
