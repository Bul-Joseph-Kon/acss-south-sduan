-- ================================================================
-- 023: ADD CURRENCIES TABLE
-- ================================================================
-- Creates currencies table for managing currency codes and names
-- Enables Realtime for live updates
-- ================================================================

-- Create currencies table
CREATE TABLE IF NOT EXISTS currencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    symbol TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for currencies
CREATE UNIQUE INDEX IF NOT EXISTS idx_currencies_code ON currencies(code);
CREATE INDEX IF NOT EXISTS idx_currencies_name ON currencies(name);

-- Enable Realtime on currencies table (ignore if already added)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE currencies;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Table already in publication, ignore
END $$;

-- Insert common currencies
INSERT INTO currencies (code, name, symbol, is_active) VALUES
    ('SSP', 'South Sudanese Pound', '£', true),
    ('USD', 'United States Dollar', '$', true),
    ('EUR', 'Euro', '€', true),
    ('GBP', 'British Pound', '£', true),
    ('KES', 'Kenyan Shilling', 'KSh', true),
    ('UGX', 'Ugandan Shilling', 'UGX', true),
    ('ETB', 'Ethiopian Birr', 'Br', true),
    ('SDG', 'Sudanese Pound', 'ج.س.', true),
    ('EGP', 'Egyptian Pound', 'E£', true),
    ('CNY', 'Chinese Yuan', '¥', true),
    ('INR', 'Indian Rupee', '₹', true),
    ('AED', 'United Arab Emirates Dirham', 'د.إ', true),
    ('SAR', 'Saudi Riyal', '﷼', true),
    ('ZAR', 'South African Rand', 'R', true),
    ('CDF', 'Congolese Franc', 'FC', true),
    ('BIF', 'Burundian Franc', 'FBu', true),
    ('RWF', 'Rwandan Franc', 'RF', true),
    ('TZS', 'Tanzanian Shilling', 'TSh', true)
ON CONFLICT (code) DO NOTHING;
