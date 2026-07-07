/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface AccentPreset {
    accent: string;
    soft: string;
    glow: string;
    logoFilter: string;
}

export const ACCENT_PRESETS = {
    pink: { accent: "#ff5fa6", soft: "#ff8ac4", glow: "255 95 166", logoFilter: "none" },
    blue: { accent: "#5fa8ff", soft: "#8ac4ff", glow: "95 168 255", logoFilter: "hue-rotate(-117deg)" },
    purple: { accent: "#a06bff", soft: "#c4a8ff", glow: "160 107 255", logoFilter: "hue-rotate(-69deg)" },
    green: { accent: "#3ecf8e", soft: "#7ce3b3", glow: "62 207 142", logoFilter: "hue-rotate(-177deg)" },
    red: { accent: "#ff5f5f", soft: "#ff8a8a", glow: "255 95 95", logoFilter: "hue-rotate(30deg)" },
    mono: { accent: "#b8bcc8", soft: "#d7dae2", glow: "184 188 200", logoFilter: "saturate(0)" }
} satisfies Record<string, AccentPreset>;

export type NullCordAccent = keyof typeof ACCENT_PRESETS;

