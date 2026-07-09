import fs from 'fs';
import path from 'path';

const dirs = ['pages/agent', 'pages/trader'];

// Helper to get HTML files recursively
function getHtmlFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            results = results.concat(getHtmlFiles(fullPath));
        } else if (file.endsWith('.html')) {
            results.push(fullPath);
        }
    });
    return results;
}

let filesFixed = 0;

dirs.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    const files = getHtmlFiles(dir);
    
    files.forEach(filePath => {
        let content = fs.readFileSync(filePath, 'utf8');
        let lines = content.split('\n');
        let modified = false;
        
        // 1. Remove top-level import statement outside script tags (usually line 2)
        const originalLength = lines.length;
        lines = lines.filter((line, idx) => {
            // If the line imports loadCurrentUserProfile and is not inside a script tag
            if (line.includes("import { loadCurrentUserProfile } from '../../js/profile-loader.js';") && idx < 10) {
                modified = true;
                console.log(`[Removing top-level import] ${filePath} at line ${idx + 1}`);
                return false;
            }
            return true;
        });
        
        let newContent = lines.join('\n');
        
        // 2. Check script tags for missing imports
        // Find all script tags
        const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
        newContent = newContent.replace(scriptRegex, (match, scriptCode) => {
            // If the script calls loadCurrentUserProfile but doesn't import it
            if (scriptCode.includes('loadCurrentUserProfile(') && !scriptCode.includes('import { loadCurrentUserProfile')) {
                modified = true;
                console.log(`[Injecting import into script block] ${filePath}`);
                
                // Determine the correct relative path to profile-loader.js
                const depth = filePath.split(path.sep).length - 1;
                const relPath = depth === 2 ? '../../js/profile-loader.js' : '../../../js/profile-loader.js';
                
                // Prepend import statement inside the script block
                const injectedImport = `import { loadCurrentUserProfile } from '${relPath}';\n`;
                return match.replace(scriptCode, injectedImport + scriptCode);
            }
            return match;
        });
        
        if (modified) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            filesFixed++;
        }
    });
});

console.log(`\n=== Import Alignment Report ===`);
console.log(`Files corrected: ${filesFixed}`);
