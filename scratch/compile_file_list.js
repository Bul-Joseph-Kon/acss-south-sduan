import fs from 'fs';
import path from 'path';

function getFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (['node_modules', '.git', '.vscode', 'dist', 'scratch'].includes(file)) return;
            results = results.concat(getFiles(fullPath));
        } else {
            results.push(fullPath);
        }
    });
    return results;
}

const allFiles = getFiles(process.cwd()).map(f => path.relative(process.cwd(), f).replace(/\\/g, '/'));

const htmlFiles = allFiles.filter(f => f.endsWith('.html'));
const jsFiles = allFiles.filter(f => f.startsWith('js/') && f.endsWith('.js'));
const sqlFiles = allFiles.filter(f => f.endsWith('.sql'));

console.log('=== Scanned Files Summary ===');
console.log(`HTML Files: ${htmlFiles.length}`);
console.log(`JS Files: ${jsFiles.length}`);
console.log(`SQL Files: ${sqlFiles.length}`);

// Write lists to a temporary file for the final report
fs.writeFileSync('scratch/files_list.json', JSON.stringify({ htmlFiles, jsFiles, sqlFiles }, null, 2), 'utf8');
