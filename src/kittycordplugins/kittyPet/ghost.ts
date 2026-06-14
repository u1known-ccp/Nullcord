/*
 * Kittycord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { buildGhostUri, GHOST_ACCESSORIES, GhostExpression } from "./ghostArt";

export interface GhostConfig {
    size: number;
    lag: number;
    reactions: boolean;
}

export interface GhostHooks {
    getConfig(): GhostConfig;
    onPet(): void;
}

const SLEEP_MS = 12000;
const BLINK_MIN = 3000;
const BLINK_MAX = 6500;

export class GhostController {
    private hooks: GhostHooks;
    private container: HTMLDivElement;
    private bob: HTMLDivElement;
    private body: HTMLImageElement;
    private raf: number | null = null;

    private x = 0;
    private y = 0;
    private cursorX = 0;
    private cursorY = 0;
    private lean = 0;
    private lastFrame = 0;
    private lastMoveAt = 0;
    private nextBlinkAt = 0;
    private blinkUntil = 0;
    private temp: GhostExpression | null = null;
    private tempUntil = 0;
    private equipped: string | null = null;
    private renderedExpr: GhostExpression | null = null;
    private renderedAcc: string | null = null;

    private onMove = (e: MouseEvent) => {
        this.cursorX = e.clientX;
        this.cursorY = e.clientY;
        this.lastMoveAt = performance.now();
    };

    constructor(hooks: GhostHooks) {
        this.hooks = hooks;
        this.container = document.createElement("div");
        this.container.className = "kc-ghost";
        this.bob = document.createElement("div");
        this.bob.className = "kc-ghost-bob";
        this.body = document.createElement("img");
        this.body.className = "kc-ghost-body";
        this.body.alt = "";
        this.bob.appendChild(this.body);
        this.container.appendChild(this.bob);
    }

    start() {
        this.x = window.innerWidth / 2;
        this.y = window.innerHeight / 2;
        this.cursorX = this.x;
        this.cursorY = this.y;
        const now = performance.now();
        this.lastFrame = now;
        this.lastMoveAt = now;
        this.nextBlinkAt = now + BLINK_MIN;
        document.addEventListener("mousemove", this.onMove, { passive: true, capture: true });
        document.body.appendChild(this.container);
        this.loop();
    }

    stop() {
        if (this.raf !== null) cancelAnimationFrame(this.raf);
        this.raf = null;
        document.removeEventListener("mousemove", this.onMove, { capture: true } as any);
        this.container.remove();
    }

    setEquipped(accessory: string | null) {
        this.equipped = accessory && GHOST_ACCESSORIES[accessory] ? accessory : null;
    }

    react(kind: "mention" | "message" | "typing") {
        if (!this.hooks.getConfig().reactions) return;
        if (kind === "mention") {
            this.lastMoveAt = performance.now();
            this.setTemp("happy", 1500);
            this.spawnHearts();
        } else {
            this.setTemp("alert", kind === "message" ? 700 : 500);
        }
    }

    pet() {
        this.lastMoveAt = performance.now();
        this.setTemp("happy", 1600);
        this.spawnHearts();
        this.hooks.onPet();
    }

    private setTemp(expr: GhostExpression, ms: number) {
        this.temp = expr;
        this.tempUntil = performance.now() + ms;
    }

    private loop = () => {
        this.raf = requestAnimationFrame(this.loop);
        try {
            this.frame();
        } catch { /* never break the client over the ghost */ }
    };

    private frame() {
        const now = performance.now();
        const dt = Math.min(0.1, (now - this.lastFrame) / 1000);
        this.lastFrame = now;

        if (document.hidden) return;
        if (document.documentElement.classList.contains("kc-perf-noanim")) {
            this.container.style.display = "none";
            return;
        }
        this.container.style.display = "";

        const cfg = this.hooks.getConfig();
        const { size } = cfg;
        const rate = 14 / Math.max(0.5, cfg.lag);
        const k = 1 - Math.exp(-rate * dt);

        const targetX = this.cursorX - size / 2;
        const targetY = this.cursorY - size / 2 - 6;
        const prevX = this.x;
        this.x += (targetX - this.x) * k;
        this.y += (targetY - this.y) * k;
        this.x = Math.min(Math.max(this.x, 0), window.innerWidth - size);
        this.y = Math.min(Math.max(this.y, 0), window.innerHeight - size);

        const targetLean = Math.max(-12, Math.min(12, (this.x - prevX) * 1.6));
        this.lean += (targetLean - this.lean) * Math.min(1, dt * 10);

        this.container.style.width = `${size}px`;
        this.container.style.height = `${size}px`;
        this.container.style.transform = `translate3d(${Math.round(this.x)}px, ${Math.round(this.y)}px, 0)`;
        this.body.style.transform = `rotate(${this.lean.toFixed(1)}deg)`;

        const expr = this.currentExpression(now);
        if (expr !== this.renderedExpr || this.equipped !== this.renderedAcc) {
            this.body.src = buildGhostUri({ expression: expr, accessory: this.equipped });
            this.renderedExpr = expr;
            this.renderedAcc = this.equipped;
        }
    }

    private currentExpression(now: number): GhostExpression {
        if (this.temp && now < this.tempUntil) return this.temp;
        this.temp = null;
        if (now - this.lastMoveAt > SLEEP_MS) return "sleep";
        if (now >= this.nextBlinkAt) {
            this.blinkUntil = now + 130;
            this.nextBlinkAt = now + BLINK_MIN + Math.random() * (BLINK_MAX - BLINK_MIN);
        }
        return now < this.blinkUntil ? "blink" : "idle";
    }

    private spawnHearts() {
        const { size } = this.hooks.getConfig();
        const count = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
            const heart = document.createElement("span");
            heart.className = "kc-pet-heart";
            heart.textContent = "♥";
            heart.style.left = `${this.x + size * (0.2 + Math.random() * 0.6)}px`;
            heart.style.top = `${this.y - 4 - Math.random() * size * 0.4}px`;
            heart.style.animationDelay = `${i * 70}ms`;
            heart.addEventListener("animationend", () => heart.remove());
            document.body.appendChild(heart);
        }
    }
}
