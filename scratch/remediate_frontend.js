import fs from 'fs';
import path from 'path';

// Target directories
const targetDirs = ['pages/agent', 'pages/trader'];

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

let mockPagesRemediated = 0;
let linksNormalized = 0;

function remediateFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const role = filePath.includes('agent') ? 'agent' : 'trader';
    
    // Check if the page is already protected (e.g. dashboard-agent.html)
    const hasAuthImport = content.includes('auth.js') || content.includes('auth-check.js') || content.includes('auth-guard.js');
    const hasCheckAuth = content.includes('checkAuth') || content.includes('checkPageAuth') || content.includes('requireAuth');
    const isProtected = hasAuthImport && hasCheckAuth;
    
    let newContent = content;
    
    // 1. Normalize links (regex replaces nested structures with flat basenames)
    // Match patterns like ../../dashboard-agent.html, services/cvet/create-declaration.html, applications/submitted.html
    const linkRegex = /href=["'](?:(?:\.\.\/)+|(?:applications|notifications|services|home)\/)+(?:[a-zA-Z0-9_-]+\/)*([a-zA-Z0-9_-]+\.html)["']/g;
    const originalContent = newContent;
    newContent = newContent.replace(linkRegex, 'href="$1"');
    if (newContent !== originalContent) {
        linksNormalized++;
    }
    
    // 2. Fix logouts
    newContent = newContent.replace(/onclick=["']alert\('👋 Signed out'\)["']/g, 'id="signOutBtn"');
    newContent = newContent.replace(/<a\s+href=["']#["']\s+class=["']danger["']>/g, '<a href="#" id="dropdownSignOut" class="danger">');
    
    // 3. Inject scripts for unprotected mock pages
    if (!isProtected) {
        mockPagesRemediated++;
        console.log(`[Remediating Unprotected Page] ${filePath}`);
        
        // Find if we have profile placeholders to assign IDs to for live bindings
        if (role === 'agent') {
            newContent = newContent.replace(/<h3 class="text-lg font-bold text-gray-800">Clearing Agent<\/h3>/g, `<h3 id="agentProfileName" class="text-lg font-bold text-gray-800">Loading...</h3>`);
            newContent = newContent.replace(/<p class="text-gray-500 text-sm">Licensed Agent<\/p>/g, `<p id="agentProfileRole" class="text-gray-500 text-sm">Loading...</p>`);
        } else {
            newContent = newContent.replace(/<h3 class="text-lg font-bold text-gray-800">John Trader<\/h3>/g, `<h3 id="traderProfileName" class="text-lg font-bold text-gray-800">Loading...</h3>`);
            newContent = newContent.replace(/<p class="text-gray-500 text-sm">Importer\/Exporter<\/p>/g, `<p id="traderProfileRole" class="text-gray-500 text-sm">Loading...</p>`);
        }
        
        const scriptBlock = `
    <!-- Supabase & Shared Authentication Guards -->
    <script type="module">
        import supabase from '../../js/supabase.js';
        import { checkPageAuth } from '../../js/auth-check.js';
        import { signOut } from '../../js/auth.js';
        import { loadCurrentUserProfile } from '../../js/profile-loader.js';

        async function initPage() {
            console.log('=== INITIALIZING AUTH GUARD ON MOCK PAGE ===');
            const role = '${role}';
            
            // 1. Run auth check
            const hasAccess = await checkPageAuth(role);
            if (!hasAccess) {
                console.log('Access denied, redirecting...');
                return;
            }

            // 2. Load profile data from Supabase
            const { user, profile } = await loadCurrentUserProfile();
            
            // 3. Update sidebar and profile UI
            if (profile) {
                const displayName = profile.full_name || user?.email || 'User';
                const displayRole = role === 'agent' ? 'Clearing Agent' : 'Trader';
                
                const nameEl = document.getElementById(role + 'ProfileName') || document.querySelector('[data-user-name]');
                if (nameEl) nameEl.textContent = displayName;
                
                const roleEl = document.getElementById(role + 'ProfileRole') || document.querySelector('[data-user-role]');
                if (roleEl) roleEl.textContent = displayRole;
                
                const statusEl = document.getElementById(role + 'ProfileStatus');
                if (statusEl) statusEl.textContent = '● ' + (profile.status || 'Active');
                
                const tinEl = document.getElementById(role + 'ProfileTIN');
                if (tinEl && profile.organization) {
                    tinEl.textContent = 'Org: ' + profile.organization;
                }
            }

            // 4. Bind Logout Button Listeners
            const handleLogout = async (e) => {
                e.preventDefault();
                console.log('Signing out...');
                const result = await signOut();
                if (result.success) {
                    window.location.href = '../../auth/login.html';
                }
            };

            const signOutBtn = document.getElementById('signOutBtn');
            if (signOutBtn) signOutBtn.addEventListener('click', handleLogout);

            const dropdownSignOut = document.getElementById('dropdownSignOut');
            if (dropdownSignOut) dropdownSignOut.addEventListener('click', handleLogout);
        }

        document.addEventListener('DOMContentLoaded', initPage);
        if (document.readyState === 'interactive' || document.readyState === 'complete') {
            initPage();
        }
    </script>
</body>`;

        newContent = newContent.replace(/<\/body>/g, scriptBlock);
    } else {
        console.log(`[Normalizing Links Only] ${filePath}`);
    }
    
    // Write back modified content
    fs.writeFileSync(filePath, newContent, 'utf8');
}

console.log('Starting project-wide frontend remediation...');
targetDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
        const files = getHtmlFiles(dir);
        console.log(`Scanning folder "${dir}": found ${files.length} HTML files.`);
        files.forEach(remediateFile);
    }
});

console.log('\n=== Remediation Report ===');
console.log(`Unprotected Mock Pages Remediated: ${mockPagesRemediated}`);
console.log(`Pages with Links Normalized: ${linksNormalized}`);
console.log('Frontend remediation completed successfully!');
