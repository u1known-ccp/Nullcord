# NullCord Windows Installer

NullCord now ships one unified installer script:

- `NullCord-Installer.ps1`

The same script supports:

- modern GUI install flow for end users
- release install from GitHub
- local developer install from `dist/desktop/patcher.js`
- uninstall/revert mode

## GUI usage (end users)

Download `NullCord-Installer.exe` from the
[latest release](https://github.com/NullCord-Production/NullCord/releases/latest), run it, select your
Discord install and click `Install / Repair`.

The GUI installer will:

- download the latest `desktop.asar`
- verify SHA-256 when available
- back up Discord's original `app.asar` to `_app.asar`
- inject a clean `app/` loader

## CLI usage

Install from release build:

```powershell
powershell -ExecutionPolicy Bypass -File .\installer\NullCord-Installer.ps1 -NoGui -Mode Install -Source Release
```

Install from local developer build:

```powershell
pnpm build
powershell -ExecutionPolicy Bypass -File .\installer\NullCord-Installer.ps1 -NoGui -Mode Install -Source Local
```

Uninstall and restore vanilla Discord:

```powershell
powershell -ExecutionPolicy Bypass -File .\installer\NullCord-Installer.ps1 -NoGui -Mode Uninstall
```

## Notes

- Supported targets: Discord Stable, PTB, Canary.
- Microsoft Store Discord is not supported for patching.
- You do not need Administrator rights.
- If Discord updates and creates a new `app-*` directory, run install again.

