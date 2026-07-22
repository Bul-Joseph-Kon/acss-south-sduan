-- ================================================================
-- 022: ADD EXPORTERS TABLE AND MODIFY APPLICATIONS FOR FOREIGN KEYS
-- ================================================================
-- Creates exporters table for managing exporter information
-- Modifies applications table to use foreign keys instead of nested data
-- ================================================================

-- Create exporters table
CREATE TABLE IF NOT EXISTS exporters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exporter_name TEXT NOT NULL,
    company TEXT,
    country TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for exporters
CREATE INDEX IF NOT EXISTS idx_exporters_name ON exporters(exporter_name);
CREATE INDEX IF NOT EXISTS idx_exporters_company ON exporters(company);
CREATE INDEX IF NOT EXISTS idx_exporters_country ON exporters(country);

-- Enable Realtime on exporters table (ignore if already added)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE exporters;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Table already in publication, ignore
END $$;

-- Add foreign key columns to applications table
ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS importer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS exporter_id UUID REFERENCES exporters(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_applications_importer_id ON applications(importer_id);
CREATE INDEX IF NOT EXISTS idx_applications_exporter_id ON applications(exporter_id);
CREATE INDEX IF NOT EXISTS idx_applications_agent_id ON applications(agent_id);

-- Insert sample exporters (migrating from importers_exporters if exists)
INSERT INTO exporters (exporter_name, company, country, address, phone, email) VALUES
('Uganda Manufacturers Association', 'UMA', 'Uganda', 'Kampala, Industrial Area', '+256701234567', 'exports@uma.ug'),
('Kenya Export Processing Zone', 'KEPZA', 'Kenya', 'Nairobi, EPZ', '+254711234567', 'info@kepz.go.ke'),
('Ethiopian Trading Corporation', 'ETC', 'Ethiopia', 'Addis Ababa', '+251911234567', 'trade@etc.gov.et'),
('Sudan Exporters Union', 'SEU', 'Sudan', 'Khartoum', '+249911234567', 'union@seu.sd'),
('China Trading Group Ltd', 'CTG', 'China', 'Shanghai', '+862112345678', 'exports@ctg.cn'),
('Dubai International Trade', 'DIT', 'UAE', 'Dubai', '+971501234567', 'trade@dit.ae'),
('German Export Company', 'GEC', 'Germany', 'Hamburg', '+494012345678', 'exports@gec.de'),
('USA Global Exports Inc', 'USGE', 'United States', 'New York', '+12121234567', 'trade@usge.com')
ON CONFLICT DO NOTHING;

-- ================================================================
-- END OF MIGRATION 022
-- ================================================================
