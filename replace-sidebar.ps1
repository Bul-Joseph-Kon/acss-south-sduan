$content = Get-Content 'c:\Users\Administrator\acss-south-sudan\pages\trader\draft.html' -Raw
$oldSidebar = '(?s)<aside class="lg:w-72 flex-shrink-0">.*?</aside>'
$newSidebar = '<aside class="lg:w-72 flex-shrink-0">
                    <div id="trader-sidebar"></div>
                </aside>'
$content = $content -replace $oldSidebar, $newSidebar
Set-Content 'c:\Users\Administrator\acss-south-sudan\pages\trader\draft.html' -Value $content
