/*
 * Kittycord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addProfileBadge, BadgePosition, ProfileBadge, removeProfileBadge } from "@api/Badges";
import { definePluginSettings } from "@api/Settings";
import { Flex } from "@components/Flex";
import definePlugin, { OptionType } from "@utils/types";
import { Button, React, showToast, Text, TextInput, Toasts, Tooltip, UserStore } from "@webpack/common";

interface CustomBadge {
    emoji: string;
    label: string;
}

const Native = VencordNative.kittycordBadges;

const customBadges = new Map<string, CustomBadge>();

const BLOCKLIST = ["discord", "staff", "partner", "moderator", "administrator", "admin", "nitro", "hypesquad", "bughunter", "verified", "official", "activedeveloper", "system"];
const EMOJI_ONLY_RE = /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|[\u{1F1E6}-\u{1F1FF}])+$/u;
const PICTOGRAPHIC_RE = /\p{Extended_Pictographic}/u;

function normalizeLabel(s: string): string {
    return s.toLowerCase()
        .replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s").replace(/7/g, "t")
        .replace(/[^a-z]/g, "");
}

function labelIsClean(label: string): boolean {
    const n = normalizeLabel(label);
    return !BLOCKLIST.some(t => n.includes(t));
}

function isEmoji(s: string): boolean {
    return EMOJI_ONLY_RE.test(s) && PICTOGRAPHIC_RE.test(s);
}

async function refreshBadges() {
    const list = await Native.getBadges();
    customBadges.clear();
    for (const b of list) customBadges.set(b.id, { emoji: b.emoji, label: b.label });
}

let refreshTimer: ReturnType<typeof setInterval> | null = null;

const CustomBadge: ProfileBadge = {
    id: "kittycord-custom",
    key: "kittycord-custom",
    position: BadgePosition.END,
    shouldShow: ({ userId }) => customBadges.has(userId),
    component: ({ userId }) => {
        const b = customBadges.get(userId);
        if (!b) return null;
        return (
            <Tooltip text={b.label}>
                {tooltipProps => <span {...tooltipProps} style={{ fontSize: 14, lineHeight: 1, cursor: "default" }}>{b.emoji}</span>}
            </Tooltip>
        );
    }
};

function BadgeEditor() {
    const [emoji, setEmoji] = React.useState("");
    const [label, setLabel] = React.useState("");
    const [busy, setBusy] = React.useState(false);

    React.useEffect(() => {
        (async () => {
            await refreshBadges();
            const me = UserStore.getCurrentUser();
            const mine = me && customBadges.get(me.id);
            if (mine) { setEmoji(mine.emoji); setLabel(mine.label); }
        })();
    }, []);

    async function save() {
        const me = UserStore.getCurrentUser();
        if (!me?.id) return;
        const e = emoji.trim();
        const l = label.trim();
        if (!isEmoji(e)) { showToast("Pick a single emoji as the icon.", Toasts.Type.FAILURE); return; }
        if (!l) { showToast("Add a short label.", Toasts.Type.FAILURE); return; }
        if (!labelIsClean(l)) { showToast("That label isn't allowed.", Toasts.Type.FAILURE); return; }

        setBusy(true);
        const res = await Native.setBadge(me.id, e, l);
        setBusy(false);
        if (res.ok) { await refreshBadges(); showToast("Badge saved.", Toasts.Type.SUCCESS); }
        else showToast(res.error ?? "Could not save the badge.", Toasts.Type.FAILURE);
    }

    async function clear() {
        const me = UserStore.getCurrentUser();
        if (!me?.id) return;
        setBusy(true);
        await Native.clearBadge(me.id);
        setBusy(false);
        setEmoji("");
        setLabel("");
        await refreshBadges();
        showToast("Badge removed.", Toasts.Type.SUCCESS);
    }

    return (
        <>
            <Text variant="text-sm/semibold" style={{ marginBottom: 4 }}>Your custom badge</Text>
            <Text variant="text-sm/normal" style={{ opacity: 0.8, marginBottom: 8 }}>
                Pick an emoji and a short label. It shows on your profile for everyone using Kittycord. Discord's own badge names (staff, partner, …) aren't allowed.
            </Text>
            <Flex style={{ gap: 8, alignItems: "center" }}>
                <div style={{ width: 80 }}>
                    <TextInput value={emoji} onChange={setEmoji} placeholder="🐱" maxLength={16} />
                </div>
                <div style={{ flex: 1 }}>
                    <TextInput value={label} onChange={setLabel} placeholder="catgirl" maxLength={24} />
                </div>
                {emoji ? <span style={{ fontSize: 18 }}>{emoji}</span> : null}
            </Flex>
            <Flex style={{ gap: 8, marginTop: 8 }}>
                <Button color={Button.Colors.BRAND} disabled={busy} onClick={save}>Save badge</Button>
                <Button color={Button.Colors.RED} look={Button.Looks.LINK} disabled={busy} onClick={clear}>Remove</Button>
            </Flex>
        </>
    );
}

const settings = definePluginSettings({
    badge: {
        type: OptionType.COMPONENT,
        description: "Your custom badge",
        component: BadgeEditor
    }
});

export default definePlugin({
    name: "CustomBadges",
    description: "Give yourself a custom profile badge — an emoji and a short label — that everyone on Kittycord can see.",
    authors: [{ name: "Kittycord", id: 0n }],
    dependencies: ["BadgeAPI"],
    enabledByDefault: true,
    settings,

    async start() {
        addProfileBadge(CustomBadge);
        await refreshBadges();
        refreshTimer = setInterval(refreshBadges, 10 * 60 * 1000);
    },

    stop() {
        removeProfileBadge(CustomBadge);
        if (refreshTimer) {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }
        customBadges.clear();
    }
});
