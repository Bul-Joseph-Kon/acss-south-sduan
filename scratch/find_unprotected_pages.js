import fs from 'fs';
import path from 'path';

// Get all html files in pages
function getHtmlFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (['node_modules', '.git', '.vscode', 'dist', 'scratch'].includes(file)) return;
            results = results.concat(getHtmlFiles(fullPath));
        } else if (file.endsWith('.html')) {
            results.push(fullPath);
        }
    });
    return results;
}

const allFiles = getHtmlFiles('pages').map(f => path.relative(process.cwd(), f).replace(/\\/g, '/'));

console.log(`Total HTML files to inspect: ${allFiles.length}`);

const report = [];

allFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    // Check if the page has auth script checks
    const hasAuthImport = content.includes('auth.js') || content.includes('auth-check.js') || content.includes('auth-guard.js');
    const hasCheckAuth = content.includes('checkAuth') || content.includes('checkPageAuth') || content.includes('requireAuth');
    const hasSupabaseClient = content.includes('supabase.js') || content.includes('createClient');
    
    const isMockLogout = content.includes("onclick=\"alert('👋 Signed out')\"") || content.includes("alert('👋 Signed out')");
    
    // Check if it defines layout tags but doesn't pull data from supabase
    const hasMockContent = content.includes('Lorem ipsum') || content.includes('John Trader') || content.includes('LIC-2026-0008');
    
    const isProtected = hasAuthImport && hasCheckAuth;
    
    report.push({
        file,
        isProtected,
        hasAuthImport,
        hasCheckAuth,
        hasSupabaseClient,
        isMockLogout,
        hasMockContent
    });
});

console.log('\n=== UNPROTECTED / MOCK FRONTEND PAGES ===');
const unprotected = report.filter(r => !r.isProtected);
console.log(`Found ${unprotected.length} unprotected/static mock files out of ${allFiles.length} HTML files.`);

// Save report to JSON for analysis
fs.writeFileSync('scratch/unprotected_pages_report.json', JSON.stringify(report, null, 2), 'utf8');

// Print first 40 unprotected files as a preview
unprotected.slice(0, 40).forEach(u => {
    console.log(`- [${u.file}] - Auth Import: ${u.hasAuthImport ? 'YES' : 'NO'}, Auth Check: ${u.hasCheckAuth ? 'YES' : 'NO'}, Mock SignOut: ${u.isMockLogout ? 'YES' : 'NO'}`);
});
