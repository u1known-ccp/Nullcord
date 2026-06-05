# Kittycord Windows Installer

There are two installers:

| Script | For whom | What it does |
|---|---|---|
| `Kittycord-Online-Install.ps1` | **End users** (compiled to `Kittycord-Installer.exe` by CI) | Downloads the latest `desktop.asar` from GitHub Releases and patches Discord. No repo/pnpm needed. |
| `Kittycord-Install.ps1` | **Developers** | Patches Discord to load your local `dist/desktop` build (run `pnpm build` first). |

`Kittycord-Uninstall.ps1` reverts either one.

## Easiest: prebuilt `.exe`

![Kittycord Installer](preview.png)

Download **`Kittycord-Installer.exe`** from the
[latest release](https://github.com/CenturyRV/Kittycord/releases/latest), run it (not as Admin),
pick your Discord install and click **Install**, then start Discord. The graphical installer
downloads the latest build and patches Discord (and cleanly takes over an install that another mod
patched). It is produced automatically by [.github/workflows/release.yml](../.github/workflows/release.yml).

> The `.exe` is unsigned, so Windows SmartScreen may warn on first run — choose
> "More info" → "Run anyway".

## Developer install (from source)

1. Build Kittycord once so the output exists:
   ```powershell
   pnpm install
   pnpm build
   ```
2. Run the installer (do **not** use an Administrator terminal):
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\installer\Kittycord-Install.ps1
   ```
3. Start Discord again. You should see the Kittycord settings section.

It patches Discord Stable, PTB and Canary if found, backing up the original `app.asar` as
`_app.asar` and injecting an `app/` folder that loads `dist/desktop/patcher.js` (with an automatic
fallback to vanilla Discord if the patcher ever fails to load).

## Uninstall

```powershell
powershell -ExecutionPolicy Bypass -File .\installer\Kittycord-Uninstall.ps1
```

This removes the injected `app/` folder and restores the original `app.asar`.

## Notes

- The injected `index.js` references the **absolute path** of this repo's `dist/desktop`. If you
  move the repo, re-run the installer.
- Discord host updates create a new `app-<version>` folder; re-run the installer after a Discord
  update if Kittycord stops loading (a host-update hook handles most cases automatically).
- A standalone, double-clickable installer and a custom client are on the roadmap.
