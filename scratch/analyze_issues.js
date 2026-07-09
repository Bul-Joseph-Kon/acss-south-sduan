import fs from 'fs';

const results = JSON.parse(fs.readFileSync('scratch/scan_results.json', 'utf8'));

// Filter for files in pages/ and js/ that are NOT comments
const codeIssues = results.filter(r => 
    !r.isComment && 
    (r.file.startsWith('pages') || r.file.startsWith('js'))
);

console.log(`Total code issues found in pages/ or js/: ${codeIssues.length}`);

// Group by file
const fileGroups = {};
codeIssues.forEach(r => {
    if (!fileGroups[r.file]) {
        fileGroups[r.file] = [];
    }
    fileGroups[r.file].push(r);
});

// Let's identify files with significant issues
console.log('\n=== Files with potential mock data or warnings ===');
Object.keys(fileGroups).forEach(file => {
    const issues = fileGroups[file];
    
    // Find issues where the line contains mock arrays, random simulation, or alert
    const mockIssues = issues.filter(i => 
        i.term.toLowerCase() === 'mock' ||
        i.term.toLowerCase() === 'dummy' ||
        i.term.toLowerCase() === 'fake' ||
        i.term.toLowerCase() === 'sample' ||
        i.term.toLowerCase() === 'math.random' ||
        i.term.toLowerCase() === 'random()' ||
        i.term.toLowerCase() === 'john trader' ||
        i.term.toLowerCase() === 'lorem'
    );
    
    if (mockIssues.length > 0) {
        console.log(`\nFile: ${file} (${mockIssues.length} issues)`);
        mockIssues.slice(0, 10).forEach(i => {
            console.log(`  [Line ${i.line}] (${i.term}): ${i.content}`);
        });
    }
});
