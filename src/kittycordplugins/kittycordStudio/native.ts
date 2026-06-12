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
