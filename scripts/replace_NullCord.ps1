# Replace NullCord -> NullCord and NullCord -> nullcord across the repo
# Excludes common build/output dirs. Run from repo root.
$root = Get-Location
$excludePatterns = '\\.git\\|\\bnode_modules\\b|\\bdist\\b|\\bout\\b|\\bbuild\\b|\\brelease\\b|\\bout\\b'
Write-Host "Scanning files under $root (excluding .git, node_modules, dist, build, out, release)..."

# Replace inside files
Get-ChildItem -Recurse -File | Where-Object { $_.FullName -notmatch $excludePatterns } | ForEach-Object {
    try {
        $text = Get-Content -Raw -LiteralPath $_.FullName -ErrorAction Stop
    } catch { continue }
    $new = $text -replace 'NullCord','NullCord' -replace 'NullCord','nullcord'
    if ($new -ne $text) {
        Set-Content -LiteralPath $_.FullName -Value $new
        Write-Host "Updated content:" $_.FullName
    }
}

# Rename files and directories (deepest first)
$items = Get-ChildItem -Recurse | Where-Object { $_.Name -match 'NullCord' -or $_.Name -match 'NullCord' } | Sort-Object FullName -Descending
foreach ($it in $items) {
    $newName = $it.Name -replace 'NullCord','NullCord' -replace 'NullCord','nullcord'
    if ($newName -ne $it.Name) {
        try {
            Rename-Item -LiteralPath $it.FullName -NewName $newName -ErrorAction Stop
            Write-Host "Renamed: $($it.FullName) -> $newName"
        } catch {
            Write-Host "Failed to rename: $($it.FullName): $_"
        }
    }
}

Write-Host "Done. Consider running 'git status' to review changes."
