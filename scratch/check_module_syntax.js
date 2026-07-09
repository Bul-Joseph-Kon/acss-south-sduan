import fs from 'fs';
import { execSync } from 'child_process';

function checkSyntaxOfModules() {
    const files = ['pages/admin/role-management.html', 'pages/trader/dashboard-trader.html', 'pages/agent/dashboard-agent.html'];
    
    files.forEach(filePath => {
        const content = fs.readFileSync(filePath, 'utf8');
        const scriptMatches = content.matchAll(/<script\s+type="module">([\s\S]*?)<\/script>/gi);
        
        let scriptIdx = 1;
        for (const match of scriptMatches) {
            const scriptCode = match[1];
            const tempFile = `scratch/temp_${path.basename(filePath).replace('.html', '')}_${scriptIdx}.js`;
            
            fs.writeFileSync(tempFile, scriptCode, 'utf8');
            
            try {
                // Run node --check to verify syntax of ES modules
                execSync(`node --check ${tempFile}`, { stdio: 'pipe' });
                console.log(`✅ ${filePath} Script #${scriptIdx} is syntactically valid.`);
            } catch (e) {
                console.error(`❌ Syntax error in ${filePath} Script #${scriptIdx}:`);
                console.error(e.stderr.toString());
            } finally {
                // Clean up temp file
                fs.unlinkSync(tempFile);
            }
            scriptIdx++;
        }
    });
}

// We import path to extract basename
import path from 'path';
checkSyntaxOfModules();
