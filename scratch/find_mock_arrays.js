import fs from 'fs';
import path from 'path';

const EXCLUDED_DIRS = [
    'node_modules',
    '.git',
    '.vscode',
    'dist',
    'scratch'
];

const mockArraysFound = [];

function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            if (EXCLUDED_DIRS.includes(file)) continue;
            scanDirectory(fullPath);
        } else {
            if (!file.endsWith('.html')) continue;
            scanFile(fullPath);
        }
    }
}

function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // We want to extract script tags and see if they define static data structures that look like mock data
    const scriptMatches = content.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi);
    
    for (const match of scriptMatches) {
        const scriptCode = match[1];
        
        // Look for typical mock array structures, like variables containing arrays of objects with status, name, or role
        const arrayRegex = /(?:const|let|var)\s+(\w+)\s*=\s*\[\s*\{\s*\w+\s*:/g;
        const matches = scriptCode.matchAll(arrayRegex);
        
        for (const m of matches) {
            const varName = m[1];
            // Check if it is a mock variable name or standard list
            const line = content.substring(0, m.index).split('\n').length;
            
            // Extract the array contents to verify if it's dummy data
            const afterMatch = scriptCode.substring(m.index);
            const arrayCloseIndex = afterMatch.indexOf('];');
            const arrayContent = afterMatch.substring(0, arrayCloseIndex + 2);
            
            mockArraysFound.push({
                file: path.relative(process.cwd(), filePath),
                line,
                varName,
                snippet: arrayContent.split('\n').slice(0, 10).join('\n')
            });
        }
    }
}

scanDirectory(process.cwd());
console.log(`Scan completed. Found ${mockArraysFound.length} potential mock arrays.`);

fs.writeFileSync('scratch/mock_arrays.json', JSON.stringify(mockArraysFound, null, 2), 'utf8');

mockArraysFound.forEach(m => {
    console.log(`\nFile: ${m.file} (Line ${m.line}) - Variable: ${m.varName}`);
    console.log(m.snippet);
});
