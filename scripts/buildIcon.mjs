/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Rasterizes browser/icon.svg to browser/icon.png using a locally installed
// Chromium-based browser via puppeteer-core. Run: `node scripts/buildIcon.mjs`.

import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import puppeteer from "puppeteer-core";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "browser/icon.svg"), "utf-8");

const CANDIDATES = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
].filter(Boolean);

const executablePath = CANDIDATES.find(p => existsSync(p));
if (!executablePath) {
    console.error("No Chromium-based browser found. Set PUPPETEER_EXECUTABLE_PATH.");
    process.exit(1);
}

const SIZES = [
    { file: "browser/icon.png", size: 512 },
];

const browser = await puppeteer.launch({ executablePath, headless: "new", args: ["--no-sandbox"] });
try {
    const page = await browser.newPage();
    for (const { file, size } of SIZES) {
        const html = `<!doctype html><html><head><style>*{margin:0;padding:0}html,body{background:transparent}svg{display:block}</style></head><body>${svg.replace(/width="\d+"/, `width="${size}"`).replace(/height="\d+"/, `height="${size}"`)}</body></html>`;
        await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
        await page.setContent(html, { waitUntil: "networkidle0" });
        const el = await page.$("svg");
        const buf = await el.screenshot({ omitBackground: true, type: "png" });
        writeFileSync(join(root, file), buf);
        console.info(`wrote ${file} (${size}x${size}, ${buf.length} bytes)`);
    }
} finally {
    await browser.close();
}
