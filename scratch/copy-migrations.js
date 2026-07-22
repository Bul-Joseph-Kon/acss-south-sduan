import fs from 'fs';
import path from 'path';

const srcDir = 'c:/Users/Administrator/acss-south-sudan/database/migrations';
const destDir = 'c:/Users/Administrator/acss-south-sudan/supabase/migrations';

async function run() {
  console.log('Reading files from database/migrations...');
  const files = fs.readdirSync(srcDir);
  let count = 0;
  
  files.forEach(file => {
    const match = file.match(/^0(2[0-9]|3[0-9]|4[0-2])_/);
    if (match) {
      const srcPath = path.join(srcDir, file);
      const destPath = path.join(destDir, file);
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${file}`);
      count++;
    }
  });

  console.log(`Successfully copied ${count} migration files!`);
}

run();
