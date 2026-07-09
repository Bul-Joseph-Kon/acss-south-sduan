import fs from 'fs';
import vm from 'vm';

function checkSyntax(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const scriptMatches = content.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi);
    
    let scriptIdx = 1;
    for (const match of scriptMatches) {
        const scriptCode = match[1];
        try {
            // We use vm.Script to check syntax
            new vm.Script(scriptCode, { filename: `${filePath} [Script #${scriptIdx}]` });
            console.log(`✅ ${filePath} Script #${scriptIdx} syntax is valid.`);
        } catch (e) {
            console.error(`❌ SyntaxError in ${filePath} Script #${scriptIdx}:`, e.message);
            // Print the lines around the error
            const lines = scriptCode.split('\n');
            const errorLine = e.stack.match(/at\s+.*:(\d+):\d+/);
            if (errorLine) {
                const lineNum = parseInt(errorLine[1]);
                console.error(`Error around line ${lineNum}:`);
                for (let i = Math.max(0, lineNum - 5); i < Math.min(lines.length, lineNum + 5); i++) {
                    console.error(`${i + 1}: ${lines[i]}`);
                }
            } else {
                console.error('Stack:', e.stack);
            }
        }
        scriptIdx++;
    }
}

checkSyntax('pages/admin/role-management.html');
