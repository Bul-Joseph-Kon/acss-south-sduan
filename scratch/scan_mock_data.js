import fs from 'fs';
import path from 'path';

const SEARCH_TERMS = [
    'mock',
    'dummy',
    'sample',
    'fake',
    'placeholder',
    'Math.random',
    'random()',
    'John Trader',
    'Test User',
    'Lorem',
    'TODO',
    'FIXME',
    'HACK',
    'TEMP',
    'HARDCODED',
    'alert(',
    'onclick='
];

const EXCLUDED_DIRS = [
    'node_modules',
    '.git',
    '.vscode',
    'dist',
    'scratch'
];

const EXCLUDED_FILES = [
    'package.json',
    'package-lock.json'
];

const results = [];

function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            if (EXCLUDED_DIRS.includes(file)) continue;
            scanDirectory(fullPath);
        } else {
            if (EXCLUDED_FILES.includes(file)) continue;
            if (!file.endsWith('.html') && !file.endsWith('.js') && !file.endsWith('.sql')) continue;
            scanFile(fullPath);
        }
    }
}

function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
        SEARCH_TERMS.forEach(term => {
            let found = false;
            if (term.toLowerCase() === 'math.random') {
                found = line.includes('Math.random');
            } else if (term.toLowerCase() === 'random()') {
                found = line.includes('random()');
            } else {
                // Case-insensitive search for others
                found = line.toLowerCase().includes(term.toLowerCase());
            }
            
            if (found) {
                // Check if this is a comment or production code
                const isComment = line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('--') || line.trim().startsWith('*');
                results.push({
                    file: path.relative(process.cwd(), filePath),
                    line: index + 1,
                    term,
                    content: line.trim(),
                    isComment
                });
            }
        });
    });
}

console.log('Starting full project scan...');
scanDirectory(process.cwd());
console.log(`Scan complete. Found ${results.length} occurrences.`);

// Write results to a JSON file for analysis
fs.writeFileSync('scratch/scan_results.json', JSON.stringify(results, null, 2), 'utf8');
console.log('Results written to scratch/scan_results.json');

// Print first 50 results for preview
console.log('=== Sample Results (First 50) ===');
results.slice(0, 50).forEach(r => {
    console.log(`[${r.file}:${r.line}] (${r.term}) ${r.isComment ? '[Comment]' : '[CODE]'}: ${r.content}`);
});
