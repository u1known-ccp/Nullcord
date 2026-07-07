/*
 * NullCord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addProfileBadge, BadgePosition, ProfileBadge, removeProfileBadge } from "@api/Badges";
import { Logger } from "@utils/Logger";
import definePlugin, { type PluginNative } from "@utils/types";
import { UserStore } from "@webpack/common";

import { BRAND_BADGE_ICON } from "../../branding";

const Native = VencordNative?.pluginHelpers?.UsesNullCord as PluginNative<typeof import("./native")> | undefined;
const logger = new Logger("UsesNullCord");

const NullCordUsers = new Set<string>();
let refreshTimer: ReturnType<typeof setInterval> | null = null;

const UsesNullCordBadge: ProfileBadge = {
    id: "uses-NullCord",
    description: "Uses NullCord",
    iconSrc: BRAND_BADGE_ICON,
    position: BadgePosition.END,
    shouldShow: ({ userId }) => NullCordUsers.has(userId)
};

async function refresh() {
    if (!Native) return;
    const users = await Native.getUsers();
    NullCordUsers.clear();
    for (const id of users) NullCordUsers.add(id);
}

export default definePlugin({
    name: "UsesNullCord",
    description: "Shows a 🐱 “Uses NullCord” badge on everyone who uses NullCord, so you can spot each other anywhere on Discord.",
    authors: [{ name: "NullCord", id: 0n }],
    tags: ["Customisation"],
    enabledByDefault: true,

    async start() {
        addProfileBadge(UsesNullCordBadge);
        try {
            const me = UserStore.getCurrentUser();
            if (me && Native) {
                NullCordUsers.add(me.id);
                await Native.announce(me.id);
            }
            await refresh();
            refreshTimer = setInterval(refresh, 10 * 60 * 1000);
        } catch (e) {
            logger.error("init failed", e);
        }
    },

    stop() {
        removeProfileBadge(UsesNullCordBadge);
        if (refreshTimer) {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }
        NullCordUsers.clear();
    }
});

