/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Central Kittycord branding.
 *
 * This file intentionally has NO imports so it can be used from any context (main, renderer,
 * preload, build) without risking circular dependencies. Reference these constants instead of
 * hardcoding the brand name, so the fork stays easy to merge with upstream Equicord/Vencord.
 */

export const BRAND_NAME = "Kittycord";
export const BRAND_NAME_LOWER = "kittycord";

/** Used to build user-agent strings, etc. */
export const BRAND_USER_AGENT_NAME = BRAND_NAME;
