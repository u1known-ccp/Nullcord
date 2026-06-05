/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import definePlugin, { OptionType } from "@utils/types";

import style from "./style.css?managed";

const settings = definePluginSettings({
    rounded: {
        type: OptionType.BOOLEAN,
        description: "Extra rounded, soft corners everywhere",
        default: true,
        onChange: applyClasses
    },
    pinkScrollbars: {
        type: OptionType.BOOLEAN,
        description: "Pink scrollbars",
        default: true,
        onChange: applyClasses
    }
});

function applyClasses() {
    const root = document.documentElement;
    root.classList.toggle("kc-hellokitty-rounded", settings.store.rounded);
    root.classList.toggle("kc-hellokitty-pinkbars", settings.store.pinkScrollbars);
}

export default definePlugin({
    name: "HelloKittyTheme",
    description: "A cute pink, kawaii Kittycord theme. Soft pinks, rounded corners and pink scrollbars.",
    authors: [{ name: "Kittycord", id: 0n }],
    tags: ["Appearance", "Customisation"],
    settings,

    start() {
        enableStyle(style);
        applyClasses();
    },

    stop() {
        disableStyle(style);
        document.documentElement.classList.remove("kc-hellokitty-rounded", "kc-hellokitty-pinkbars");
    }
});
