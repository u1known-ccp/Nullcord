$ErrorActionPreference = 'Stop'
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path
$b64Path = Join-Path $PSScriptRoot 'new_logo.b64'
if (-not (Test-Path $b64Path)) { Write-Error "Base64 file not found: $b64Path"; exit 1 }
$B64 = Get-Content -Raw $b64Path

$instPath = Join-Path $repoRoot 'installer\NullCord-Installer-GUI.ps1'
if (-not (Test-Path $instPath)) { Write-Error "Installer not found: $instPath"; exit 1 }
$inst = Get-Content -Raw $instPath
$startMarker = '$LogoB64 = "'
$startIndex = $inst.IndexOf($startMarker)
if ($startIndex -lt 0) { Write-Error "Start marker for LogoB64 not found in installer"; exit 1 }
$logoNullIndex = $inst.IndexOf('$logo = $null', $startIndex)
if ($logoNullIndex -lt 0) { Write-Error "Logo null marker not found in installer"; exit 1 }
$pre = $inst.Substring(0, $startIndex)
$after = $inst.Substring($logoNullIndex)
$newInst = $pre + $startMarker + $B64 + '"' + "`r`n" + $after
Set-Content -Encoding utf8BOM -Path $instPath -Value $newInst
Write-Output "Updated installer: $instPath"

$iconPath = Join-Path $repoRoot 'src\main\iconData.ts'
if (-not (Test-Path $iconPath)) { Write-Error "iconData.ts not found: $iconPath"; exit 1 }
$icon = Get-Content -Raw $iconPath
$startMarker2 = 'export const KITTY_ICON_DATA_URL = "data:image/png;base64,'
$start2 = $icon.IndexOf($startMarker2)
if ($start2 -lt 0) { Write-Error "Start marker for KITTY_ICON_DATA_URL not found"; exit 1 }
$end2 = $icon.IndexOf('";', $start2)
if ($end2 -lt 0) { Write-Error "End marker for KITTY_ICON_DATA_URL not found"; exit 1 }
$pre2 = $icon.Substring(0, $start2)
$rest2 = $icon.Substring($end2 + 2)
$newIcon = $pre2 + $startMarker2 + $B64 + '";' + $rest2
Set-Content -Encoding utf8 -Path $iconPath -Value $newIcon
Write-Output "Updated iconData: $iconPath"
