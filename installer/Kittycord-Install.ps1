#Requires -Version 5.1
<#
    Kittycord — Windows installer

    Patches your local Discord desktop client to load Kittycord from this repo's
    `dist/desktop` build. Run `pnpm build` first so the build output exists.

    Usage (do NOT run as Administrator):
        powershell -ExecutionPolicy Bypass -File .\installer\Kittycord-Install.ps1

    Uninstall with installer\Kittycord-Uninstall.ps1.
#>

$ErrorActionPreference = "Stop"

$RepoRoot   = Split-Path $PSScriptRoot -Parent
$PatcherJs  = Join-Path $RepoRoot "dist\desktop\patcher.js"

if (-not (Test-Path $PatcherJs)) {
    Write-Host "Build output not found: $PatcherJs" -ForegroundColor Red
    Write-Host "Run 'pnpm build' in the repo first, then re-run this installer." -ForegroundColor Yellow
    exit 1
}

# Path used inside the injected index.js (forward slashes are safe for Node require on Windows)
$PatcherForward = ($PatcherJs -replace '\\', '/')

# Discord branches: display name -> install folder + process name
$Branches = @(
    @{ Name = "Discord";        Dir = "Discord";            Proc = "Discord" }
    @{ Name = "Discord PTB";    Dir = "DiscordPTB";         Proc = "DiscordPTB" }
    @{ Name = "Discord Canary"; Dir = "DiscordCanary";      Proc = "DiscordCanary" }
)

function Get-LatestResources([string]$baseDir) {
    if (-not (Test-Path $baseDir)) { return $null }
    $appDirs = Get-ChildItem -Path $baseDir -Directory -Filter "app-*" -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending
    foreach ($d in $appDirs) {
        $res = Join-Path $d.FullName "resources"
        if (Test-Path $res) { return $res }
    }
    return $null
}

$patchedAny = $false

foreach ($b in $Branches) {
    $base = Join-Path $env:LOCALAPPDATA $b.Dir
    $resources = Get-LatestResources $base
    if (-not $resources) { continue }

    Write-Host "Found $($b.Name) at $resources" -ForegroundColor Cyan

    # Close the client so files aren't locked
    Get-Process -Name $b.Proc -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500

    $appAsar = Join-Path $resources "app.asar"
    $backup  = Join-Path $resources "_app.asar"
    $appDir  = Join-Path $resources "app"

    # Back up the original app.asar exactly once
    if ((Test-Path $appAsar) -and -not (Test-Path $backup)) {
        Move-Item -Path $appAsar -Destination $backup -Force
    }

    if (-not (Test-Path $backup)) {
        Write-Host "  Could not find app.asar to patch (already patched without backup?). Skipping." -ForegroundColor Yellow
        continue
    }

    # (Re)create the injected app folder
    if (Test-Path $appDir) { Remove-Item -Path $appDir -Recurse -Force }
    New-Item -ItemType Directory -Path $appDir | Out-Null

    @'
{
    "name": "discord",
    "main": "index.js",
    "private": true
}
'@ | Set-Content -Path (Join-Path $appDir "package.json") -Encoding utf8

    # index.js loads the Kittycord patcher; the patcher itself loads the original Discord.
    # Falls back to vanilla Discord if the patcher fails to load.
    $indexJs = @"
try {
    require("$PatcherForward");
} catch (err) {
    console.error("[Kittycord] Failed to load patcher, starting vanilla Discord:", err);
    require("../_app.asar");
}
"@
    $indexJs | Set-Content -Path (Join-Path $appDir "index.js") -Encoding utf8

    Write-Host "  Patched $($b.Name)." -ForegroundColor Green
    $patchedAny = $true
}

if (-not $patchedAny) {
    Write-Host "No Discord installation was found under %LOCALAPPDATA%." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Kittycord installed. Start Discord again to see it." -ForegroundColor Magenta
