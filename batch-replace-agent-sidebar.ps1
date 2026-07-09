# Batch replace sidebar in all agent pages
$agentPages = Get-ChildItem "c:\Users\Administrator\acss-south-sudan\pages\agent" -Filter "*.html"

foreach ($page in $agentPages) {
    Write-Host "Processing $($page.Name)..."
    
    $content = Get-Content $page.FullName -Raw
    
    # Add agent-sidebar.js import if not already present
    if ($content -notmatch 'agent-sidebar\.js') {
        $content = $content -replace '<script type="module" src="\.\./\.\./js/realtime\.js"></script>', '<script type="module" src="../../js/realtime.js"></script>
    <script type="module" src="../../js/agent-sidebar.js"></script>'
    }
    
    # Replace old sidebar with new container
    $oldSidebar = '(?s)<aside class="lg:w-72 flex-shrink-0">.*?</aside>'
    $newSidebar = '<aside class="lg:w-72 flex-shrink-0">
                    <div id="agent-sidebar"></div>
                </aside>'
    
    if ($content -match $oldSidebar) {
        $content = $content -replace $oldSidebar, $newSidebar
        Write-Host "  - Sidebar replaced"
    } else {
        Write-Host "  - No sidebar found to replace"
    }
    
    Set-Content $page.FullName -Value $content
}

Write-Host "Done processing all agent pages."
