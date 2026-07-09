import fs from 'fs';

const broken = JSON.parse(fs.readFileSync('scratch/broken_links.json', 'utf8'));

const summary = {};
broken.forEach(b => {
    const folder = b.sourceFile.split('/')[0] + '/' + b.sourceFile.split('/')[1];
    if (!summary[folder]) summary[folder] = 0;
    summary[folder]++;
});

console.log('=== Broken Links Summary by Folder ===');
console.log(summary);

console.log('\n=== Sample Broken Links in Other Roles ===');
const nonAgentTrader = broken.filter(b => !b.sourceFile.includes('agent') && !b.sourceFile.includes('trader'));
console.log(`Found ${nonAgentTrader.length} broken links in other roles`);
nonAgentTrader.slice(0, 20).forEach(b => {
    console.log(`[${b.sourceFile}] Link "${b.targetLink}" -> resolves to non-existent "${b.resolvedPath}"`);
});
