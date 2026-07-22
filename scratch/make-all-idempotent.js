import fs from 'fs';
import path from 'path';

const srcDir = 'c:/Users/Administrator/acss-south-sudan/database/migrations';
const destDir = 'c:/Users/Administrator/acss-south-sudan/supabase/migrations';

async function run() {
  console.log('1. Re-copying clean migration files...');
  const files = fs.readdirSync(srcDir);
  let copyCount = 0;
  
  files.forEach(file => {
    const match = file.match(/^0(2[0-9]|3[0-9]|4[0-2])_/);
    if (match) {
      const srcPath = path.join(srcDir, file);
      const destPath = path.join(destDir, file);
      fs.copyFileSync(srcPath, destPath);
      copyCount++;
    }
  });
  console.log(`Copied ${copyCount} clean migration files.`);

  // Rename the duplicate 030 file in destDir
  const oldPath = path.join(destDir, '030_add_application_goods_table.sql');
  const newPath = path.join(destDir, '031_add_application_goods_table.sql');
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log('Renamed duplicate 030 to 031.');
  }

  console.log('2. Applying correct idempotency regex replacing CREATE POLICY...');
  const destFiles = fs.readdirSync(destDir);
  let updatedCount = 0;

  destFiles.forEach(file => {
    if (file.endsWith('.sql')) {
      const filePath = path.join(destDir, file);
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Correct regex to support dots, e.g. public.applications
      const policyRegex = /CREATE POLICY\s+"([^"]+)"\s+ON\s+([a-zA-Z0-9_.]+)/g;
      const original = content;
      
      content = content.replace(policyRegex, (match, name, table) => {
        return `DROP POLICY IF EXISTS "${name}" ON ${table};\nCREATE POLICY "${name}" ON ${table}`;
      });
      
      if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated policies in: ${file}`);
        updatedCount++;
      }
    }
  });
  console.log(`Updated ${updatedCount} files with correct policy drops.`);

  // Apply custom adjustments
  // 1. Comment out 028 transitional updates/indexes/verification
  const file028 = path.join(destDir, '028_add_missing_workflow_statuses.sql');
  if (fs.existsSync(file028)) {
    let content028 = fs.readFileSync(file028, 'utf8');
    content028 = content028.replace(/UPDATE applications[\s\S]*?processing';/g, '/* commented out */');
    content028 = content028.replace(/UPDATE applications[\s\S]*?officer_id IS NOT NULL;/g, '/* commented out */');
    content028 = content028.replace(/CREATE INDEX IF NOT EXISTS idx_applications_ai_validation[\s\S]*?clearance_approved';/g, '/* commented out */');
    content028 = content028.replace(/SELECT unnest\(enum_range\(NULL::application_status\)\) AS status_values;/g, '/* commented out */');
    fs.writeFileSync(file028, content028, 'utf8');
    console.log('Applied custom comment outs to 028.');
  }

  // 2. Fix 'admin' in 030 and 031 RLS policies
  const file030 = path.join(destDir, '030_acss_workflow.sql');
  if (fs.existsSync(file030)) {
    let content030 = fs.readFileSync(file030, 'utf8');
    content030 = content030.replace(/'admin'/g, "'administrator'");
    
    // Also add the foreign key split we did before
    content030 = content030.replace(
      /-- Add new columns for workflow tracking[\s\S]*?completed_at TIMESTAMP WITH TIME ZONE;/g,
      `-- Add new columns for workflow tracking (non-referencing columns first)
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS inspection_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS escalated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS escalated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cleared_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;`
    );
    
    // Append the foreign key alter at the end before permissions
    content030 = content030.replace(
      /GRANT INSERT, UPDATE ON payments TO authenticated;/g,
      `GRANT INSERT, UPDATE ON payments TO authenticated;

-- ================================================================
-- ADD FOREIGN KEY COLUMNS TO APPLICATIONS (AFTER REFERENCED TABLES EXIST)
-- ================================================================
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS ai_validation_id UUID REFERENCES ai_validation_results(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS inspection_report_id UUID REFERENCES inspection_reports(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS inspector_id UUID REFERENCES profiles(id) ON DELETE SET NULL;`
    );

    // Also add the dynamic check for payments.invoice_id
    content030 = content030.replace(
      /CREATE TABLE IF NOT EXISTS payments \(/g,
      `-- Ensure invoice_id exists in payments table in case it was created manually
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
        IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'payments'::regclass AND attname = 'invoice_id') THEN
            ALTER TABLE payments ADD COLUMN invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS payments (`
    );

    fs.writeFileSync(file030, content030, 'utf8');
    console.log('Applied custom modifications to 030.');
  }

  const file031 = path.join(destDir, '031_add_application_goods_table.sql');
  if (fs.existsSync(file031)) {
    let content031 = fs.readFileSync(file031, 'utf8');
    content031 = content031.replace(/'admin'/g, "'administrator'");
    content031 = content031.replace(/'revenue_officer'/g, "'revenue'");
    fs.writeFileSync(file031, content031, 'utf8');
    console.log('Applied custom modifications to 031.');
  }
}

run();
