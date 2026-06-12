/*
 * Kittycord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled, plugins } from "@api/PluginManager";
import { exportSettings, importSettings } from "@api/SettingsSync/offline";
import { Logger } from "@utils/Logger";
import type { PluginNative } from "@utils/types";
import { MessageAttachment } from "@vencord/discord-types";
import { moment, UserStore } from "@webpack/common";

import { downloadAttachmentText, sendFileToUser } from "../_shared/dm";

const logger = new Logger("ShareSetup");

export type ShareScope = "plugins" | "css" | "all";

export interface ShareEnvelope {
    v: 1;
    kind: "kittycord-share";
    sender: { id: string; username: string; };
    created: number;
    scope: ShareScope;
    enabledPlugins: string[];
    body: string;
}

const FILE_SUFFIX = ".kcshare";
const MAX_SHARE_BYTES = 2_000_000;

const Native = VencordNative?.pluginHelpers?.ShareSetup as PluginNative<typeof import("./native")> | undefined;

function enabledPluginNames(): string[] {
    return Object.values(plugins)
        .filter(p => !p.required && !p.name.endsWith("API") && isPluginEnabled(p.name))
        .map(p => p.name)
        .sort((a, b) => a.localeCompare(b));
}

export async function buildEnvelopeFile(scope: ShareScope): Promise<File> {
    const body = (await exportSettings({ type: scope, syncDataStore: scope === "all" })) ?? "{}";
    const me = UserStore.getCurrentUser();
    const envelope: ShareEnvelope = {
        v: 1,
        kind: "kittycord-share",
        sender: { id: me?.id ?? "", username: me?.username ?? "Someone" },
        created: Date.now(),
        scope,
        enabledPlugins: enabledPluginNames(),
        body
    };
    const data = new TextEncoder().encode(JSON.stringify(envelope));
    return new File([data], `kittycord-setup-${moment().format("YYYY-MM-DD")}${FILE_SUFFIX}`, { type: "application/json" });
}

export async function sendShare(userId: string, scope: ShareScope, note: string) {
    const file = await buildEnvelopeFile(scope);
    await sendFileToUser(userId, file, note);
}

export function findShareAttachment(attachments: MessageAttachment[] | undefined): MessageAttachment | null {
    return attachments?.find(a => a.filename?.toLowerCase().endsWith(FILE_SUFFIX)) ?? null;
}

function parseEnvelope(text: string): ShareEnvelope {
    if (text.length > MAX_SHARE_BYTES) throw new Error("That setup file is too large.");

    let obj: any;
    try {
        obj = JSON.parse(text);
    } catch {
        throw new Error("That setup file could not be read.");
    }

    if (!obj || obj.kind !== "kittycord-share" || typeof obj.v !== "number" || typeof obj.body !== "string")
        throw new Error("That file is not a Kittycord setup.");
    if (obj.scope !== "plugins" && obj.scope !== "css" && obj.scope !== "all")
        throw new Error("That setup uses an unknown scope.");

    return obj as ShareEnvelope;
}

export async function fetchShare(attachment: MessageAttachment): Promise<ShareEnvelope> {
    return parseEnvelope(await downloadAttachmentText(attachment, Native));
}

export async function applyShare(envelope: ShareEnvelope) {
    await importSettings(envelope.body, envelope.scope, false);
    logger.info(`Imported a shared setup (${envelope.scope}) from ${envelope.sender.username}`);
}
