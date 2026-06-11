/*
 * Kittycord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addMessagePreSendListener, MessageSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

const MAX_LENGTH = 2000;

const settings = definePluginSettings({
    text: {
        type: OptionType.STRING,
        description: "The signature added to the end of your messages",
        default: ""
    },
    subtext: {
        type: OptionType.BOOLEAN,
        description: "Show the signature as small grey subtext (-#)",
        default: true
    }
});

const onSend: MessageSendListener = (_, msg) => {
    const text = settings.store.text.trim();
    if (!text || !msg.content.trim()) return;

    const suffix = `\n${settings.store.subtext ? "-# " : ""}${text}`;
    if (msg.content.length + suffix.length > MAX_LENGTH) return;

    msg.content += suffix;
};

export default definePlugin({
    name: "Signature",
    description: "Automatically adds your own signature line to the end of every message you send.",
    authors: [{ name: "Kittycord", id: 0n }],
    tags: ["Chat", "Customisation"],
    settings,

    start() {
        addMessagePreSendListener(onSend);
    },

    stop() {
        removeMessagePreSendListener(onSend);
    }
});
