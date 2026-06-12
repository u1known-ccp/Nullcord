/*
 * Kittycord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { sleep } from "@utils/misc";
import { CloudUpload } from "@vencord/discord-types";
import { CloudUploadPlatform } from "@vencord/discord-types/enums";
import { findLazy } from "@webpack";
import { ChannelActionCreators, ChannelStore, Constants, RestAPI, SnowflakeUtils } from "@webpack/common";

const CloudUploader = findLazy(m => m.prototype?.trackUploadFinished) as typeof CloudUpload;

async function waitForDmChannel(userId: string, timeoutMs = 3000): Promise<string | null> {
    const started = Date.now();
    do {
        const id = ChannelStore.getDMFromUserId?.(userId) ?? null;
        if (id) return id;
        await sleep(80);
    } while (Date.now() - started < timeoutMs);
    return null;
}

export async function ensureDmChannel(userId: string): Promise<string | null> {
    const existing = ChannelStore.getDMFromUserId?.(userId);
    if (existing) return existing;

    let result: unknown;
    try {
        result = await Promise.resolve(ChannelActionCreators.openPrivateChannel({ recipientIds: [userId], navigateToChannel: false }));
    } catch {
        result = null;
    }
    if (typeof result === "string") return result;

    return waitForDmChannel(userId);
}

export function uploadAttachment(channelId: string, file: File): Promise<{ id: string; filename: string; uploaded_filename: string; } | null> {
    return new Promise(resolve => {
        const upload = new CloudUploader({ file, platform: CloudUploadPlatform.WEB }, channelId);
        upload.on("complete", () => resolve({ id: "0", filename: upload.filename, uploaded_filename: upload.uploadedFilename }));
        upload.on("error", () => resolve(null));
        upload.upload();
    });
}

export async function sendFileToUser(userId: string, file: File, content: string) {
    const channelId = await ensureDmChannel(userId);
    if (!channelId) throw new Error("Could not open a DM with that user.");

    const attachment = await uploadAttachment(channelId, file);
    if (!attachment) throw new Error("Upload failed. Please try again.");

    await RestAPI.post({
        url: Constants.Endpoints.MESSAGES(channelId),
        body: {
            content,
            nonce: SnowflakeUtils.fromTimestamp(Date.now()),
            channel_id: channelId,
            sticker_ids: [],
            type: 0,
            attachments: [attachment]
        }
    });
}
