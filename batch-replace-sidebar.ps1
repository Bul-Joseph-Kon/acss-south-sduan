# Batch replace sidebar in all trader pages
$traderPages = Get-ChildItem "c:\Users\Administrator\acss-south-sudan\pages\trader" -Filter "*.html"

foreach ($page in $traderPages) {
    Write-Host "Processing $($page.Name)..."
    
    $content = Get-Content $page.FullName -Raw
    
    # Add trader-sidebar.js import if not already present
    if ($content -notmatch 'trader-sidebar\.js') {
        $content = $content -replace '<link href="https://cdn\.jsdelivr\.net/npm/remixicon@4\.2\.0/fonts/remixicon\.css" rel="stylesheet" />', '<link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet" />
    <script type="module" src="../../js/trader-sidebar.js"></script>'
    }
    
    # Replace old sidebar with new container
    $oldSidebar = '(?s)<aside class="lg:w-72 flex-shrink-0">.*?</aside>'
    $newSidebar = '<aside class="lg:w-72 flex-shrink-0">
                    <div id="trader-sidebar"></div>
                </aside>'
    
    if ($content -match $oldSidebar) {
        $content = $content -replace $oldSidebar, $newSidebar
        Write-Host "  - Sidebar replaced"
    } else {
        Write-Host "  - No sidebar found to replace"
    }
    
    Set-Content $page.FullName -Value $content
}

Write-Host "Done processing all trader pages."
