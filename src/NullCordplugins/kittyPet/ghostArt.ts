/*
 * NullCord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type GhostExpression = "idle" | "blink" | "happy" | "alert" | "sleep" | "love";

const EYE = "#3a2230";

const heart = (cx: number, cy: number) =>
    `<path d="M${cx} ${cy + 2} C${cx - 1.4} ${cy + 0.3} ${cx - 2.1} ${cy - 0.9} ${cx - 1.1} ${cy - 1.5} C${cx - 0.4} ${cy - 1.9} ${cx} ${cy - 1.2} ${cx} ${cy - 0.7} C${cx} ${cy - 1.2} ${cx + 0.4} ${cy - 1.9} ${cx + 1.1} ${cy - 1.5} C${cx + 2.1} ${cy - 0.9} ${cx + 1.4} ${cy + 0.3} ${cx} ${cy + 2} Z" fill="#ff5fa6"/>`;

const BODY = "<path d=\"M6 16 C6 8 11 4 16 4 C21 4 26 8 26 16 L26 24 Q23.5 29 21 24 Q18.5 29 16 24 Q13.5 29 11 24 Q8.5 29 6 24 Z\" fill=\"#ffe9f4\" fill-opacity=\"0.94\" stroke=\"#ff8ac4\" stroke-width=\"1.2\"/>";

const CHEEKS = "<circle cx=\"9.5\" cy=\"18\" r=\"1.5\" fill=\"#ff8ac4\" opacity=\"0.5\"/><circle cx=\"22.5\" cy=\"18\" r=\"1.5\" fill=\"#ff8ac4\" opacity=\"0.5\"/>";

export function eyesFor(expression: GhostExpression): string {
    switch (expression) {
        case "blink":
            return `<rect x="10.8" y="14.4" width="3.4" height="1.5" rx="0.7" fill="${EYE}"/><rect x="17.8" y="14.4" width="3.4" height="1.5" rx="0.7" fill="${EYE}"/>`;
        case "happy":
            return `<path d="M10.8 15.4 L12.5 13.2 L14.2 15.4" fill="none" stroke="${EYE}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M17.8 15.4 L19.5 13.2 L21.2 15.4" fill="none" stroke="${EYE}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
        case "alert":
            return `<ellipse cx="12.5" cy="14.6" rx="2.4" ry="3.1" fill="${EYE}"/><ellipse cx="19.5" cy="14.6" rx="2.4" ry="3.1" fill="${EYE}"/><circle cx="13.4" cy="13.6" r="0.8" fill="#ffe9f4"/><circle cx="20.4" cy="13.6" r="0.8" fill="#ffe9f4"/><ellipse cx="16" cy="20.2" rx="1.5" ry="1.9" fill="${EYE}"/>`;
        case "sleep":
            return `<path d="M10.6 15 Q12.5 17.2 14.4 15" fill="none" stroke="${EYE}" stroke-width="1.4" stroke-linecap="round"/><path d="M17.6 15 Q19.5 17.2 21.4 15" fill="none" stroke="${EYE}" stroke-width="1.4" stroke-linecap="round"/>`;
        case "love":
            return heart(12.5, 14.6) + heart(19.5, 14.6);
        default:
            return `<ellipse cx="12.5" cy="15" rx="2" ry="2.7" fill="${EYE}"/><ellipse cx="19.5" cy="15" rx="2" ry="2.7" fill="${EYE}"/><circle cx="13.3" cy="14.1" r="0.7" fill="#ffe9f4"/><circle cx="20.3" cy="14.1" r="0.7" fill="#ffe9f4"/>`;
    }
}

export const GHOST_ACCESSORIES: Record<string, { label: string; svg: string; }> = {
    halo: {
        label: "Halo",
        svg: "<ellipse cx=\"16\" cy=\"2.6\" rx=\"6\" ry=\"1.8\" fill=\"none\" stroke=\"#ffd46b\" stroke-width=\"1.5\"/>"
    },
    witchHat: {
        label: "Witch hat",
        svg: "<ellipse cx=\"16\" cy=\"6\" rx=\"9.5\" ry=\"2.1\" fill=\"#5b3a7a\"/><path d=\"M16 0.5 L21.5 6 L10.5 6 Z\" fill=\"#6d479a\"/><rect x=\"11\" y=\"4.6\" width=\"10\" height=\"1.6\" fill=\"#ffd46b\"/>"
    },
    scarf: {
        label: "Cozy scarf",
        svg: "<path d=\"M7 21 Q16 24.5 25 21 L25 23.5 Q16 27 7 23.5 Z\" fill=\"#8ad1ff\"/><rect x=\"13\" y=\"22.5\" width=\"3\" height=\"5.5\" rx=\"0.6\" fill=\"#8ad1ff\"/>"
    },
    crown: {
        label: "Spooky crown",
        svg: "<path d=\"M10 8 L10 3 L13 5.5 L16 2 L19 5.5 L22 3 L22 8 Z\" fill=\"#b07bd8\" stroke=\"#8a55b8\" stroke-width=\"0.5\"/><circle cx=\"16\" cy=\"2\" r=\"0.9\" fill=\"#ff8ac4\"/>"
    },
    flowerCrown: {
        label: "Flower crown",
        svg: "<circle cx=\"10\" cy=\"6\" r=\"1.7\" fill=\"#ff8ac4\"/><circle cx=\"13\" cy=\"4.8\" r=\"1.7\" fill=\"#ffd46b\"/><circle cx=\"16\" cy=\"4.4\" r=\"1.7\" fill=\"#ff8ac4\"/><circle cx=\"19\" cy=\"4.8\" r=\"1.7\" fill=\"#ffd46b\"/><circle cx=\"22\" cy=\"6\" r=\"1.7\" fill=\"#ff8ac4\"/>"
    },
    bowTie: {
        label: "Bow tie",
        svg: "<path d=\"M16 23 L11 20.5 L11 25.5 Z\" fill=\"#ff5fa6\"/><path d=\"M16 23 L21 20.5 L21 25.5 Z\" fill=\"#ff5fa6\"/><circle cx=\"16\" cy=\"23\" r=\"1.4\" fill=\"#c61f63\"/>"
    },
    sunglasses: {
        label: "Sunglasses",
        svg: "<rect x=\"9.5\" y=\"12.8\" width=\"5\" height=\"3.4\" rx=\"1.5\" fill=\"#3a2230\"/><rect x=\"17.5\" y=\"12.8\" width=\"5\" height=\"3.4\" rx=\"1.5\" fill=\"#3a2230\"/><rect x=\"14.3\" y=\"13.8\" width=\"3.4\" height=\"1\" fill=\"#3a2230\"/>"
    },
    topHat: {
        label: "Top hat",
        svg: "<rect x=\"9.5\" y=\"5.4\" width=\"13\" height=\"1.7\" rx=\"0.7\" fill=\"#3a2230\"/><rect x=\"12\" y=\"0.6\" width=\"8\" height=\"5\" rx=\"0.6\" fill=\"#3a2230\"/><rect x=\"12\" y=\"3.2\" width=\"8\" height=\"1.4\" fill=\"#ff5fa6\"/>"
    },
    star: {
        label: "Lucky star",
        svg: "<path d=\"M16 1 Q16.7 4.3 20 5 Q16.7 5.7 16 9 Q15.3 5.7 12 5 Q15.3 4.3 16 1 Z\" fill=\"#ffd46b\"/>"
    },
    headphones: {
        label: "Headphones",
        svg: "<path d=\"M9 9 Q16 1.5 23 9\" fill=\"none\" stroke=\"#3a2230\" stroke-width=\"1.6\"/><rect x=\"7.3\" y=\"8.5\" width=\"3\" height=\"5\" rx=\"1.3\" fill=\"#ff5fa6\"/><rect x=\"21.7\" y=\"8.5\" width=\"3\" height=\"5\" rx=\"1.3\" fill=\"#ff5fa6\"/>"
    },
    monocle: {
        label: "Monocle",
        svg: "<circle cx=\"19.5\" cy=\"15\" r=\"3.6\" fill=\"none\" stroke=\"#ffd46b\" stroke-width=\"1.2\"/><path d=\"M19.5 18.6 Q20.4 22.5 22.5 23.5\" fill=\"none\" stroke=\"#ffd46b\" stroke-width=\"0.8\"/>"
    },
    partyHat: {
        label: "Party hat",
        svg: "<path d=\"M16 0.5 L11.5 7.5 L20.5 7.5 Z\" fill=\"#ff5fa6\"/><circle cx=\"16\" cy=\"0.8\" r=\"1.1\" fill=\"#ffd46b\"/><circle cx=\"15\" cy=\"5.5\" r=\"0.7\" fill=\"#ffe9f4\"/><circle cx=\"17.3\" cy=\"6.4\" r=\"0.7\" fill=\"#ffe9f4\"/><circle cx=\"16\" cy=\"3.6\" r=\"0.7\" fill=\"#ffe9f4\"/>"
    }
};

export const GHOST_ACCESSORY_LEVELS: Record<string, number> = {
    halo: 2,
    witchHat: 3,
    scarf: 4,
    crown: 5,
    flowerCrown: 6,
    bowTie: 7,
    sunglasses: 8,
    topHat: 9,
    star: 10,
    headphones: 3,
    monocle: 5,
    partyHat: 7
};

const THUMB_VIEWBOX: Record<string, string> = {
    halo: "4 0 24 6",
    witchHat: "6 0 20 8",
    scarf: "6 20 20 9",
    crown: "9 1 14 8",
    flowerCrown: "7 2 18 7",
    bowTie: "10 20 12 7",
    sunglasses: "8 12 16 6",
    topHat: "9 0 14 8",
    star: "11 0 10 10",
    headphones: "6 1 20 13",
    monocle: "15 11 11 14",
    partyHat: "10 0 12 8"
};

function toUri(viewBox: string, inner: string): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${inner}</svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const uriCache = new Map<string, string>();

export function buildGhostUri({ expression, accessory }: { expression: GhostExpression; accessory: string | null; }): string {
    const key = `${expression}|${accessory ?? ""}`;
    const cached = uriCache.get(key);
    if (cached) return cached;
    const acc = accessory && GHOST_ACCESSORIES[accessory] ? GHOST_ACCESSORIES[accessory].svg : "";
    const uri = toUri("0 0 32 32", BODY + CHEEKS + eyesFor(expression) + acc);
    uriCache.set(key, uri);
    return uri;
}

export const GHOST_ACCESSORY_THUMBS: Record<string, string> = Object.fromEntries(
    Object.entries(GHOST_ACCESSORIES).map(([id, a]) => [id, toUri(THUMB_VIEWBOX[id], a.svg)])
);

