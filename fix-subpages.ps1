$basePath = "c:\Users\Administrator\acss-south-sudan\pages"
$fixedCount = 0

$files = Get-ChildItem -Path $basePath -Filter "*.html" -Recurse

foreach ($file in $files) {
    if ($file.Name -match "dashboard-(trader|agent|officer|inspector|supervisor|revenue|admin).html") {
        continue
    }
    
    $content = Get-Content $file.FullName -Raw
    
    $role = if ($file.FullName -match "pages\\(trader|agent|officer|inspector|supervisor|revenue|admin)\\") {
        $matches[1]
    } else {
        continue
    }
    
    $modified = $false
    
    if ($content -match "onclick=.alert\(.👋 Signed out.\)") {
        $content = $content -replace "onclick=.alert\(.👋 Signed out.\)", 'id="signOutBtn"'
        $modified = $true
    }
    
    if (-not ($content -match "checkPageAuth")) {
        $depth = ($file.FullName.Replace($basePath, "").Split("\").Count) - 1
        $relativePath = ("../" * $depth) + "js/auth-check.js"
        $authRelativePath = ("../" * $depth) + "js/auth.js"
        $loginPath = ("../" * $depth) + "auth/login.html"
        
        $scriptTag = "<script type=`"module`">import { checkPageAuth, signOut } from '$relativePath';import { signOut as authSignOut } from '$authRelativePath';await checkPageAuth('$role');const signOutBtn = document.getElementById('signOutBtn');if (signOutBtn) { signOutBtn.addEventListener('click', async () => { const result = await authSignOut(); if (result.success) { window.location.href = '$loginPath'; } }); }}</script></body></html>"
        
        $content = $content -replace "</body>\s*</html>", $scriptTag
        $modified = $true
    }
    
    if ($modified) {
        Set-Content $file.FullName $content -NoNewline
        $fixedCount++
        Write-Host "Fixed: $($file.FullName)"
    }
}

Write-Host "Total files fixed: $fixedCount"
