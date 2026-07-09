import fs from 'fs';
import path from 'path';

const EXCLUDED_DIRS = ['node_modules', '.git', '.vscode', 'dist', 'scratch'];
const brokenLinks = [];

// Helper to get all HTML files recursively from a root directory
function getHtmlFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (EXCLUDED_DIRS.includes(file)) return;
            results = results.concat(getHtmlFiles(fullPath));
        } else if (file.endsWith('.html')) {
            results.push(fullPath);
        }
    });
    return results;
}

// Get all html files on disk starting from project root
const allHtmlFiles = getHtmlFiles(process.cwd()).map(f => path.relative(process.cwd(), f).replace(/\\/g, '/'));

console.log(`Total HTML files found in project: ${allHtmlFiles.length}`);
console.log('Sample files:', allHtmlFiles.slice(0, 10));

// Scan each file for links (href="..." or window.location.href = "...")
allHtmlFiles.forEach(file => {
    // Skip if it's in an excluded directory at the root level (just in case)
    const firstPart = file.split('/')[0];
    if (EXCLUDED_DIRS.includes(firstPart)) return;
    
    const content = fs.readFileSync(file, 'utf8');
    const dirOfFile = path.dirname(file).replace(/\\/g, '/');
    
    // Find all href values
    const hrefMatches = content.matchAll(/href=["']([^"']+\.html)["']/g);
    for (const match of hrefMatches) {
        const target = match[1];
        
        // Resolve target relative to file directory
        let resolved;
        if (target.startsWith('/')) {
            resolved = target.substring(1);
        } else {
            resolved = path.posix.normalize(path.posix.join(dirOfFile, target));
        }
        
        // Check if resolved path exists in our list
        const exists = allHtmlFiles.includes(resolved);
        if (!exists) {
            brokenLinks.push({
                sourceFile: file,
                targetLink: target,
                resolvedPath: resolved,
                type: 'href'
            });
        }
    }
    
    // Find all window.location.href or location.href redirects
    const jsRedirectMatches = content.matchAll(/(?:window\.)?location\.href\s*=\s*["']([^"']+\.html)["']/g);
    for (const match of jsRedirectMatches) {
        const target = match[1];
        let resolved = path.posix.normalize(path.posix.join(dirOfFile, target));
        
        const exists = allHtmlFiles.includes(resolved);
        if (!exists) {
            brokenLinks.push({
                sourceFile: file,
                targetLink: target,
                resolvedPath: resolved,
                type: 'javascript_redirect'
            });
        }
    }
});

console.log(`Broken links found: ${brokenLinks.length}`);
fs.writeFileSync('scratch/broken_links.json', JSON.stringify(brokenLinks, null, 2), 'utf8');

// Group by source file
const group = {};
brokenLinks.forEach(b => {
    if (!group[b.sourceFile]) group[b.sourceFile] = [];
    group[b.sourceFile].push(b);
});

console.log('\n=== Broken Links Grouped ===');
Object.keys(group).forEach(f => {
    console.log(`\nFile: ${f} (${group[f].length} broken links)`);
    group[f].forEach(b => {
        console.log(`  -> Link "${b.targetLink}" resolves to non-existent "${b.resolvedPath}"`);
    });
});
