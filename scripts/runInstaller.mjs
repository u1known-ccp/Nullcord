/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import "./checkNodeVersion.js";

import { execFileSync } from "child_process";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const BASE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");

const uninstall = process.argv.includes("--uninstall");

if (process.platform !== "win32") {
    console.error("pnpm inject currently supports Windows only. Mac/Linux developer installs are on the roadmap.");
    console.error("See installer/README.md for details.");
    process.exit(1);
}

if (!uninstall && !existsSync(join(BASE_DIR, "dist", "desktop", "patcher.js"))) {
    console.error("Build output not found. Run 'pnpm build' first, then re-run 'pnpm inject'.");
    process.exit(1);
}

const script = join(BASE_DIR, "installer", "NullCord-Installer.ps1");
const args = [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    script,
    "-NoGui",
    "-Mode",
    uninstall ? "Uninstall" : "Install",
    "-Source",
    "Local"
];

try {
    execFileSync("powershell.exe", args, { stdio: "inherit" });
} catch {
    process.exitCode = 1;
}

