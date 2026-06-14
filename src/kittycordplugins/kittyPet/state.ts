/*
 * Kittycord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { get, set } from "@api/DataStore";

export type PetProfile = "cat" | "ghost";

const KEYS: Record<PetProfile, string> = {
    cat: "Kittycord_KittyPet",
    ghost: "Kittycord_KittyGhost"
};

export interface PetSave {
    xp: number;
    pets: number;
    equipped: string | null;
    msgDay: string;
    msgXp: number;
    notifiedLevel: number;
}

export const LEVEL_XP = [0, 40, 120, 280, 600];
export const MAX_LEVEL = LEVEL_XP.length;
export const DAILY_MSG_XP_CAP = 30;

export function levelFor(xp: number): number {
    let level = 1;
    for (let i = 0; i < LEVEL_XP.length; i++) {
        if (xp >= LEVEL_XP[i]) level = i + 1;
    }
    return level;
}

export function nextLevelXp(level: number): number | null {
    return level >= MAX_LEVEL ? null : LEVEL_XP[level];
}

const defaults = (): PetSave => ({ xp: 0, pets: 0, equipped: null, msgDay: "", msgXp: 0, notifiedLevel: 1 });

const saves: Record<PetProfile, PetSave> = { cat: defaults(), ghost: defaults() };
let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const result = writeQueue.then(fn, fn);
    writeQueue = result.then(() => {}, () => {});
    return result;
}

export async function loadSave(profile: PetProfile): Promise<PetSave> {
    const stored = await get<Partial<PetSave>>(KEYS[profile]);
    saves[profile] = { ...defaults(), ...stored };
    if (stored?.notifiedLevel === undefined) saves[profile].notifiedLevel = levelFor(saves[profile].xp);
    return saves[profile];
}

export const getSave = (profile: PetProfile) => saves[profile];

export function updateSave(profile: PetProfile, patch: Partial<PetSave>): Promise<PetSave> {
    return enqueue(async () => {
        saves[profile] = { ...saves[profile], ...patch };
        await set(KEYS[profile], saves[profile]);
        return saves[profile];
    });
}

export function addXp(profile: PetProfile, amount: number): Promise<number | null> {
    return enqueue(async () => {
        const before = levelFor(saves[profile].xp);
        const xp = saves[profile].xp + amount;
        const after = levelFor(xp);
        const leveledUp = after > before && after > saves[profile].notifiedLevel;
        saves[profile] = { ...saves[profile], xp, notifiedLevel: leveledUp ? after : saves[profile].notifiedLevel };
        await set(KEYS[profile], saves[profile]);
        return leveledUp ? after : null;
    });
}
