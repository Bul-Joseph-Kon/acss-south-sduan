-- Migration: Add application_goods table
-- Description: Create dedicated table for storing goods items per customs declaration

-- Create application_goods table
CREATE TABLE IF NOT EXISTS application_goods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    
    -- Commodity Information
    hs_code VARCHAR(20) NOT NULL,
    commodity_description TEXT NOT NULL,
    brand_model VARCHAR(255),
    country_of_origin VARCHAR(3) NOT NULL, -- ISO country code
    preference_code VARCHAR(10),
    
    -- Quantity Information
    quantity DECIMAL(15, 4) NOT NULL,
    unit_of_measure VARCHAR(10) NOT NULL, -- PCS, KG, LTR, BOX, BAG, CTN
    number_of_packages INTEGER,
    package_type VARCHAR(50),
    
    -- Weight Information
    gross_weight DECIMAL(15, 4) NOT NULL,
    net_weight DECIMAL(15, 4) NOT NULL,
    
    -- Value Information
    unit_price DECIMAL(15, 4) NOT NULL,
    freight_cost DECIMAL(15, 4) DEFAULT 0,
    insurance_cost DECIMAL(15, 4) DEFAULT 0,
    other_charges DECIMAL(15, 4) DEFAULT 0,
    customs_value DECIMAL(15, 4) NOT NULL, -- Calculated: (quantity * unit_price) + freight + insurance + other_charges
    
    -- Tariff Information
    duty_rate DECIMAL(8, 4) DEFAULT 0,
    vat_rate DECIMAL(8, 4) DEFAULT 0,
    excise_rate DECIMAL(8, 4) DEFAULT 0,
    
    -- Additional Information
    previous_item_reference VARCHAR(50),
    additional_info TEXT,
    remarks TEXT,
    
    -- Metadata
    item_number INTEGER NOT NULL DEFAULT 1, -- Sequential item number within declaration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(application_id, item_number)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_application_goods_application_id ON application_goods(application_id);
CREATE INDEX IF NOT EXISTS idx_application_goods_hs_code ON application_goods(hs_code);
CREATE INDEX IF NOT EXISTS idx_application_goods_country_of_origin ON application_goods(country_of_origin);

-- Add RLS policies
ALTER TABLE application_goods ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read goods for applications they have access to
DROP POLICY IF EXISTS "Allow read access to application_goods" ON application_goods;
CREATE POLICY "Allow read access to application_goods" ON application_goods FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM applications 
        WHERE applications.id = application_goods.application_id
        AND (
            applications.agent_id = auth.uid()
            OR applications.officer_id = auth.uid()
            OR applications.inspector_id = auth.uid()
            OR applications.supervisor_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role IN ('administrator', 'revenue')
            )
        )
    )
);

-- Policy: Allow agents to insert goods for their own applications
DROP POLICY IF EXISTS "Allow agents to insert goods" ON application_goods;
CREATE POLICY "Allow agents to insert goods" ON application_goods FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM applications 
        WHERE applications.id = application_goods.application_id
        AND applications.agent_id = auth.uid()
        AND applications.status IN ('draft', 'submitted')
    )
);

-- Policy: Allow agents to update goods for their own draft applications
DROP POLICY IF EXISTS "Allow agents to update goods" ON application_goods;
CREATE POLICY "Allow agents to update goods" ON application_goods FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM applications 
        WHERE applications.id = application_goods.application_id
        AND applications.agent_id = auth.uid()
        AND applications.status = 'draft'
    )
);

-- Policy: Allow agents to delete goods for their own draft applications
DROP POLICY IF EXISTS "Allow agents to delete goods" ON application_goods;
CREATE POLICY "Allow agents to delete goods" ON application_goods FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM applications 
        WHERE applications.id = application_goods.application_id
        AND applications.agent_id = auth.uid()
        AND applications.status = 'draft'
    )
);

-- Function to auto-calculate customs value
CREATE OR REPLACE FUNCTION calculate_customs_value()
RETURNS TRIGGER AS $$
BEGIN
    NEW.customs_value = (NEW.quantity * NEW.unit_price) + 
                        COALESCE(NEW.freight_cost, 0) + 
                        COALESCE(NEW.insurance_cost, 0) + 
                        COALESCE(NEW.other_charges, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate customs value on insert/update
CREATE TRIGGER trg_calculate_customs_value
BEFORE INSERT OR UPDATE ON application_goods
FOR EACH ROW
EXECUTE FUNCTION calculate_customs_value();

-- Function to auto-assign item number
CREATE OR REPLACE FUNCTION auto_assign_item_number()
RETURNS TRIGGER AS $$
DECLARE
    max_item_num INTEGER;
BEGIN
    IF NEW.item_number = 1 THEN
        SELECT COALESCE(MAX(item_number), 0) + 1
        INTO max_item_num
        FROM application_goods
        WHERE application_id = NEW.application_id;
        
        NEW.item_number = max_item_num;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-assign item number on insert
CREATE TRIGGER trg_auto_assign_item_number
BEFORE INSERT ON application_goods
FOR EACH ROW
EXECUTE FUNCTION auto_assign_item_number();

-- Function to update item numbers after deletion
CREATE OR REPLACE FUNCTION renumber_goods_items()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE application_goods
    SET item_number = item_number - 1
    WHERE application_id = OLD.application_id
    AND item_number > OLD.item_number;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to renumber items after deletion
CREATE TRIGGER trg_renumber_goods_items
AFTER DELETE ON application_goods
FOR EACH ROW
EXECUTE FUNCTION renumber_goods_items();
