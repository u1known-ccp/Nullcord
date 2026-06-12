/*
 * Kittycord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { get, set } from "@api/DataStore";
import { Settings } from "@api/Settings";
import type { PluginNative } from "@utils/types";

import { generateCss, type StudioParams, themeFileName } from "./template";

const KEY = "Kittycord_StudioThemes";

const Native = VencordNative?.pluginHelpers?.KittycordStudio as PluginNative<typeof import("./native")> | undefined;

let themes: Record<string, StudioParams> = {};
let loaded = false;

export async function loadThemes(): Promise<Record<string, StudioParams>> {
    if (!loaded) {
        themes = (await get<Record<string, StudioParams>>(KEY)) ?? {};
        loaded = true;
    }
    return themes;
}

export const getThemes = () => themes;

async function persist() {
    await set(KEY, themes);
}

async function writeThemeFile(fileName: string, css: string) {
    if (Native) {
        const result = await Native.writeTheme(fileName, css);
        if (!result.ok) throw new Error(result.error);
    } else {
        await VencordNative.themes.uploadTheme(fileName, css);
    }
}

export async function saveTheme(params: StudioParams, previousFileName?: string): Promise<string> {
    const fileName = themeFileName(params);

    if (previousFileName && previousFileName !== fileName) {
        await removeTheme(previousFileName);
    }

    await writeThemeFile(fileName, generateCss(params));
    themes = { ...themes, [fileName]: params };
    await persist();
    return fileName;
}

export async function removeTheme(fileName: string) {
    try {
        await VencordNative.themes.deleteTheme(fileName);
    } catch { }
    Settings.enabledThemes = Settings.enabledThemes.filter(t => t !== fileName);
    const { [fileName]: _, ...rest } = themes;
    themes = rest;
    await persist();
}

export function enableTheme(fileName: string) {
    if (!Settings.enabledThemes.includes(fileName))
        Settings.enabledThemes = [...Settings.enabledThemes, fileName];
}

export const isThemeEnabled = (fileName: string) => Settings.enabledThemes.includes(fileName);
