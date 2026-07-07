/*
 * NullCord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import definePlugin, { OptionType } from "@utils/types";

import style from "./style.css?managed";

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

const STYLES = ["fade", "slide", "scale", "slidefade"];
const DIRECTIONS = ["up", "down", "left", "right"];

const DURATIONS: Record<string, string> = { fast: "140ms", normal: "220ms", slow: "340ms" };
const DISTANCES: Record<string, string> = { fast: "8px", normal: "14px", slow: "22px" };
const EASES: Record<string, string> = {
    smooth: "cubic-bezier(0.16, 1, 0.3, 1)",
    snappy: "cubic-bezier(0.22, 0.61, 0.36, 1)",
    gentle: "ease"
};

function apply() {
    const s = settings.store;
    const root = document.documentElement;
    const cl = root.classList;

    const enabled = !(s.respectReducedMotion && reducedMotionQuery.matches);
    cl.toggle("kc-motion", enabled);

    for (const st of STYLES) cl.toggle(`kc-motion-style-${st}`, s.style === st);
    for (const d of DIRECTIONS) cl.toggle(`kc-motion-dir-${d}`, s.direction === d);

    cl.toggle("kc-motion-channels", s.channels);
    cl.toggle("kc-motion-servers", s.servers);
    cl.toggle("kc-motion-settings", s.settings);
    cl.toggle("kc-motion-modals", s.modals);
    cl.toggle("kc-motion-popouts", s.popouts);

    root.style.setProperty("--kc-motion-duration", DURATIONS[s.speed] ?? DURATIONS.normal);
    root.style.setProperty("--kc-motion-distance", DISTANCES[s.speed] ?? DISTANCES.normal);
    root.style.setProperty("--kc-motion-ease", EASES[s.easing] ?? EASES.smooth);
}

const settings = definePluginSettings({
    style: {
        type: OptionType.SELECT,
        description: "How new views animate in",
        options: [
            { label: "Slide + fade", value: "slidefade", default: true },
            { label: "Fade", value: "fade" },
            { label: "Slide", value: "slide" },
            { label: "Scale", value: "scale" }
        ],
        onChange: apply
    },
    direction: {
        type: OptionType.SELECT,
        description: "Which way things slide in (only affects the sliding styles)",
        options: [
            { label: "Up", value: "up", default: true },
            { label: "Down", value: "down" },
            { label: "From the left", value: "right" },
            { label: "From the right", value: "left" }
        ],
        onChange: apply
    },
    speed: {
        type: OptionType.SELECT,
        description: "How quick the animation is",
        options: [
            { label: "Fast", value: "fast" },
            { label: "Normal", value: "normal", default: true },
            { label: "Slow", value: "slow" }
        ],
        onChange: apply
    },
    easing: {
        type: OptionType.SELECT,
        description: "The feel of the motion",
        options: [
            { label: "Smooth", value: "smooth", default: true },
            { label: "Snappy", value: "snappy" },
            { label: "Gentle", value: "gentle" }
        ],
        onChange: apply
    },
    channels: {
        type: OptionType.BOOLEAN,
        description: "Animate the chat when you switch channels",
        default: true,
        onChange: apply
    },
    servers: {
        type: OptionType.BOOLEAN,
        description: "Animate the channel list when you switch servers",
        default: true,
        onChange: apply
    },
    settings: {
        type: OptionType.BOOLEAN,
        description: "Animate settings pages as you move between them",
        default: true,
        onChange: apply
    },
    modals: {
        type: OptionType.BOOLEAN,
        description: "Animate modals and dialogs when they open",
        default: true,
        onChange: apply
    },
    popouts: {
        type: OptionType.BOOLEAN,
        description: "Animate profile and other popouts when they open",
        default: true,
        onChange: apply
    },
    respectReducedMotion: {
        type: OptionType.BOOLEAN,
        description: "Turn animations off when your system asks for reduced motion",
        default: true,
        onChange: apply
    }
});

export default definePlugin({
    name: "KittyMotion",
    description: "Smooth animated transitions as you move around Discord — switching channels and servers, flipping through settings, and opening modals and popouts. Pick the style, direction and speed you like.",
    authors: [{ name: "NullCord", id: 0n }],
    tags: ["Appearance"],
    settings,

    start() {
        enableStyle(style);
        apply();
        reducedMotionQuery.addEventListener("change", apply);
    },

    stop() {
        reducedMotionQuery.removeEventListener("change", apply);
        disableStyle(style);
        const root = document.documentElement;
        const cl = root.classList;
        cl.remove(
            "kc-motion",
            "kc-motion-channels",
            "kc-motion-servers",
            "kc-motion-settings",
            "kc-motion-modals",
            "kc-motion-popouts",
            ...STYLES.map(s => `kc-motion-style-${s}`),
            ...DIRECTIONS.map(d => `kc-motion-dir-${d}`)
        );
        root.style.removeProperty("--kc-motion-duration");
        root.style.removeProperty("--kc-motion-distance");
        root.style.removeProperty("--kc-motion-ease");
    }
});

