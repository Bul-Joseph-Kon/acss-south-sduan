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
      
      const original = content;
      
      // Replace 'revenue_officer' with 'revenue'
      content = content.replace(/'revenue_officer'/g, "'revenue'");
      
      if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed 'revenue_officer' -> 'revenue' in: ${file}`);
        fixedCount++;
      }
    }
  });

  console.log(`Finished fixing revenue role typos. Updated ${fixedCount} files.`);
}

run();
