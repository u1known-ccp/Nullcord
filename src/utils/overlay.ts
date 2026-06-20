/*
 * Kittycord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Discord's in-game overlay runs the full client renderer in a separate, transparent window.
// Kittycord must never inject themes or managed styles there, or the overlay turns opaque and
// covers the game. `window.__OVERLAY__` is the reliable marker (Discord sets it in the overlay
// renderer; vcNarrator/pinDms/showHiddenChannels rely on it too); the URL check is a fallback.

export function isOverlayContext(win: Window | undefined) {
    try {
        return Boolean((win as any)?.__OVERLAY__) || /\/overlay/i.test(win?.location?.href ?? "");
    } catch {
        return false;
    }
}

export function isOverlayWindow() {
    return isOverlayContext(window);
}
