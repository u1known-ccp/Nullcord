/*
 * Kittycord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";

import { loadThemes } from "./store";
import { openStudio } from "./StudioModal";

export default definePlugin({
    name: "KittycordStudio",
    description: "Build your own Discord theme from a few colors — pick a palette, roundness and sparkles, and Kittycord generates and applies the theme for you. No CSS needed.",
    authors: [{ name: "Kittycord", id: 0n }],
    tags: ["Appearance"],
    enabledByDefault: true,

    toolboxActions: {
        "Open Studio"() {
            openStudio();
        }
    },

    async start() {
        await loadThemes();
    }
});
