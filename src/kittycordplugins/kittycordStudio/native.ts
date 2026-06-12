/*
 * Kittycord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ensureSafePath } from "@main/ipcMain";
import { THEMES_DIR } from "@main/utils/constants";
import { IpcMainInvokeEvent } from "electron";
import { existsSync, mkdirSync, writeFileSync } from "fs";

const FILE_NAME_RE = /^Kittycord Studio - [\w\-'!&. ]{1,40}\.theme\.css$/;
const MAX_CSS_BYTES = 200_000;
const MAX_DOWNLOAD_BYTES = 2_000_000;
const ALLOWED_HOST = /^(cdn|media)\.discordapp\.(com|net)$/;

export async function writeTheme(_: IpcMainInvokeEvent, fileName: unknown, css: unknown): Promise<{ ok: true; } | { ok: false; error: string; }> {
    if (typeof fileName !== "string" || !FILE_NAME_RE.test(fileName)) return { ok: false, error: "Invalid theme name." };
    if (typeof css !== "string" || css.length > MAX_CSS_BYTES) return { ok: false, error: "Theme is too large." };

    const path = ensureSafePath(THEMES_DIR, fileName);
    if (!path) return { ok: false, error: "Invalid theme path." };

    try {
        if (!existsSync(THEMES_DIR)) mkdirSync(THEMES_DIR, { recursive: true });
        writeFileSync(path, css, "utf-8");
        return { ok: true };
    } catch {
        return { ok: false, error: "Could not write the theme file." };
    }
}

export async function downloadSetup(_: IpcMainInvokeEvent, url: unknown): Promise<{ ok: true; data: string; } | { ok: false; error: string; }> {
    if (typeof url !== "string") return { ok: false, error: "Bad URL" };

    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return { ok: false, error: "Bad URL" };
    }

    if (parsed.protocol !== "https:" || !ALLOWED_HOST.test(parsed.hostname)) {
        return { ok: false, error: "Blocked host" };
    }

    try {
        const res = await fetch(url);
        if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
        if (Number(res.headers.get("content-length") ?? "0") > MAX_DOWNLOAD_BYTES) return { ok: false, error: "Too large" };

        const data = await res.text();
        if (data.length > MAX_DOWNLOAD_BYTES) return { ok: false, error: "Too large" };

        return { ok: true, data };
    } catch {
        return { ok: false, error: "Download failed" };
    }
}
