#Requires -Version 5.1

param(
    [ValidateSet("Install", "Uninstall")]
    [string]$Mode = "Install",
    [ValidateSet("Release", "Local")]
    [string]$Source = "Release",
    [switch]$NoGui
)

$ErrorActionPreference = "Stop"

$ScriptDir = $null
if (-not [string]::IsNullOrWhiteSpace($PSScriptRoot)) {
    $ScriptDir = $PSScriptRoot
}
elseif ($MyInvocation.MyCommand.Path) {
    $ScriptDir = Split-Path -Path $MyInvocation.MyCommand.Path -Parent
}
else {
    $ScriptDir = [System.AppDomain]::CurrentDomain.BaseDirectory
}
if ([string]::IsNullOrWhiteSpace($ScriptDir)) {
    $ScriptDir = (Get-Location).Path
}

$Repo = "NullCord-Production/NullCord"
$ReleaseAsarUrl = "https://github.com/$Repo/releases/latest/download/desktop.asar"
$InstallDir = Join-Path $env:LOCALAPPDATA "NullCord"
$DownloadedAsarPath = Join-Path $InstallDir "desktop.asar"
$RepoRoot = if ((Split-Path -Leaf $ScriptDir) -ieq "installer") { Split-Path -Path $ScriptDir -Parent } else { $ScriptDir }
$LocalPatcherPath = Join-Path $RepoRoot "dist\desktop\patcher.js"
$Marker = "NullCord Installer v2"

$script:NoGuiMode = [bool]$NoGui
$script:Ui = $null
$script:InstallerIcon = $null
$script:InstallerIconBitmap = $null
$script:InstallerIconHandle = [IntPtr]::Zero

Add-Type -Namespace NullCordNative -Name User32 -MemberDefinition @'
[DllImport("user32.dll", SetLastError=true)]
public static extern bool DestroyIcon(IntPtr hIcon);
[DllImport("user32.dll")]
public static extern bool ReleaseCapture();
[DllImport("user32.dll")]
public static extern IntPtr SendMessage(IntPtr hWnd, int Msg, int wParam, int lParam);
'@

function Start-WindowDrag {
    param([System.Windows.Forms.Form]$Form)
    if (-not $Form) { return }
    [void][NullCordNative.User32]::ReleaseCapture()
    [void][NullCordNative.User32]::SendMessage($Form.Handle, 0xA1, 0x2, 0)
}

function Get-InstallerIcon {
    if ($script:InstallerIcon) {
        return $script:InstallerIcon
    }

    $candidates = @(
        (Join-Path $ScriptDir "Logo Trans.ico"),
        (Join-Path $ScriptDir "NullCord-test.ico")
    )

    if ((Split-Path -Leaf $ScriptDir) -notlike "installer") {
        $installerDir = Join-Path $RepoRoot "installer"
        $candidates += @(
            (Join-Path $installerDir "Logo Trans.ico"),
            (Join-Path $installerDir "NullCord-test.ico")
        )
    }

    foreach ($candidate in $candidates) {
        if (-not (Test-Path $candidate)) { continue }
        try {
            $script:InstallerIcon = New-Object System.Drawing.Icon($candidate)
            return $script:InstallerIcon
        }
        catch { }

        try {
            $script:InstallerIconBitmap = [System.Drawing.Bitmap]::FromFile($candidate)
            $script:InstallerIconHandle = $script:InstallerIconBitmap.GetHicon()
            $script:InstallerIcon = [System.Drawing.Icon]::FromHandle($script:InstallerIconHandle)
            return $script:InstallerIcon
        }
        catch { }
    }

    try {
        $exePath = [System.Windows.Forms.Application]::ExecutablePath
        if ($exePath -and (Test-Path $exePath)) {
            $script:InstallerIcon = [System.Drawing.Icon]::ExtractAssociatedIcon($exePath)
            return $script:InstallerIcon
        }
    }
    catch { }

    return $null
}

function New-RoundedPath {
    param(
        [System.Drawing.Rectangle]$Rect,
        [int]$Radius
    )

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diameter = [Math]::Max(2, $Radius * 2)

    if ($Rect.Width -lt 2 -or $Rect.Height -lt 2) {
        $path.AddRectangle($Rect)
        return $path
    }

    $path.AddArc($Rect.X, $Rect.Y, $diameter, $diameter, 180, 90)
    $path.AddArc($Rect.Right - $diameter, $Rect.Y, $diameter, $diameter, 270, 90)
    $path.AddArc($Rect.Right - $diameter, $Rect.Bottom - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($Rect.X, $Rect.Bottom - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    return $path
}

function Set-RoundedRegion {
    param(
        [System.Windows.Forms.Control]$Control,
        [int]$Radius
    )

    if (-not $Control) { return }
    if ($Control.Width -lt 2 -or $Control.Height -lt 2) { return }

    $rect = New-Object System.Drawing.Rectangle(0, 0, $Control.Width, $Control.Height)
    $path = New-RoundedPath -Rect $rect -Radius $Radius
    $Control.Region = New-Object System.Drawing.Region($path)
    $path.Dispose()
}

function Write-Log {
    param(
        [string]$Message,
        [System.Drawing.Color]$Color = [System.Drawing.Color]::FromArgb(196, 204, 217)
    )

    if ($script:NoGuiMode) {
        Write-Host $Message
        return
    }

    if (-not $script:Ui -or -not $script:Ui.LogBox) { return }
    $line = "[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $Message
    $script:Ui.LogBox.SelectionStart = $script:Ui.LogBox.TextLength
    $script:Ui.LogBox.SelectionLength = 0
    $script:Ui.LogBox.SelectionColor = $Color
    $script:Ui.LogBox.AppendText($line + [Environment]::NewLine)
    $script:Ui.LogBox.SelectionColor = $script:Ui.LogBox.ForeColor
    $script:Ui.LogBox.ScrollToCaret()
    [System.Windows.Forms.Application]::DoEvents()
}

function Set-Status {
    param([string]$Message)
    if ($script:NoGuiMode) {
        Write-Host $Message
        return
    }
    if (-not $script:Ui -or -not $script:Ui.StatusLabel) { return }
    $script:Ui.StatusLabel.Text = $Message
    [System.Windows.Forms.Application]::DoEvents()
}

function Set-Progress {
    param([int]$Percent)
    $value = [Math]::Max(0, [Math]::Min(100, $Percent))
    if ($script:NoGuiMode) { return }
    if (-not $script:Ui -or -not $script:Ui.ProgressBar) { return }

    if ($script:Ui.ProgressBar -is [System.Windows.Forms.ProgressBar]) {
        $script:Ui.ProgressBar.Value = $value
    }
    elseif ($script:Ui.ProgressBar.PSObject.Properties.Name -contains "Fill") {
        $track = $script:Ui.ProgressBar.Track
        $fill = $script:Ui.ProgressBar.Fill
        $maxWidth = [Math]::Max(0, [int]$track.Width - 4)
        $fill.Width = [int][Math]::Round(($value / 100.0) * $maxWidth)
    }

    [System.Windows.Forms.Application]::DoEvents()
}

function Get-Branches {
    @(
        @{ Name = "Discord"; Dir = "Discord"; Proc = "Discord" }
        @{ Name = "Discord PTB"; Dir = "DiscordPTB"; Proc = "DiscordPTB" }
        @{ Name = "Discord Canary"; Dir = "DiscordCanary"; Proc = "DiscordCanary" }
    )
}

function Get-LatestResources {
    param([string]$BaseDir)
    if (-not (Test-Path $BaseDir)) { return $null }
    $appDirs = Get-ChildItem -Path $BaseDir -Directory -Filter "app-*" -ErrorAction SilentlyContinue | Sort-Object Name -Descending
    foreach ($dir in $appDirs) {
        $resources = Join-Path $dir.FullName "resources"
        if (Test-Path $resources) { return $resources }
    }
    return $null
}

function Get-AllResources {
    param([string]$BaseDir)
    if (-not (Test-Path $BaseDir)) { return @() }
    return @(Get-ChildItem -Path $BaseDir -Directory -Filter "app-*" -ErrorAction SilentlyContinue |
        ForEach-Object { Join-Path $_.FullName "resources" } |
        Where-Object { Test-Path $_ })
}

function Get-PatchState {
    param([string]$Resources)

    $indexPath = Join-Path $Resources "app\index.js"
    $appDir = Join-Path $Resources "app"
    $backup = Join-Path $Resources "_app.asar"

    if (Test-Path $indexPath) {
        try {
            $content = Get-Content -Path $indexPath -Raw -ErrorAction Stop
            if ($content -match [regex]::Escape($Marker)) {
                return "installed"
            }
            return "other"
        }
        catch {
            return "other"
        }
    }

    if ((Test-Path $appDir) -or (Test-Path $backup)) {
        return "other"
    }

    return "clean"
}

function Get-DiscordInstallations {
    $items = @()
    foreach ($branch in Get-Branches) {
        $baseDir = Join-Path $env:LOCALAPPDATA $branch.Dir
        $latest = Get-LatestResources -BaseDir $baseDir
        if (-not $latest) { continue }
        $allResources = Get-AllResources -BaseDir $baseDir
        $state = Get-PatchState -Resources $latest
        $items += [pscustomobject]@{
            Name            = $branch.Name
            ProcName        = $branch.Proc
            BaseDir         = $baseDir
            LatestResources = $latest
            AllResources    = $allResources
            State           = $state
        }
    }
    return $items
}

function Stop-DiscordProcess {
    param([string]$ProcessName)
    try {
        Get-Process -Name $ProcessName -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    }
    catch { }
    Start-Sleep -Milliseconds 400
}

function Start-DiscordProcess {
    param($Install)
    $updateExe = Join-Path $Install.BaseDir "Update.exe"
    if (-not (Test-Path $updateExe)) { return }
    try {
        Start-Process -FilePath $updateExe -ArgumentList "--processStart", ($Install.ProcName + ".exe") | Out-Null
    }
    catch { }
}

function Write-InjectedApp {
    param(
        [string]$Resources,
        [string]$LoaderPath
    )

    $appDir = Join-Path $Resources "app"
    if (Test-Path $appDir) {
        Remove-Item -Path $appDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $appDir | Out-Null

    @'
{
  "name": "discord",
  "main": "index.js",
  "private": true
}
'@ | Set-Content -Path (Join-Path $appDir "package.json") -Encoding utf8

    $forward = ($LoaderPath -replace '\\', '/')
    $index = @"
// $Marker
try {
    require("$forward");
} catch (err) {
    console.error("[NullCord] Failed to load injected entry, starting vanilla Discord:", err);
    require("../_app.asar");
}
"@

    $index | Set-Content -Path (Join-Path $appDir "index.js") -Encoding utf8
}

function Patch-DiscordInstall {
    param(
        $Install,
        [string]$LoaderPath
    )

    $resources = $Install.LatestResources
    $appAsar = Join-Path $resources "app.asar"
    $backup = Join-Path $resources "_app.asar"

    Stop-DiscordProcess -ProcessName $Install.ProcName

    if ((Test-Path $appAsar) -and -not (Test-Path $backup)) {
        Move-Item -Path $appAsar -Destination $backup -Force
    }

    if (-not (Test-Path $backup)) {
        throw "Could not create or find _app.asar backup in $resources"
    }

    Write-InjectedApp -Resources $resources -LoaderPath $LoaderPath
    Start-DiscordProcess -Install $Install
}

function Unpatch-DiscordInstall {
    param($Install)

    $changed = $false
    Stop-DiscordProcess -ProcessName $Install.ProcName

    foreach ($resources in $Install.AllResources) {
        $appDir = Join-Path $resources "app"
        $appAsar = Join-Path $resources "app.asar"
        $backup = Join-Path $resources "_app.asar"

        if (Test-Path $appDir) {
            Remove-Item -Path $appDir -Recurse -Force
            $changed = $true
        }

        if (Test-Path $backup) {
            if (Test-Path $appAsar) {
                Remove-Item -Path $appAsar -Force -ErrorAction SilentlyContinue
            }
            Move-Item -Path $backup -Destination $appAsar -Force
            $changed = $true
        }
    }

    if ($changed) {
        Start-DiscordProcess -Install $Install
    }

    return $changed
}

function Download-ReleaseAsar {
    param([string]$TargetPath)

    New-Item -ItemType Directory -Path (Split-Path -Path $TargetPath -Parent) -Force | Out-Null
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

    $request = [System.Net.HttpWebRequest]::Create($ReleaseAsarUrl)
    $request.UserAgent = "NullCordInstaller/2"
    $request.AllowAutoRedirect = $true
    $response = $request.GetResponse()

    try {
        $total = [double]$response.ContentLength
        $stream = $response.GetResponseStream()
        $file = [System.IO.File]::Open($TargetPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
        try {
            $buffer = New-Object byte[] 65536
            $readTotal = 0L
            while (($read = $stream.Read($buffer, 0, $buffer.Length)) -gt 0) {
                $file.Write($buffer, 0, $read)
                $readTotal += $read
                if ($total -gt 0) {
                    $percent = [int][Math]::Floor(($readTotal / $total) * 100)
                    Set-Progress -Percent $percent
                    Set-Status -Message ("Downloading build... {0}%" -f $percent)
                }
            }
        }
        finally {
            $file.Dispose()
            $stream.Dispose()
        }
    }
    finally {
        $response.Dispose()
    }

    if (-not (Test-Path $TargetPath)) {
        throw "Download failed: desktop.asar is missing"
    }

    $expected = $null
    try {
        $shaResponse = Invoke-WebRequest -Uri ($ReleaseAsarUrl + ".sha256") -UseBasicParsing -TimeoutSec 15
        $shaText = [string]$shaResponse.Content
        $shaText = $shaText.Trim().ToLower()
        if ($shaText -match '^[0-9a-f]{64}$') {
            $expected = $shaText
        }
    }
    catch { }

    if ($expected) {
        $actual = (Get-FileHash -Path $TargetPath -Algorithm SHA256).Hash.ToLower()
        if ($actual -ne $expected) {
            Remove-Item -Path $TargetPath -Force -ErrorAction SilentlyContinue
            throw "Checksum mismatch while downloading desktop.asar"
        }
    }
}

function Resolve-LoaderPath {
    param([string]$SelectedSource)

    if ($SelectedSource -eq "Local") {
        if (-not (Test-Path $LocalPatcherPath)) {
            throw "Local build not found: $LocalPatcherPath. Run pnpm build first."
        }
        return $LocalPatcherPath
    }

    Write-Log -Message "Downloading latest NullCord release..."
    Download-ReleaseAsar -TargetPath $DownloadedAsarPath
    Write-Log -Message "Release build downloaded and verified."
    return $DownloadedAsarPath
}

function Get-StateLabel {
    param([string]$State)
    switch ($State) {
        "installed" { return "NullCord installed" }
        "other" { return "Patched by another mod" }
        default { return "not patched" }
    }
}

function Invoke-InstallerAction {
    param(
        [string]$ActionMode,
        [string]$ActionSource,
        [object[]]$Targets
    )

    if (-not $Targets -or $Targets.Count -eq 0) {
        throw "No Discord installation selected."
    }

    Set-Progress -Percent 0
    if ($ActionMode -eq "Install") {
        Set-Status -Message "Preparing installation..."
        $loaderPath = Resolve-LoaderPath -SelectedSource $ActionSource

        $i = 0
        foreach ($target in $Targets) {
            $i++
            Set-Status -Message ("Patching {0} ({1}/{2})" -f $target.Name, $i, $Targets.Count)
            Write-Log -Message ("Patching {0}..." -f $target.Name)
            Patch-DiscordInstall -Install $target -LoaderPath $loaderPath
            Write-Log -Message ("Patched {0}." -f $target.Name) -Color ([System.Drawing.Color]::FromArgb(137, 231, 181))
            $value = [int][Math]::Floor(($i / [double]$Targets.Count) * 100)
            Set-Progress -Percent $value
        }

        Set-Status -Message "Install complete."
        Write-Log -Message "NullCord installation completed." -Color ([System.Drawing.Color]::FromArgb(137, 231, 181))
        Set-Progress -Percent 100
        return
    }

    $i = 0
    foreach ($target in $Targets) {
        $i++
        Set-Status -Message ("Removing from {0} ({1}/{2})" -f $target.Name, $i, $Targets.Count)
        Write-Log -Message ("Removing from {0}..." -f $target.Name)
        $changed = Unpatch-DiscordInstall -Install $target
        if ($changed) {
            Write-Log -Message ("Removed from {0}." -f $target.Name) -Color ([System.Drawing.Color]::FromArgb(255, 210, 120))
        }
        else {
            Write-Log -Message ("Nothing to remove for {0}." -f $target.Name)
        }
        $value = [int][Math]::Floor(($i / [double]$Targets.Count) * 100)
        Set-Progress -Percent $value
    }

    Set-Status -Message "Uninstall complete."
    Write-Log -Message "NullCord uninstall completed." -Color ([System.Drawing.Color]::FromArgb(255, 210, 120))
    Set-Progress -Percent 100
}

function Invoke-CliMode {
    $installs = Get-DiscordInstallations
    if (-not $installs -or $installs.Count -eq 0) {
        Write-Host "No Discord installation found under LOCALAPPDATA."
        exit 1
    }

    try {
        Invoke-InstallerAction -ActionMode $Mode -ActionSource $Source -Targets $installs
    }
    catch {
        Write-Host "Installer failed: $($_.Exception.Message)"
        exit 1
    }
}

function New-Gui {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    [System.Windows.Forms.Application]::EnableVisualStyles()

    $bg = [System.Drawing.Color]::FromArgb(10, 17, 29)
    $panelBg = [System.Drawing.Color]::FromArgb(17, 28, 44)
    $panelAlt = [System.Drawing.Color]::FromArgb(14, 24, 38)
    $inputBg = [System.Drawing.Color]::FromArgb(11, 20, 33)
    $textMain = [System.Drawing.Color]::FromArgb(238, 245, 255)
    $textSub = [System.Drawing.Color]::FromArgb(154, 178, 205)
    $accent = [System.Drawing.Color]::FromArgb(92, 184, 255)
    $accentSoft = [System.Drawing.Color]::FromArgb(100, 225, 255)
    $warn = [System.Drawing.Color]::FromArgb(255, 196, 138)

    $form = New-Object System.Windows.Forms.Form
    $form.Text = "NullCord Installer"
    $form.Size = New-Object System.Drawing.Size(1000, 720)
    $form.MinimumSize = New-Object System.Drawing.Size(1000, 720)
    $form.MaximumSize = New-Object System.Drawing.Size(1000, 720)
    $form.StartPosition = "CenterScreen"
    $form.FormBorderStyle = "None"
    $form.MaximizeBox = $false
    $form.MinimizeBox = $false
    $form.BackColor = $bg
    $form.ForeColor = $textMain
    $form.ShowIcon = $true
    $form.ShowInTaskbar = $true

    $formIcon = Get-InstallerIcon
    if ($formIcon) { $form.Icon = $formIcon }

    $header = New-Object System.Windows.Forms.Panel
    $header.Location = New-Object System.Drawing.Point(0, 0)
    $header.Size = New-Object System.Drawing.Size(1000, 56)
    $header.BackColor = [System.Drawing.Color]::FromArgb(11, 31, 57)
    $form.Controls.Add($header)

    $brandIcon = New-Object System.Windows.Forms.PictureBox
    $brandIcon.Location = New-Object System.Drawing.Point(14, 12)
    $brandIcon.Size = New-Object System.Drawing.Size(32, 32)
    $brandIcon.SizeMode = "Zoom"
    if ($formIcon) { $brandIcon.Image = $formIcon.ToBitmap() }
    $header.Controls.Add($brandIcon)

    $brandText = New-Object System.Windows.Forms.Label
    $brandText.Text = "NullCord"
    $brandText.Font = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
    $brandText.Location = New-Object System.Drawing.Point(54, 12)
    $brandText.Size = New-Object System.Drawing.Size(200, 32)
    $brandText.ForeColor = $textMain
    $header.Controls.Add($brandText)

    $header.Add_MouseDown({ Start-WindowDrag -Form $form })
    $brandText.Add_MouseDown({ Start-WindowDrag -Form $form })
    $brandIcon.Add_MouseDown({ Start-WindowDrag -Form $form })

    $githubButton = New-Object System.Windows.Forms.Button
    $githubButton.Text = "GitHub"
    $githubButton.Location = New-Object System.Drawing.Point(800, 14)
    $githubButton.Size = New-Object System.Drawing.Size(112, 28)
    $githubButton.BackColor = [System.Drawing.Color]::FromArgb(20, 44, 76)
    $githubButton.ForeColor = $textMain
    $githubButton.FlatStyle = "Flat"
    $githubButton.FlatAppearance.BorderSize = 0
    $header.Controls.Add($githubButton)

    $minButton = New-Object System.Windows.Forms.Button
    $minButton.Text = "-"
    $minButton.Location = New-Object System.Drawing.Point(920, 14)
    $minButton.Size = New-Object System.Drawing.Size(36, 28)
    $minButton.BackColor = [System.Drawing.Color]::FromArgb(20, 44, 76)
    $minButton.ForeColor = $textMain
    $minButton.FlatStyle = "Flat"
    $minButton.FlatAppearance.BorderSize = 0
    $header.Controls.Add($minButton)

    $closeButton = New-Object System.Windows.Forms.Button
    $closeButton.Text = "X"
    $closeButton.Location = New-Object System.Drawing.Point(962, 14)
    $closeButton.Size = New-Object System.Drawing.Size(24, 28)
    $closeButton.BackColor = [System.Drawing.Color]::FromArgb(20, 44, 76)
    $closeButton.ForeColor = $textMain
    $closeButton.FlatStyle = "Flat"
    $closeButton.FlatAppearance.BorderSize = 0
    $header.Controls.Add($closeButton)

    $setHeaderButtonGlow = {
        param(
            [System.Windows.Forms.Button]$Button,
            [System.Drawing.Color]$BaseBack,
            [System.Drawing.Color]$GlowBack
        )

        $Button.Add_MouseEnter({
                $this.BackColor = $GlowBack
            })

        $Button.Add_MouseLeave({
                $this.BackColor = $BaseBack
            })
    }

    $baseHeaderBack = [System.Drawing.Color]::FromArgb(20, 44, 76)
    $glowHeaderBack = [System.Drawing.Color]::FromArgb(38, 74, 122)

    & $setHeaderButtonGlow $githubButton $baseHeaderBack $glowHeaderBack
    & $setHeaderButtonGlow $minButton $baseHeaderBack $glowHeaderBack
    & $setHeaderButtonGlow $closeButton $baseHeaderBack ([System.Drawing.Color]::FromArgb(96, 46, 62))

    $hero = New-Object System.Windows.Forms.Panel
    $hero.Location = New-Object System.Drawing.Point(24, 72)
    $hero.Size = New-Object System.Drawing.Size(620, 160)
    $hero.BackColor = $panelAlt
    $hero.BorderStyle = "None"
    $form.Controls.Add($hero)

    $eyebrow = New-Object System.Windows.Forms.Label
    $eyebrow.Text = "DISCORD CLIENT MOD  -  OFFICIAL INSTALLER"
    $eyebrow.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
    $eyebrow.Location = New-Object System.Drawing.Point(16, 14)
    $eyebrow.Size = New-Object System.Drawing.Size(420, 20)
    $eyebrow.ForeColor = $textSub
    $hero.Controls.Add($eyebrow)

    $headlineTop = New-Object System.Windows.Forms.Label
    $headlineTop.Text = "The Dark"
    $headlineTop.Font = New-Object System.Drawing.Font("Bahnschrift SemiBold", 24, [System.Drawing.FontStyle]::Bold)
    $headlineTop.Location = New-Object System.Drawing.Point(16, 34)
    $headlineTop.Size = New-Object System.Drawing.Size(280, 40)
    $headlineTop.ForeColor = $accentSoft
    $hero.Controls.Add($headlineTop)

    $headlineBottom = New-Object System.Windows.Forms.Label
    $headlineBottom.Text = "NullCord mod"
    $headlineBottom.Font = New-Object System.Drawing.Font("Bahnschrift SemiBold", 34, [System.Drawing.FontStyle]::Bold)
    $headlineBottom.Location = New-Object System.Drawing.Point(16, 80)
    $headlineBottom.Size = New-Object System.Drawing.Size(400, 52)
    $headlineBottom.ForeColor = $textMain
    $hero.Controls.Add($headlineBottom)

    $subline = New-Object System.Windows.Forms.Label
    $subline.Text = "Plugins, themes and a whole lot of blue. Patch your Discord in seconds."
    $subline.Font = New-Object System.Drawing.Font("Segoe UI", 11)
    $subline.Location = New-Object System.Drawing.Point(16, 130)
    $subline.Size = New-Object System.Drawing.Size(560, 24)
    $subline.ForeColor = $textSub
    $hero.Controls.Add($subline)

    $leftCard = New-Object System.Windows.Forms.Panel
    $leftCard.Location = New-Object System.Drawing.Point(24, 246)
    $leftCard.Size = New-Object System.Drawing.Size(620, 422)
    $leftCard.BackColor = $panelBg
    $leftCard.BorderStyle = "None"
    $form.Controls.Add($leftCard)

    $targetLabel = New-Object System.Windows.Forms.Label
    $targetLabel.Text = "Choose which Discord to patch"
    $targetLabel.Font = New-Object System.Drawing.Font("Segoe UI", 13, [System.Drawing.FontStyle]::Bold)
    $targetLabel.Location = New-Object System.Drawing.Point(16, 12)
    $targetLabel.Size = New-Object System.Drawing.Size(320, 26)
    $targetLabel.ForeColor = $accent
    $leftCard.Controls.Add($targetLabel)

    $refreshButton = New-Object System.Windows.Forms.Button
    $refreshButton.Text = "Refresh targets"
    $refreshButton.Location = New-Object System.Drawing.Point(468, 10)
    $refreshButton.Size = New-Object System.Drawing.Size(134, 30)
    $refreshButton.BackColor = [System.Drawing.Color]::FromArgb(24, 42, 64)
    $refreshButton.ForeColor = $accentSoft
    $refreshButton.FlatStyle = "Flat"
    $refreshButton.FlatAppearance.BorderSize = 0
    $leftCard.Controls.Add($refreshButton)

    $targetRows = New-Object System.Windows.Forms.FlowLayoutPanel
    $targetRows.Location = New-Object System.Drawing.Point(16, 48)
    $targetRows.Size = New-Object System.Drawing.Size(586, 110)
    $targetRows.BackColor = $inputBg
    $targetRows.BorderStyle = "None"
    $targetRows.FlowDirection = "TopDown"
    $targetRows.WrapContents = $false
    $targetRows.AutoScroll = $true
    $leftCard.Controls.Add($targetRows)

    $creatorLabel = New-Object System.Windows.Forms.Label
    $creatorLabel.Text = "Creator code (optional)"
    $creatorLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
    $creatorLabel.Location = New-Object System.Drawing.Point(16, 168)
    $creatorLabel.Size = New-Object System.Drawing.Size(240, 22)
    $creatorLabel.ForeColor = $accentSoft
    $leftCard.Controls.Add($creatorLabel)

    $creatorBox = New-Object System.Windows.Forms.TextBox
    $creatorBox.Location = New-Object System.Drawing.Point(16, 192)
    $creatorBox.Size = New-Object System.Drawing.Size(586, 32)
    $creatorBox.BackColor = [System.Drawing.Color]::FromArgb(9, 26, 44)
    $creatorBox.ForeColor = $textMain
    $creatorBox.BorderStyle = "None"
    $leftCard.Controls.Add($creatorBox)

    $logBox = New-Object System.Windows.Forms.RichTextBox
    $logBox.Location = New-Object System.Drawing.Point(16, 228)
    $logBox.Size = New-Object System.Drawing.Size(586, 78)
    $logBox.BackColor = $inputBg
    $logBox.ForeColor = [System.Drawing.Color]::FromArgb(216, 228, 242)
    $logBox.Font = New-Object System.Drawing.Font("Consolas", 9.5)
    $logBox.ReadOnly = $true
    $logBox.BorderStyle = "None"
    $leftCard.Controls.Add($logBox)

    $progressBar = New-Object System.Windows.Forms.ProgressBar
    $progressBar.Location = New-Object System.Drawing.Point(16, 312)
    $progressBar.Size = New-Object System.Drawing.Size(586, 12)
    $progressBar.Style = "Continuous"
    $leftCard.Controls.Add($progressBar)

    $statusLabel = New-Object System.Windows.Forms.Label
    $statusLabel.Text = "Ready"
    $statusLabel.Location = New-Object System.Drawing.Point(16, 326)
    $statusLabel.Size = New-Object System.Drawing.Size(586, 20)
    $statusLabel.ForeColor = $textSub
    $leftCard.Controls.Add($statusLabel)

    $installButton = New-Object System.Windows.Forms.Button
    $installButton.Text = "Install / Update"
    $installButton.Location = New-Object System.Drawing.Point(16, 348)
    $installButton.Size = New-Object System.Drawing.Size(586, 32)
    $installButton.BackColor = [System.Drawing.Color]::FromArgb(52, 194, 255)
    $installButton.ForeColor = [System.Drawing.Color]::White
    $installButton.FlatStyle = "Flat"
    $installButton.FlatAppearance.BorderSize = 0
    $installButton.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(127, 214, 255)
    $leftCard.Controls.Add($installButton)

    $repairButton = New-Object System.Windows.Forms.Button
    $repairButton.Text = "Reinstall / Repair"
    $repairButton.Location = New-Object System.Drawing.Point(16, 386)
    $repairButton.Size = New-Object System.Drawing.Size(188, 28)
    $repairButton.BackColor = [System.Drawing.Color]::FromArgb(24, 42, 64)
    $repairButton.ForeColor = $textMain
    $repairButton.FlatStyle = "Flat"
    $repairButton.FlatAppearance.BorderSize = 0
    $repairButton.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(66, 122, 178)
    $leftCard.Controls.Add($repairButton)

    $brandButton = New-Object System.Windows.Forms.Button
    $brandButton.Text = "NullCord"
    $brandButton.Location = New-Object System.Drawing.Point(216, 386)
    $brandButton.Size = New-Object System.Drawing.Size(188, 28)
    $brandButton.BackColor = [System.Drawing.Color]::FromArgb(22, 58, 76)
    $brandButton.ForeColor = [System.Drawing.Color]::FromArgb(130, 235, 213)
    $brandButton.FlatStyle = "Flat"
    $brandButton.FlatAppearance.BorderSize = 0
    $brandButton.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(82, 162, 178)
    $leftCard.Controls.Add($brandButton)

    $uninstallButton = New-Object System.Windows.Forms.Button
    $uninstallButton.Text = "Uninstall"
    $uninstallButton.Location = New-Object System.Drawing.Point(414, 386)
    $uninstallButton.Size = New-Object System.Drawing.Size(188, 28)
    $uninstallButton.BackColor = [System.Drawing.Color]::FromArgb(24, 42, 64)
    $uninstallButton.ForeColor = $warn
    $uninstallButton.FlatStyle = "Flat"
    $uninstallButton.FlatAppearance.BorderSize = 0
    $uninstallButton.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(66, 122, 178)
    $leftCard.Controls.Add($uninstallButton)

    $rightCard = New-Object System.Windows.Forms.Panel
    $rightCard.Location = New-Object System.Drawing.Point(662, 72)
    $rightCard.Size = New-Object System.Drawing.Size(312, 300)
    $rightCard.BackColor = $panelBg
    $rightCard.BorderStyle = "None"
    $form.Controls.Add($rightCard)

    $previewTitle = New-Object System.Windows.Forms.Label
    $previewTitle.Text = "NullCord Info"
    $previewTitle.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $previewTitle.Location = New-Object System.Drawing.Point(14, 12)
    $previewTitle.Size = New-Object System.Drawing.Size(180, 24)
    $previewTitle.ForeColor = $accentSoft
    $rightCard.Controls.Add($previewTitle)

    $previewPanel = New-Object System.Windows.Forms.Panel
    $previewPanel.Location = New-Object System.Drawing.Point(14, 40)
    $previewPanel.Size = New-Object System.Drawing.Size(282, 244)
    $previewPanel.BackColor = $inputBg
    $previewPanel.BorderStyle = "None"
    $rightCard.Controls.Add($previewPanel)

    $previewImage = New-Object System.Windows.Forms.PictureBox
    $previewImage.Location = New-Object System.Drawing.Point(41, 16)
    $previewImage.Size = New-Object System.Drawing.Size(198, 156)
    $previewImage.SizeMode = "Zoom"
    $previewImage.BackColor = [System.Drawing.Color]::Transparent
    foreach ($imagePath in @((Join-Path $ScriptDir "Logo Trans.ico"), (Join-Path (Join-Path $RepoRoot "installer") "Logo Trans.ico"), (Join-Path $ScriptDir "preview.png"), (Join-Path (Join-Path $RepoRoot "installer") "preview.png"))) {
        if (-not (Test-Path $imagePath)) { continue }
        try {
            $previewImage.Image = [System.Drawing.Image]::FromFile($imagePath)
            break
        }
        catch { }
    }
    if (-not $previewImage.Image -and $formIcon) { $previewImage.Image = $formIcon.ToBitmap() }
    $previewPanel.Controls.Add($previewImage)

    $previewName = New-Object System.Windows.Forms.Label
    $previewName.Text = "NULLCORD"
    $previewName.Font = New-Object System.Drawing.Font("Bahnschrift SemiBold", 18, [System.Drawing.FontStyle]::Bold)
    $previewName.Location = New-Object System.Drawing.Point(64, 188)
    $previewName.Size = New-Object System.Drawing.Size(170, 34)
    $previewName.ForeColor = $accent
    $previewPanel.Controls.Add($previewName)

    $footer = New-Object System.Windows.Forms.Label
    $footer.Text = "NullCord (c) 2026  -  client mods are against Discord's ToS."
    $footer.Font = New-Object System.Drawing.Font("Segoe UI", 8.8)
    $footer.Location = New-Object System.Drawing.Point(24, 666)
    $footer.Size = New-Object System.Drawing.Size(620, 18)
    $footer.ForeColor = [System.Drawing.Color]::FromArgb(122, 144, 168)
    $form.Controls.Add($footer)

    $applyRoundedLayout = {
        Set-RoundedRegion -Control $form -Radius 16
        Set-RoundedRegion -Control $hero -Radius 14
        Set-RoundedRegion -Control $leftCard -Radius 14
        Set-RoundedRegion -Control $rightCard -Radius 14
        Set-RoundedRegion -Control $targetRows -Radius 10
        Set-RoundedRegion -Control $previewPanel -Radius 12
        Set-RoundedRegion -Control $previewImage -Radius 10
        Set-RoundedRegion -Control $logBox -Radius 10
        Set-RoundedRegion -Control $progressBar -Radius 8
        Set-RoundedRegion -Control $installButton -Radius 10
        Set-RoundedRegion -Control $repairButton -Radius 10
        Set-RoundedRegion -Control $brandButton -Radius 10
        Set-RoundedRegion -Control $uninstallButton -Radius 10
        Set-RoundedRegion -Control $refreshButton -Radius 10
        Set-RoundedRegion -Control $creatorBox -Radius 10
        Set-RoundedRegion -Control $githubButton -Radius 10
        Set-RoundedRegion -Control $minButton -Radius 10
        Set-RoundedRegion -Control $closeButton -Radius 10
        Set-RoundedRegion -Control $minButton -Radius 8
        Set-RoundedRegion -Control $closeButton -Radius 8
    }

    $script:Ui = [pscustomobject]@{
        Form            = $form
        TargetRows      = $targetRows
        CreatorCode     = $creatorBox
        InstallButton   = $installButton
        RepairButton    = $repairButton
        BrandButton     = $brandButton
        UninstallButton = $uninstallButton
        RefreshButton   = $refreshButton
        LogBox          = $logBox
        ProgressBar     = $progressBar
        StatusLabel     = $statusLabel
        Installs        = @()
        RowItems        = @()
    }

    $refreshTargets = {
        $script:Ui.TargetRows.Controls.Clear()
        $script:Ui.RowItems = @()
        $script:Ui.Installs = Get-DiscordInstallations

        for ($i = 0; $i -lt $script:Ui.Installs.Count; $i++) {
            $install = $script:Ui.Installs[$i]

            $row = New-Object System.Windows.Forms.Panel
            $row.Size = New-Object System.Drawing.Size(556, 44)
            $row.Margin = New-Object System.Windows.Forms.Padding(8, 6, 8, 0)
            $row.BackColor = [System.Drawing.Color]::FromArgb(20, 34, 53)

            $check = New-Object System.Windows.Forms.CheckBox
            $check.Location = New-Object System.Drawing.Point(10, 12)
            $check.Size = New-Object System.Drawing.Size(18, 18)
            $check.Checked = $true
            $check.ForeColor = $accentSoft
            $row.Controls.Add($check)

            $name = New-Object System.Windows.Forms.Label
            $name.Text = $install.Name
            $name.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
            $name.Location = New-Object System.Drawing.Point(36, 10)
            $name.Size = New-Object System.Drawing.Size(220, 24)
            $name.ForeColor = $textMain
            $row.Controls.Add($name)

            $state = New-Object System.Windows.Forms.Label
            $state.Text = Get-StateLabel -State $install.State
            $state.Font = New-Object System.Drawing.Font("Segoe UI", 9.2, [System.Drawing.FontStyle]::Bold)
            $state.Location = New-Object System.Drawing.Point(374, 10)
            $state.Size = New-Object System.Drawing.Size(170, 24)
            $state.TextAlign = "MiddleCenter"
            $state.AutoSize = $false
            $state.AutoEllipsis = $true
            $state.UseCompatibleTextRendering = $false
            $state.BackColor = if ($install.State -eq "installed") { [System.Drawing.Color]::FromArgb(38, 120, 188) } elseif ($install.State -eq "other") { [System.Drawing.Color]::FromArgb(70, 76, 95) } else { [System.Drawing.Color]::FromArgb(24, 58, 90) }
            $state.ForeColor = if ($install.State -eq "installed") { [System.Drawing.Color]::White } elseif ($install.State -eq "other") { [System.Drawing.Color]::FromArgb(230, 236, 244) } else { $accentSoft }
            $row.Controls.Add($state)

            Set-RoundedRegion -Control $row -Radius 9
            Set-RoundedRegion -Control $state -Radius 9

            [void]$script:Ui.TargetRows.Controls.Add($row)
            $script:Ui.RowItems += [pscustomobject]@{ Install = $install; CheckBox = $check }
        }

        if ($script:Ui.Installs.Count -eq 0) {
            Write-Log -Message "No Discord installation was found under LOCALAPPDATA." -Color ([System.Drawing.Color]::FromArgb(255, 170, 140))
            Set-Status -Message "No Discord install found"
        }
        else {
            Set-Status -Message "Ready"
        }
    }

    $setBusy = {
        param([bool]$Busy)
        $script:Ui.InstallButton.Enabled = -not $Busy
        $script:Ui.RepairButton.Enabled = -not $Busy
        $script:Ui.BrandButton.Enabled = -not $Busy
        $script:Ui.UninstallButton.Enabled = -not $Busy
        $script:Ui.RefreshButton.Enabled = -not $Busy
        foreach ($row in $script:Ui.RowItems) {
            $row.CheckBox.Enabled = -not $Busy
        }
    }

    $getSelectedInstalls = {
        $selected = @()
        foreach ($row in $script:Ui.RowItems) {
            if ($row.CheckBox.Checked) {
                $selected += $row.Install
            }
        }
        return $selected
    }

    $runInstall = {
        $selected = & $getSelectedInstalls
        if ($selected.Count -eq 0) {
            [System.Windows.Forms.MessageBox]::Show("Select at least one Discord target.", "NullCord Installer", "OK", "Warning") | Out-Null
            return
        }

        $sourceMode = "Release"
        & $setBusy $true
        try {
            Invoke-InstallerAction -ActionMode "Install" -ActionSource $sourceMode -Targets $selected
            [System.Windows.Forms.MessageBox]::Show("NullCord install finished.", "NullCord Installer", "OK", "Information") | Out-Null
            & $refreshTargets
        }
        catch {
            Write-Log -Message ("Install failed: {0}" -f $_.Exception.Message) -Color ([System.Drawing.Color]::FromArgb(255, 130, 130))
            Set-Status -Message "Install failed"
            [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, "Install failed", "OK", "Error") | Out-Null
        }
        finally {
            & $setBusy $false
        }
    }

    $installButton.Add_Click($runInstall)
    $repairButton.Add_Click($runInstall)
    $brandButton.Add_Click({
            try { Start-Process "https://github.com/NullCord-Production/NullCord" | Out-Null }
            catch { }
        })

    $uninstallButton.Add_Click({
            $selected = & $getSelectedInstalls
            if ($selected.Count -eq 0) {
                [System.Windows.Forms.MessageBox]::Show("Select at least one Discord target.", "NullCord Installer", "OK", "Warning") | Out-Null
                return
            }

            & $setBusy $true
            try {
                Invoke-InstallerAction -ActionMode "Uninstall" -ActionSource "Release" -Targets $selected
                [System.Windows.Forms.MessageBox]::Show("NullCord uninstall finished.", "NullCord Installer", "OK", "Information") | Out-Null
                & $refreshTargets
            }
            catch {
                Write-Log -Message ("Uninstall failed: {0}" -f $_.Exception.Message) -Color ([System.Drawing.Color]::FromArgb(255, 130, 130))
                Set-Status -Message "Uninstall failed"
                [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, "Uninstall failed", "OK", "Error") | Out-Null
            }
            finally {
                & $setBusy $false
            }
        })

    $refreshButton.Add_Click({ & $refreshTargets })
    $githubButton.Add_Click({
            try { Start-Process "https://github.com/NullCord-Production/NullCord/releases/latest" | Out-Null }
            catch { }
        })
    $minButton.Add_Click({ $form.WindowState = "Minimized" })
    $closeButton.Add_Click({ $form.Close() })

    $form.Add_Shown({ & $applyRoundedLayout })

    & $refreshTargets
    & $applyRoundedLayout
    Write-Log -Message "Installer ready."
    [void]$form.ShowDialog()
}

if ($NoGui) {
    Invoke-CliMode
    exit 0
}

try {
    New-Gui
}
catch {
    Write-Host "GUI failed, falling back to CLI mode: $($_.Exception.Message)"
    $script:NoGuiMode = $true
    Invoke-CliMode
}
finally {
    if ($script:InstallerIconHandle -ne [IntPtr]::Zero) {
        [void][NullCordNative.User32]::DestroyIcon($script:InstallerIconHandle)
    }
    if ($script:InstallerIconBitmap) {
        $script:InstallerIconBitmap.Dispose()
    }
}
