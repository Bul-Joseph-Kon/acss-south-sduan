import fs from 'fs';
import path from 'path';

const migrationsDir = 'c:/Users/Administrator/acss-south-sudan/supabase/migrations';

async function run() {
  const files = fs.readdirSync(migrationsDir);
  let fixedCount = 0;
  
  files.forEach(file => {
    if (file.endsWith('.sql')) {
      const filePath = path.join(migrationsDir, file);
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Look for 'admin' in user_role context, e.g. IN ('admin', or = 'admin'
      // We can replace the specific role string
      const original = content;
      
      // Replace 'admin' with 'administrator' when it appears in lists of roles
      content = content.replace(/'admin'/g, "'administrator'");
      
      if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed 'admin' -> 'administrator' in: ${file}`);
        fixedCount++;
      }
    }
  });

  console.log(`Finished fixing admin role typos. Updated ${fixedCount} files.`);
}

run();
