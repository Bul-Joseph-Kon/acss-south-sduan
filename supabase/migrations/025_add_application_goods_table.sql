-- ================================================================
-- 025: ADD APPLICATION_GOODS TABLE
-- ================================================================
-- Creates application_goods table for storing individual goods items
-- Each customs declaration can have multiple goods items
-- Enables Realtime for live updates
-- ================================================================

-- Create application_goods table
CREATE TABLE IF NOT EXISTS application_goods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    item_number INTEGER NOT NULL,
    hs_code TEXT NOT NULL,
    commodity_description TEXT NOT NULL,
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL,
    unit_price NUMERIC NOT NULL CHECK (unit_price > 0),
    currency TEXT NOT NULL,
    customs_value NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
    country_of_origin TEXT NOT NULL,
    gross_weight NUMERIC CHECK (gross_weight > 0),
    net_weight NUMERIC CHECK (net_weight > 0 AND net_weight <= gross_weight),
    preference_code TEXT,
    brand TEXT,
    model TEXT,
    manufacturer TEXT,
    serial_number TEXT,
    package_marks TEXT,
    remarks TEXT,
    ai_validation_results JSONB,
    duty_rate NUMERIC,
    vat_rate NUMERIC,
    excise_rate NUMERIC,
    estimated_import_duty NUMERIC,
    estimated_vat NUMERIC,
    estimated_excise NUMERIC,
    estimated_total_taxes NUMERIC GENERATED ALWAYS AS (COALESCE(estimated_import_duty, 0) + COALESCE(estimated_vat, 0) + COALESCE(estimated_excise, 0)) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for application_goods
CREATE INDEX IF NOT EXISTS idx_application_goods_application_id ON application_goods(application_id);
CREATE INDEX IF NOT EXISTS idx_application_goods_hs_code ON application_goods(hs_code);
CREATE INDEX IF NOT EXISTS idx_application_goods_country_of_origin ON application_goods(country_of_origin);
CREATE UNIQUE INDEX IF NOT EXISTS idx_application_goods_item_number ON application_goods(application_id, item_number);

-- Enable Realtime on application_goods table (ignore if already added)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE application_goods;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Table already in publication, ignore
END $$;

-- Add RLS policies
ALTER TABLE application_goods ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view goods for applications they have access to
DROP POLICY IF EXISTS "Users can view application_goods" ON application_goods;
CREATE POLICY "Users can view application_goods" ON application_goods FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM applications
        WHERE applications.id = application_goods.application_id
        AND (
            applications.user_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role IN ('agent', 'officer', 'inspector', 'supervisor', 'revenue')
            )
        )
    )
);

-- Policy: Agents can insert goods for their own applications
DROP POLICY IF EXISTS "Agents can insert application_goods" ON application_goods;
CREATE POLICY "Agents can insert application_goods" ON application_goods FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM applications
        WHERE applications.id = application_goods.application_id
        AND applications.user_id = auth.uid()
    )
);

-- Policy: Agents can update goods for their own applications
DROP POLICY IF EXISTS "Agents can update application_goods" ON application_goods;
CREATE POLICY "Agents can update application_goods" ON application_goods FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM applications
        WHERE applications.id = application_goods.application_id
        AND applications.user_id = auth.uid()
    )
);

-- Policy: Agents can delete goods for their own applications
DROP POLICY IF EXISTS "Agents can delete application_goods" ON application_goods;
CREATE POLICY "Agents can delete application_goods" ON application_goods FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM applications
        WHERE applications.id = application_goods.application_id
        AND applications.user_id = auth.uid()
    )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_application_goods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_application_goods_updated_at
BEFORE UPDATE ON application_goods
FOR EACH ROW
EXECUTE FUNCTION update_application_goods_updated_at();
