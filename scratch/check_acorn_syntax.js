import fs from 'fs';
import { Parser } from 'acorn';

function checkAcornSyntax(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const scriptMatches = content.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi);
    
    let scriptIdx = 1;
    for (const match of scriptMatches) {
        const scriptCode = match[1];
        const isModule = match[0].includes('type="module"');
        
        try {
            Parser.parse(scriptCode, {
                ecmaVersion: 2022,
                sourceType: isModule ? 'module' : 'script'
            });
            console.log(`✅ ${filePath} Script #${scriptIdx} is syntactically correct.`);
        } catch (e) {
            console.error(`❌ Syntax Error in ${filePath} Script #${scriptIdx}:`, e.message);
            const lines = scriptCode.split('\n');
            const matchLine = e.message.match(/\((\d+):(\d+)\)/);
            if (matchLine) {
                const lineNum = parseInt(matchLine[1]);
                console.error(`Error around line ${lineNum}:`);
                for (let i = Math.max(0, lineNum - 5); i < Math.min(lines.length, lineNum + 5); i++) {
                    console.error(`${i + 1}: ${lines[i]}`);
                }
            }
        }
        scriptIdx++;
    }
}

checkAcornSyntax('pages/admin/role-management.html');
checkAcornSyntax('pages/trader/dashboard-trader.html');
checkAcornSyntax('pages/agent/dashboard-agent.html');
