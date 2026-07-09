-- ================================================================
-- MIGRATION 007: Add Inspection-Specific Fields to Applications Table
-- ================================================================
-- This migration adds fields required for the inspection workflow
-- These fields store inspection reports, completion timestamps, and inspection types
-- ================================================================

-- Add inspection_report JSONB column to store inspection findings, notes, and results
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS inspection_report JSONB DEFAULT '{}';

-- Add inspection_completed_at timestamp to track when inspection was completed
-- Note: inspected_at already exists for when inspection started
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS inspection_completed_at TIMESTAMP WITH TIME ZONE;

-- Add declared_value to store the total declared value of goods
-- This is extracted from declaration_data or goods_data for easier querying
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS declared_value NUMERIC;

-- Add inspection_type to distinguish between cargo, vehicle, and warehouse inspections
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS inspection_type TEXT 
CHECK (inspection_type IN ('cargo', 'vehicle', 'warehouse', 'general'));

-- Add index on inspection_type for filtering
CREATE INDEX IF NOT EXISTS idx_applications_inspection_type ON applications(inspection_type);

-- Add index on declared_value for sorting and filtering
CREATE INDEX IF NOT EXISTS idx_applications_declared_value ON applications(declared_value);

-- Add index on inspection_completed_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_applications_inspection_completed_at ON applications(inspection_completed_at DESC);

-- ================================================================
-- END OF MIGRATION
-- ================================================================
