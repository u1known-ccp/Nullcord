/*
 * Kittycord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType, PluginNative } from "@utils/types";

import { BRAND_ICON } from "../../branding";
import style from "./style.css?managed";

const Native = VencordNative.pluginHelpers.KittyLogo as PluginNative<typeof import("./native")>;
const logger = new Logger("KittyLogo");

function applyAppIcon() {
    if (!IS_DISCORD_DESKTOP || !settings.store.taskbarIcon) return;
    try {
        Native?.applyAppIcon?.()?.catch?.(e => logger.error("Failed to set app icon", e));
    } catch (e) {
        logger.error("Failed to set app icon", e);
    }
}

const settings = definePluginSettings({
    taskbarIcon: {
        type: OptionType.BOOLEAN,
        description: "Also replace the Discord taskbar / app icon with the Kittycord cat (turning it off reverts after a Discord restart)",
        default: true,
        onChange: applyAppIcon
    }
});

export default definePlugin({
    name: "KittyLogo",
    description: "Replaces the Discord logo on the home button with the Kittycord cat, and optionally the taskbar / app icon too.",
    authors: [{ name: "Kittycord", id: 0n }],
    tags: ["Appearance", "Customisation"],
    settings,

    start() {
        document.documentElement.style.setProperty("--kc-logo", `url("${BRAND_ICON}")`);
        enableStyle(style);
        applyAppIcon();
    },

    stop() {
        disableStyle(style);
        document.documentElement.style.removeProperty("--kc-logo");
    }
});
