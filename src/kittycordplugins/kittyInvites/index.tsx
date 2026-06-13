/*
 * Kittycord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { disableStyle, enableStyle } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { OwnerCrownIcon } from "@components/Icons";
import SettingsPlugin from "@plugins/_core/settings";
import { removeFromArray } from "@utils/misc";
import definePlugin, { type PluginNative } from "@utils/types";
import { Button, IconUtils, React, showToast, Text, TextInput, Toasts, UserStore, UserUtils } from "@webpack/common";

import style from "./style.css?managed";

const Native = VencordNative?.pluginHelpers?.KittyInvites as PluginNative<typeof import("./native")> | undefined;

let claimed = false;

async function tryClaim() {
    if (claimed || !Native) return;
    const me = UserStore.getCurrentUser();
    if (!me) return;
    claimed = true;
    try {
        const code = await Native.consumeReferralCode();
        if (code) await Native.claim(me.id, code);
    } catch { /* best effort */ }
}

function InvitesTab() {
    const me = UserStore.getCurrentUser();
    const [code, setCode] = React.useState("");
    const [mine, setMine] = React.useState<{ code: string | null; invites: number; rank: number | null; invitedBy: string | null; }>({ code: null, invites: 0, rank: null, invitedBy: null });
    const [board, setBoard] = React.useState<{ id: string; n: number; }[]>([]);
    const [saving, setSaving] = React.useState(false);
    const [claimInput, setClaimInput] = React.useState("");
    const [claiming, setClaiming] = React.useState(false);
    const [, forceUpdate] = React.useReducer(x => x + 1, 0);

    const userName = (id: string) => {
        const u = UserStore.getUser(id);
        return (u as any)?.globalName || u?.username || id;
    };

    function ensureUser(id: string) {
        if (!UserStore.getUser(id)) UserUtils.getUser(id).then(() => forceUpdate()).catch(() => { });
    }

    async function load() {
        if (!Native || !me) return;
        const [m, b] = await Promise.all([Native.getMe(me.id), Native.getLeaderboard(100)]);
        setMine(m);
        if (m.code) setCode(m.code);
        if (m.invitedBy) ensureUser(m.invitedBy);
        setBoard(b);
        for (const e of b) ensureUser(e.id);
    }

    React.useEffect(() => { load(); }, []);

    async function save() {
        if (!Native || !me) return;
        setSaving(true);
        const res = await Native.setCode(me.id, code.trim());
        setSaving(false);
        if (res.ok) {
            showToast("Creator code saved!", Toasts.Type.SUCCESS);
            load();
        } else {
            showToast(res.error, Toasts.Type.FAILURE);
        }
    }

    async function doClaim() {
        if (!Native || !me) return;
        setClaiming(true);
        const ok = await Native.claim(me.id, claimInput.trim());
        setClaiming(false);
        if (ok) {
            showToast("Thanks — your inviter just got the credit! 🐱", Toasts.Type.SUCCESS);
            setClaimInput("");
            load();
        } else {
            showToast("Couldn't count that — wrong code, your own code, or you were already counted.", Toasts.Type.FAILURE);
        }
    }

    return (
        <ErrorBoundary noop>
            <div className="kc-inv-card">
                <Text variant="heading-md/semibold">Your creator code</Text>
                <Text variant="text-sm/normal" style={{ opacity: .75, margin: "4px 0 10px" }}>
                    Share it with friends — when they install Kittycord and type your code, it counts for you.
                </Text>
                <div className="kc-inv-coderow">
                    <TextInput value={code} onChange={setCode} placeholder="e.g. yourname" maxLength={20} />
                    <Button size={Button.Sizes.MEDIUM} disabled={saving || !code.trim()} onClick={save}>
                        {mine.code && mine.code === code.trim().toLowerCase() ? "Saved" : "Save"}
                    </Button>
                </div>
                <Text variant="text-sm/normal" style={{ opacity: .75, marginTop: 10 }}>
                    {mine.invites > 0
                        ? `You've invited ${mine.invites} ${mine.invites === 1 ? "person" : "people"} — rank #${mine.rank}. 🐱`
                        : "No invites yet — set a code and share it to climb the board."}
                </Text>

                {mine.invitedBy ? (
                    <Text variant="text-sm/normal" style={{ opacity: .75, marginTop: 10 }}>
                        You were invited by <b>{userName(mine.invitedBy)}</b>. 💕
                    </Text>
                ) : (
                    <>
                        <Text variant="text-sm/normal" style={{ opacity: .75, margin: "14px 0 6px" }}>
                            Were you invited? Enter your inviter's code (once):
                        </Text>
                        <div className="kc-inv-coderow">
                            <TextInput value={claimInput} onChange={setClaimInput} placeholder="their creator code" maxLength={20} />
                            <Button size={Button.Sizes.MEDIUM} color={Button.Colors.BRAND} disabled={claiming || !claimInput.trim()} onClick={doClaim}>
                                Claim
                            </Button>
                        </div>
                    </>
                )}
            </div>

            <Text variant="heading-lg/semibold" style={{ margin: "20px 0 10px" }}>Top inviters</Text>
            <div className="kc-inv-board">
                {board.length === 0 && (
                    <Text variant="text-sm/normal" style={{ opacity: .6 }}>Nobody on the board yet — be the first!</Text>
                )}
                {board.map((e, i) => {
                    const user = UserStore.getUser(e.id);
                    const name = userName(e.id);
                    const avatar = user ? IconUtils.getUserAvatarURL(user, false, 64) : undefined;
                    return (
                        <div className={"kc-inv-row" + (me && e.id === me.id ? " kc-inv-me" : "")} key={e.id}>
                            <span className={"kc-inv-rank" + (i < 3 ? " kc-inv-top" : "")}>{i + 1}</span>
                            {avatar ? <img className="kc-inv-av" src={avatar} alt="" /> : <div className="kc-inv-av" />}
                            <span className="kc-inv-name">{name}</span>
                            <span className="kc-inv-count">{e.n}</span>
                        </div>
                    );
                })}
            </div>
        </ErrorBoundary>
    );
}

export default definePlugin({
    name: "KittyInvites",
    description: "See who invited the most people to Kittycord. Claim your own creator code and climb the all-time leaderboard.",
    authors: [{ name: "Kittycord", id: 0n }],
    tags: ["Friends", "Fun"],
    enabledByDefault: true,

    flux: {
        CONNECTION_OPEN() {
            tryClaim();
        }
    },

    async start() {
        enableStyle(style);
        SettingsPlugin.customEntries.push({
            key: "kittycord_invites",
            title: "Invites",
            panelTitle: "Invite Leaderboard",
            Component: InvitesTab,
            Icon: OwnerCrownIcon
        });
        tryClaim();
    },

    stop() {
        removeFromArray(SettingsPlugin.customEntries, e => e.key === "kittycord_invites");
        disableStyle(style);
    }
});
