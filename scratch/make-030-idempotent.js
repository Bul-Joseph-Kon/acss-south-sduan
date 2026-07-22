import fs from 'fs';
import path from 'path';

const migrationsDir = 'c:/Users/Administrator/acss-south-sudan/supabase/migrations';

async function run() {
  const files = fs.readdirSync(migrationsDir);
  let count = 0;
  
  files.forEach(file => {
    if (file.endsWith('.sql')) {
      const filePath = path.join(migrationsDir, file);
      let content = fs.readFileSync(filePath, 'utf8');
      
      const policyRegex = /CREATE POLICY\s+"([^"]+)"\s+ON\s+([a-zA-Z0-9_]+)/g;
      const original = content;
      
      content = content.replace(policyRegex, (match, name, table) => {
        return `DROP POLICY IF EXISTS "${name}" ON ${table};\nCREATE POLICY "${name}" ON ${table}`;
      });
      
      if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Made policies idempotent in: ${file}`);
        count++;
      }
    }
  });

  console.log(`Finished making all policies idempotent. Updated ${count} files.`);
}

run();
