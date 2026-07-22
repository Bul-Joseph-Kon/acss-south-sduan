-- ================================================================
-- 027: ADD UNITS TABLE
-- ================================================================
-- Creates units table for storing unit of measurement codes
-- Enables Realtime for live updates
-- ================================================================

-- Create units table
CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for units
CREATE UNIQUE INDEX IF NOT EXISTS idx_units_code ON units(code);
CREATE INDEX IF NOT EXISTS idx_units_description ON units(description);

-- Enable Realtime on units table (ignore if already added)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE units;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Table already in publication, ignore
END $$;

-- Insert common units of measurement (UN/ECE Recommendation 20)
INSERT INTO units (code, description, is_active) VALUES
-- Base units
('NAR', 'Number of articles', true),
('KGM', 'Kilogram, net', true),
('MTR', 'Metre', true),
('LTR', 'Litre', true),
('MTQ', 'Cubic metre', true),
('MTK', 'Square metre', true),
('MTE', 'Metre, textile', true),
('TNE', 'Tonne (metric ton)', true),

-- Counting units
('PCE', 'Piece', true),
('PCS', 'Pieces', true),
('SET', 'Set', true),
('PR', 'Pair', true),
('DOZ', 'Dozen', true),
('GRO', 'Gross', true),
('GRO', 'Gross (12 dozen)', true),
('THD', 'Thousand', true),
('MLN', 'Million', true),

-- Weight units
('GRM', 'Gram', true),
('MGM', 'Milligram', true),
('KGM', 'Kilogram', true),
('DTN', 'Decitonne', true),
('TNE', 'Tonne (metric ton)', true),
('LTN', 'Long ton (UK)', true),
('STN', 'Short ton (US)', true),
('LBS', 'Pound', true),
('OZ', 'Ounce', true),

-- Length units
('MMT', 'Millimetre', true),
('CMT', 'Centimetre', true),
('MTR', 'Metre', true),
('KMT', 'Kilometre', true),
('INH', 'Inch', true),
('FOT', 'Foot', true),
('YRD', 'Yard', true),
('SMI', 'Statute mile', true),
('NMI', 'Nautical mile', true),

-- Area units
('MMK', 'Square millimetre', true),
('CMK', 'Square centimetre', true),
('MTK', 'Square metre', true),
('KMK', 'Square kilometre', true),
('INK', 'Square inch', true),
('FTK', 'Square foot', true),
('YDK', 'Square yard', true),
('MIK', 'Square mile', true),
('ARE', 'Are', true),
('HAR', 'Hectare', true),

-- Volume units
('MMQ', 'Cubic millimetre', true),
('CMQ', 'Cubic centimetre', true),
('MTQ', 'Cubic metre', true),
('KMQ', 'Cubic kilometre', true),
('INQ', 'Cubic inch', true),
('FTQ', 'Cubic foot', true),
('YDQ', 'Cubic yard', true),
('MIQ', 'Cubic mile', true),
('LTR', 'Litre', true),
('MLT', 'Millilitre', true),
('CLT', 'Centilitre', true),
('DLT', 'Decilitre', true),
('HLT', 'Hectolitre', true),
('GLL', 'Gallon (US)', true),
('GLI', 'Gallon (UK)', true),
('PTI', 'Pint (UK)', true),
('PTL', 'Pint (US liquid)', true),
('QTI', 'Quart (UK)', true),
('QTL', 'Quart (US liquid)', true),

-- Packaging units
('BOX', 'Box', true),
('CTN', 'Carton', true),
('PKT', 'Packet', true),
('BAG', 'Bag', true),
('SAC', 'Sack', true),
('BAR', 'Barrel', true),
('DRM', 'Drum', true),
('CAN', 'Can', true),
('BOT', 'Bottle', true),
('JAR', 'Jar', true),
('TUB', 'Tub', true),
('RL', 'Roll', true),
('RE', 'Reel', true),
('SH', 'Sheet', true),
('PLT', 'Pallet', true),
('SKP', 'Skip', true),
('CRD', 'Card', true),
('BND', 'Bundle', true),
('BKL', 'Bale', true),
('RLL', 'Reel', true),

-- Textile units
('MTE', 'Metre, textile', true),
('DZN', 'Dozen', true),
('GRO', 'Gross', true),
('LEA', 'Lea', true),
('HUR', 'Hank', true),
('NCL', 'Number of coils', true),
('NPL', 'Number of piles', true),

-- Energy units
('KWH', 'Kilowatt hour', true),
('MWH', 'Megawatt hour', true),
('GWH', 'Gigawatt hour', true),
('JOU', 'Joule', true),
('KJO', 'Kilojoule', true),
('MJO', 'Megajoule', true),
('CAL', 'Calorie', true),
('KCA', 'Kilocalorie', true),
('BTU', 'British thermal unit', true),

-- Time units
('SEC', 'Second', true),
('MIN', 'Minute', true),
('HUR', 'Hour', true),
('DAY', 'Day', true),
('WEE', 'Week', true),
('MON', 'Month', true),
('YEA', 'Year', true),

-- Temperature units
('CEL', 'Degree Celsius', true),
('FAH', 'Degree Fahrenheit', true),
('KEL', 'Kelvin', true),

-- Pressure units
('PAL', 'Pascal', true),
('KPA', 'Kilopascal', true),
('MPA', 'Megapascal', true),
('BAR', 'Bar', true),
('MBR', 'Millibar', true),
('ATM', 'Atmosphere', true),
('TOR', 'Torr', true),

-- Speed units
('MTS', 'Metre per second', true),
('KMH', 'Kilometre per hour', true),
('KNT', 'Knot', true),
('FPS', 'Foot per second', true),
('MPH', 'Mile per hour', true),

-- Other common units
('KTM', 'Kilometre', true),
('MIL', 'Millilitre', true),
('KAR', 'Carat', true),
('DWT', 'Pennyweight', true),
('TOL', 'Tola', true),
('OZA', 'Troy ounce', true),
('GRT', 'Gross tonnage', true),
('NRT', 'Net tonnage', true),
('DWT', 'Deadweight tonnage', true),
('TEU', 'Twenty-foot equivalent unit', true),
('FEU', 'Forty-foot equivalent unit', true)
ON CONFLICT (code) DO NOTHING;
