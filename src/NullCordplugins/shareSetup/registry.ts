/*
 * NullCord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { RelationshipStore, UserStore } from "@webpack/common";

export const getShareConsent = () => VencordNative.NullCordShare.getConsent();
export const setShareConsent = (value: boolean) => VencordNative.NullCordShare.setConsent(value);

export function registerSelf(): Promise<void> {
    const me = UserStore.getCurrentUser();
    return me?.id ? VencordNative.NullCordShare.register(me.id) : Promise.resolve();
}

export function unregisterSelf(): Promise<void> {
    const me = UserStore.getCurrentUser();
    return me?.id ? VencordNative.NullCordShare.unregister(me.id) : Promise.resolve();
}

export async function getNullCordFriendIds(): Promise<string[]> {
    const friendIds = RelationshipStore.getFriendIDs?.() ?? [];
    if (friendIds.length === 0) return [];
    return VencordNative.NullCordShare.friendsCheck(friendIds);
}

