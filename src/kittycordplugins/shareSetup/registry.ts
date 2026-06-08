/*
 * Kittycord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Thin renderer-side wrapper over the opt-in friend registry (which lives in the main process,
// src/main/shareRegistry.ts). All of this is inert unless the user has explicitly opted in.

import { RelationshipStore, UserStore } from "@webpack/common";

export const getShareConsent = () => VencordNative.kittycordShare.getConsent();
export const setShareConsent = (value: boolean) => VencordNative.kittycordShare.setConsent(value);

/** Register the current user as discoverable (no-op until the user has consented). */
export function registerSelf(): Promise<void> {
    const me = UserStore.getCurrentUser();
    return me?.id ? VencordNative.kittycordShare.register(me.id) : Promise.resolve();
}

/** Returns the ids of the user's friends that are registered Kittycord users. */
export async function getKittycordFriendIds(): Promise<string[]> {
    const friendIds = RelationshipStore.getFriendIDs?.() ?? [];
    if (friendIds.length === 0) return [];
    return VencordNative.kittycordShare.friendsCheck(friendIds);
}
