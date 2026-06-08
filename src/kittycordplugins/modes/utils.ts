/*
 * Kittycord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { get, set } from "@api/DataStore";
import { isPluginEnabled, pluginRequiresRestart, plugins, startPlugin, stopPlugin } from "@api/PluginManager";
import { Settings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";

export type StatusValue = "online" | "idle" | "dnd" | "invisible";

interface CustomStatusSettingValue {
    text: string;
    emojiId: string;
    emojiName: string;
    expiresAtMs: string;
}

const StatusSetting = getUserSettingLazy<StatusValue>("status", "status");
const CustomStatusSetting = getUserSettingLazy<CustomStatusSettingValue | null>("status", "customStatus");

export interface ModeCustomStatus {
    text: string;
    emojiName?: string;
}

export interface Mode {
    id: string;
    name: string;
    emoji?: string;
    status?: StatusValue;
    customStatus?: ModeCustomStatus | null;
    themes?: string[];
    plugins?: Record<string, boolean>;
}

interface Stored {
    modes: Mode[];
    activeId: string | null;
}

const KEY = "Kittycord_Modes";

let modes: Mode[] = [];
let activeId: string | null = null;

export const getModes = () => modes;
export const getActiveId = () => activeId;
export const currentThemes = () => [...Settings.enabledThemes];

export async function loadModes() {
    const data = await get<Stored>(KEY);
    modes = data?.modes ?? [];
    activeId = data?.activeId ?? null;
}

async function persist() {
    await set(KEY, { modes, activeId } satisfies Stored);
}

export async function saveMode(mode: Mode) {
    const existing = modes.findIndex(m => m.id === mode.id);
    if (existing === -1) modes = [...modes, mode];
    else modes = modes.map(m => (m.id === mode.id ? mode : m));
    await persist();
}

export async function deleteMode(id: string) {
    modes = modes.filter(m => m.id !== id);
    if (activeId === id) activeId = null;
    await persist();
}

export function newMode(name: string): Mode {
    return { id: crypto.randomUUID(), name, plugins: {} };
}

export function captureInto(mode: Mode): Mode {
    const status = StatusSetting?.getSetting?.();
    const cs = CustomStatusSetting?.getSetting?.();
    return {
        ...mode,
        status: status ?? mode.status,
        customStatus: cs?.text ? { text: cs.text, emojiName: cs.emojiName || undefined } : mode.customStatus,
        themes: currentThemes()
    };
}

export function getTogglablePlugins(): { value: string; label: string; }[] {
    return Object.values(plugins)
        .filter(p => !p.required && !p.name.endsWith("API") && p.name !== "Modes")
        .map(p => ({ value: p.name, label: p.name }))
        .sort((a, b) => a.label.localeCompare(b.label));
}

export async function applyMode(mode: Mode): Promise<{ restartNeeded: boolean; }> {
    let restartNeeded = false;

    if (mode.status && StatusSetting) await StatusSetting.updateSetting(mode.status);

    if (mode.customStatus !== undefined && CustomStatusSetting) {
        const cs = mode.customStatus;
        await CustomStatusSetting.updateSetting(cs
            ? { text: cs.text, emojiName: cs.emojiName ?? "", emojiId: "0", expiresAtMs: "0" }
            : null);
    }

    if (mode.themes) Settings.enabledThemes = [...mode.themes];

    if (mode.plugins) {
        for (const [name, want] of Object.entries(mode.plugins)) {
            const p = plugins[name];
            if (!p || p.required) continue;
            if (isPluginEnabled(name) === want) continue;

            Settings.plugins[name].enabled = want;
            if (pluginRequiresRestart(p)) restartNeeded = true;
            else if (!(want ? startPlugin(p) : stopPlugin(p))) restartNeeded = true;
        }
    }

    activeId = mode.id;
    await persist();
    return { restartNeeded };
}
