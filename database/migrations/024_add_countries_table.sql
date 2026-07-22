-- ================================================================
-- 024: ADD COUNTRIES TABLE
-- ================================================================
-- Creates countries table for managing country codes and names
-- Enables Realtime for live updates
-- ================================================================

-- Create countries table
CREATE TABLE IF NOT EXISTS countries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for countries
CREATE UNIQUE INDEX IF NOT EXISTS idx_countries_code ON countries(code);
CREATE INDEX IF NOT EXISTS idx_countries_name ON countries(name);

-- Enable Realtime on countries table (ignore if already added)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE countries;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Table already in publication, ignore
END $$;

-- Insert common countries (especially East African region)
INSERT INTO countries (code, name, is_active) VALUES
    ('SS', 'South Sudan', true),
    ('UG', 'Uganda', true),
    ('KE', 'Kenya', true),
    ('ET', 'Ethiopia', true),
    ('SD', 'Sudan', true),
    ('EG', 'Egypt', true),
    ('CN', 'China', true),
    ('IN', 'India', true),
    ('AE', 'United Arab Emirates', true),
    ('SA', 'Saudi Arabia', true),
    ('DE', 'Germany', true),
    ('GB', 'United Kingdom', true),
    ('US', 'United States', true),
    ('ZA', 'South Africa', true),
    ('CD', 'Democratic Republic of the Congo', true),
    ('BI', 'Burundi', true),
    ('RW', 'Rwanda', true),
    ('TZ', 'Tanzania', true),
    ('NG', 'Nigeria', true),
    ('JP', 'Japan', true),
    ('FR', 'France', true),
    ('IT', 'Italy', true),
    ('NL', 'Netherlands', true),
    ('BE', 'Belgium', true),
    ('CH', 'Switzerland', true),
    ('CA', 'Canada', true),
    ('AU', 'Australia', true),
    ('BR', 'Brazil', true),
    ('AR', 'Argentina', true),
    ('MX', 'Mexico', true),
    ('KR', 'South Korea', true),
    ('SG', 'Singapore', true),
    ('MY', 'Malaysia', true),
    ('TH', 'Thailand', true),
    ('VN', 'Vietnam', true),
    ('ID', 'Indonesia', true),
    ('PK', 'Pakistan', true),
    ('BD', 'Bangladesh', true),
    ('TR', 'Turkey', true),
    ('IR', 'Iran', true),
    ('IQ', 'Iraq', true),
    ('JO', 'Jordan', true),
    ('LB', 'Lebanon', true),
    ('SY', 'Syria', true),
    ('YE', 'Yemen', true),
    ('OM', 'Oman', true),
    ('QA', 'Qatar', true),
    ('KW', 'Kuwait', true),
    ('BH', 'Bahrain', true),
    ('MA', 'Morocco', true),
    ('TN', 'Tunisia', true),
    ('DZ', 'Algeria', true),
    ('LY', 'Libya', true),
    ('SO', 'Somalia', true),
    ('DJ', 'Djibouti', true),
    ('ER', 'Eritrea', true),
    ('SS', 'South Sudan', true),
    ('CF', 'Central African Republic', true),
    ('CM', 'Cameroon', true),
    ('GA', 'Gabon', true),
    ('CG', 'Republic of the Congo', true),
    ('AO', 'Angola', true),
    ('ZM', 'Zambia', true),
    ('ZW', 'Zimbabwe', true),
    ('MW', 'Malawi', true),
    ('MZ', 'Mozambique', true),
    ('NA', 'Namibia', true),
    ('BW', 'Botswana', true),
    ('LS', 'Lesotho', true),
    ('SZ', 'Eswatini', true),
    ('MG', 'Madagascar', true),
    ('MU', 'Mauritius', true),
    ('SC', 'Seychelles', true),
    ('KM', 'Comoros', true),
    ('CV', 'Cape Verde', true),
    ('ST', 'Sao Tome and Principe', true),
    ('GQ', 'Equatorial Guinea', true),
    ('TD', 'Chad', true),
    ('NE', 'Niger', true),
    ('ML', 'Mali', true),
    ('BF', 'Burkina Faso', true),
    ('SN', 'Senegal', true),
    ('GM', 'Gambia', true),
    ('GW', 'Guinea-Bissau', true),
    ('GN', 'Guinea', true),
    ('SL', 'Sierra Leone', true),
    ('LR', 'Liberia', true),
    ('CI', 'Ivory Coast', true),
    ('GH', 'Ghana', true),
    ('TG', 'Togo', true),
    ('BJ', 'Benin', true),
    ('NG', 'Nigeria', true),
    ('CM', 'Cameroon', true)
ON CONFLICT (code) DO NOTHING;
