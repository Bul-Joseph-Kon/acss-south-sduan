import fs from 'fs';
import path from 'path';

const broken = JSON.parse(fs.readFileSync('scratch/broken_links.json', 'utf8'));

// Get all html files on disk
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

const allHtmlOnDisk = getHtmlFiles(process.cwd()).map(f => path.relative(process.cwd(), f).replace(/\\/g, '/'));

console.log('=== Checking Target File Existence ===');
const verifiedBroken = [];

broken.forEach(b => {
    // Check if the resolved file actually exists
    const fileExists = fs.existsSync(path.join(process.cwd(), b.resolvedPath));
    
    // Find files with the same basename on disk
    const base = path.basename(b.resolvedPath);
    const matches = allHtmlOnDisk.filter(f => path.basename(f) === base);
    
    verifiedBroken.push({
        sourceFile: b.sourceFile,
        targetLink: b.targetLink,
        resolvedPath: b.resolvedPath,
        resolvedExistsOnDisk: fileExists,
        alternativeMatches: matches
    });
});

console.log(`Verified ${verifiedBroken.length} links.`);
fs.writeFileSync('scratch/verified_broken_links.json', JSON.stringify(verifiedBroken, null, 2), 'utf8');

// Print first 20 verified broken links
console.log('\n=== Sample Verified Broken Links (with alternative matches on disk) ===');
verifiedBroken.slice(0, 25).forEach(v => {
    console.log(`[${v.sourceFile}] Link: "${v.targetLink}" -> Resolves to non-existent: "${v.resolvedPath}"`);
    if (v.alternativeMatches.length > 0) {
        console.log(`  -> Found correct file at: ${v.alternativeMatches.join(', ')}`);
    } else {
        console.log(`  -> File does not exist anywhere in the project!`);
    }
});
