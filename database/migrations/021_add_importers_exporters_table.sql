-- ================================================================
-- 021: ADD IMPORTERS/EXPORTERS TABLE
-- ================================================================
-- Creates a table to store registered importers and exporters
-- for use in customs declarations
-- ================================================================

CREATE TABLE IF NOT EXISTS importers_exporters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('importer', 'exporter', 'both')),
    tin TEXT,
    registration_number TEXT,
    country TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_importers_exporters_type ON importers_exporters(type);
CREATE INDEX IF NOT EXISTS idx_importers_exporters_status ON importers_exporters(status);
CREATE INDEX IF NOT EXISTS idx_importers_exporters_name ON importers_exporters(name);

-- Insert sample importers
INSERT INTO importers_exporters (name, type, tin, registration_number, country, address, phone, email) VALUES
('South Sudan Trading Co Ltd', 'importer', 'SSP-12345', 'REG-001', 'South Sudan', 'Juba, Hai Malakia', '+211912345678', 'info@sstrading.co.ss'),
('Juba Import Export Ltd', 'importer', 'SSP-67890', 'REG-002', 'South Sudan', 'Juba, Munuki', '+211912345679', 'contact@jie.co.ss'),
('Nile Valley Enterprises', 'importer', 'SSP-54321', 'REG-003', 'South Sudan', 'Malakal', '+211912345680', 'nile@nve.co.ss'),
('East Africa General Trading', 'importer', 'SSP-98765', 'REG-004', 'South Sudan', 'Wau', '+211912345681', 'east@eagt.co.ss')
ON CONFLICT DO NOTHING;

-- Insert sample exporters
INSERT INTO importers_exporters (name, type, tin, registration_number, country, address, phone, email) VALUES
('Uganda Manufacturers Association', 'exporter', 'UG-10001', 'UGA-001', 'Uganda', 'Kampala, Industrial Area', '+256701234567', 'exports@uma.ug'),
('Kenya Export Processing Zone', 'exporter', 'KE-20002', 'KEN-001', 'Kenya', 'Nairobi, EPZ', '+254711234567', 'info@kepz.go.ke'),
('Ethiopian Trading Corporation', 'exporter', 'ET-30003', 'ETH-001', 'Ethiopia', 'Addis Ababa', '+251911234567', 'trade@etc.gov.et'),
('Sudan Exporters Union', 'exporter', 'SD-40004', 'SUD-001', 'Sudan', 'Khartoum', '+249911234567', 'union@seu.sd'),
('China Trading Group Ltd', 'exporter', 'CN-50005', 'CHN-001', 'China', 'Shanghai', '+862112345678', 'exports@ctg.cn'),
('Dubai International Trade', 'exporter', 'AE-60006', 'UAE-001', 'UAE', 'Dubai', '+971501234567', 'trade@dit.ae'),
('German Export Company', 'exporter', 'DE-70007', 'DEU-001', 'Germany', 'Hamburg', '+494012345678', 'exports@gec.de'),
('USA Global Exports Inc', 'exporter', 'US-80008', 'USA-001', 'United States', 'New York', '+12121234567', 'trade@usge.com')
ON CONFLICT DO NOTHING;

-- ================================================================
-- END OF MIGRATION 021
-- ================================================================
