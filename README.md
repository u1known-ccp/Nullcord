<div align="center">
  <a href="https://NullCord.dev">
    <img src="./browser/logo.png" width="440" alt="NullCord">
  </a>
  <p><b>The cutest Discord client mod — plugins, themes and a whole lot of pink.</b></p>
  <p>
    <a href="https://github.com/u1known-ccp/Nullcord/stargazers"><img src="https://img.shields.io/github/stars/u1known-ccp/Nullcord?style=for-the-badge&logo=github&label=stars&color=FF5FA6&labelColor=1f141b" alt="Stars"></a>
    <a href="https://github.com/u1known-ccp/Nullcord/commits/main"><img src="https://img.shields.io/github/last-commit/u1known-ccp/Nullcord?style=for-the-badge&label=updated&color=FF8AC4&labelColor=1f141b" alt="Last commit"></a>
    <a href="./LICENSE"><img src="https://img.shields.io/github/license/u1known-ccp/Nullcord?style=for-the-badge&color=FF8AC4&labelColor=1f141b" alt="License"></a>
  </p>
  <p>
    <a href="https://github.com/NullCord-Production/NullCord/releases/latest"><b>⬇️ Download</b></a>
    &nbsp;·&nbsp;
    <a href="https://NullCord.dev"><b>🐾 NullCord.dev</b></a>
    &nbsp;·&nbsp;
    <a href="#-features"><b>🌸 Features</b></a>
    &nbsp;·&nbsp;
    <a href="#-faq--troubleshooting"><b>❓ FAQ</b></a>
  </p>
  <p>
    <a href="./LICENSE"><b>License</b></a>
    &nbsp;·&nbsp;
    <a href="https://github.com/u1known-ccp/Nullcord/stargazers"><b>Stars</b></a>
  </p>
</div>

NullCord is a Discord client modification — a plugin and theme platform that adds hundreds of
features to Discord while keeping it lightweight and privacy-friendly.

## 🖼️ Installer Preview

![NullCord Installer Preview](installer/preview.png)

## 🌸 Features

- **350+ built-in plugins** covering chat, appearance, voice, moderation and utility — toggle
  anything on or off in seconds, no extra downloads needed.
- **Themes & QuickCSS** — restyle your whole client, or live-edit your own CSS right inside
  Discord.
- **NullCord exclusives** — Modes (one-click setting profiles), Quiet Hours, Message Tags,
  Settings Sharing with friends, and the NullCord Toolbox.
- **Custom plugin folder** — drop in your own plugins and they build right alongside the
  built-in ones.
- **Safe auto-updates** — NullCord keeps itself current in the background, and every download
  is verified against a published SHA-256 checksum before it's applied.
- **A cute installer in your language** — English, Deutsch, Español, Français and Русский,
  auto-detected from your system.

## 📦 Installing

> **Requirements:** Windows 10 (1803+) or 11, the standard Discord app from
> [discord.com](https://discord.com/download) (launched once), and an internet connection.
> Nothing extra to install — everything the installer needs ships with Windows.

1. **Download** [`NullCord-Installer.exe`](https://github.com/NullCord-Production/NullCord/releases/latest)
   from the latest release.
2. **Run it**, pick your Discord install and click **Install**. (Windows SmartScreen may warn
   because the exe is unsigned — click **"More info" → "Run anyway"**.)
3. **Done!** Discord restarts on its own and comes back patched, pink and purring.

To uninstall, run the installer again and click **Uninstall** — it restores a completely clean
Discord. See [installer/README.md](installer/README.md) for all the details and console
alternatives.

> A standalone NullCord desktop client and Mac/Linux installers are on the roadmap. On other
> platforms, use the developer build below.

## ❓ FAQ & Troubleshooting

<details>
<summary><b>Windows / my antivirus warns about the installer</b></summary>

The exe is not code-signed (certificates are expensive), so SmartScreen shows "Windows protected
your PC" on first run — click **"More info" → "Run anyway"**. Some antivirus tools flag it for
the same reason; the installer is open source (see [installer/](installer/)) and every release
is built automatically from this repository by CI, so you can verify exactly what it does.
</details>

<details>
<summary><b>Discord updated and NullCord is gone</b></summary>

Big Discord host updates occasionally replace the patched files. Just run
`NullCord-Installer.exe` again and click **Reinstall / Repair** — your plugins, themes and
settings are kept.
</details>

<details>
<summary><b>The installer says my Discord can't be patched</b></summary>

The **Microsoft Store** version of Discord is sandboxed and can't be modified. Uninstall it,
install Discord from [discord.com/download](https://discord.com/download), launch it once, then
run the installer again.
</details>

<details>
<summary><b>Will I get banned for using this?</b></summary>

Client mods are against Discord's Terms of Service, but there are no known cases of bans just
for using them — see the [disclaimer](#%EF%B8%8F-disclaimer) below for the honest version.
</details>

## 🛠️ Developer Build

<details>
<summary>Build and install NullCord from source</summary>

### Dependencies

[Git](https://git-scm.com/download) and [Node.JS LTS](https://nodejs.dev/en/) are required.

Install `pnpm`:

> :exclamation: This next command may need to be run as admin/root depending on your system, and you may need to close and reopen your terminal for pnpm to be in your PATH.

```shell
npm i -g pnpm
```

> :exclamation: **IMPORTANT** Make sure you aren't using an admin/root terminal from here onwards. It **will** mess up your Discord/NullCord instance and you **will** most likely have to reinstall.

Clone NullCord:

```shell
git clone https://github.com/NullCord-Production/NullCord
cd NullCord
```

Install dependencies:

```shell
pnpm install --frozen-lockfile
```

Build NullCord:

```shell
pnpm build
```

Inject your local build into the Discord desktop client (Windows):

```shell
powershell -ExecutionPolicy Bypass -File .\installer\NullCord-Installer.ps1 -NoGui -Mode Install -Source Local
```

Start Discord again and the NullCord settings section appears. Re-run the script after
`pnpm build` whenever you want your latest changes in the client; revert everything with
`installer\NullCord-Installer.ps1 -NoGui -Mode Uninstall`.

### Web extension / userscript

```shell
pnpm buildWeb
```

After building, locate the appropriate ZIP file in the `dist` directory and follow your
browser's guide for installing custom extensions, if supported.

Note: The Firefox extension zip requires Firefox for Developers.

</details>

## ⚠️ Disclaimer

Discord is a trademark of Discord Inc., and is solely mentioned here for the sake of descriptivity.
Mentioning it does not imply any affiliation with or endorsement by Discord Inc.

<details>
<summary>Using NullCord violates Discord's terms of service</summary>

Client modifications are against Discord’s Terms of Service.

However, Discord is pretty indifferent about them and there are no known cases of users getting banned for using client mods! So you should generally be fine if you don’t use plugins that implement abusive behaviour. But no worries, all inbuilt plugins are safe to use!

Regardless, if your account is essential to you and getting disabled would be a disaster for you, you should probably not use any client mods (not exclusive to NullCord), just to be safe.

Additionally, make sure not to post screenshots with NullCord in a server where you might get banned for it.

</details>

