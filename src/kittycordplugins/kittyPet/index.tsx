/*
 * Kittycord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import { Flex } from "@components/Flex";
import { ModalCloseButton as ModalCloseButtonRaw, ModalContent as ModalContentRaw, ModalHeader as ModalHeaderRaw, ModalRoot as ModalRootRaw, ModalSize, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { Button, React, SelectedChannelStore, showToast, Text, Toasts, UserStore } from "@webpack/common";

import { GhostController } from "./ghost";
import { GHOST_ACCESSORIES, GHOST_ACCESSORY_LEVELS, GHOST_ACCESSORY_THUMBS } from "./ghostArt";
import { PetController } from "./pet";
import { ACCESSORIES, ACCESSORY_URIS } from "./sprites";
import { addXp, DAILY_MSG_XP_CAP, getSave, levelFor, loadSave, MAX_LEVEL, nextLevelXp, PetProfile, updateSave } from "./state";
import style from "./style.css?managed";

// The @utils/modal components are intentionally typed `never` (deprecated). Cast them so we can use them as JSX.
const ModalRoot = ModalRootRaw as React.ComponentType<any>;
const ModalHeader = ModalHeaderRaw as React.ComponentType<any>;
const ModalContent = ModalContentRaw as React.ComponentType<any>;
const ModalCloseButton = ModalCloseButtonRaw as React.ComponentType<any>;

const CAT_ACCESSORY_LEVELS: Record<string, number> = { bow: 2, scarf: 3, hat: 4, crown: 5 };

interface AccessorySet {
    registry: Record<string, { label: string; }>;
    levels: Record<string, number>;
    thumbs: Record<string, string>;
    pixel: boolean;
}

const ACCESSORY_SETS: Record<PetProfile, AccessorySet> = {
    cat: { registry: ACCESSORIES, levels: CAT_ACCESSORY_LEVELS, thumbs: ACCESSORY_URIS, pixel: true },
    ghost: { registry: GHOST_ACCESSORIES, levels: GHOST_ACCESSORY_LEVELS, thumbs: GHOST_ACCESSORY_THUMBS, pixel: false }
};

const settings = definePluginSettings({
    style: {
        type: OptionType.SELECT,
        description: "Which pet you want",
        options: [
            { label: "Cat — walks along the bottom", value: "cat", default: true },
            { label: "Ghost — drifts around the screen", value: "ghost" }
        ],
        onChange: () => restartController()
    },
    size: {
        type: OptionType.SELECT,
        description: "How big your pet is",
        options: [
            { label: "Small", value: 24 },
            { label: "Medium", value: 32, default: true },
            { label: "Large", value: 48 }
        ]
    },
    speed: {
        type: OptionType.SLIDER,
        description: "How fast your pet moves around",
        markers: [0.5, 1, 1.5, 2, 3],
        default: 1,
        stickToMarkers: true
    },
    reactions: {
        type: OptionType.BOOLEAN,
        description: "React to pings, new messages and typing",
        default: true
    },
    sleepWhenIdle: {
        type: OptionType.BOOLEAN,
        description: "Fall asleep when nothing happens for a while",
        default: true
    }
});

let controller: PetController | GhostController | null = null;

const currentProfile = (): PetProfile => settings.store.style === "ghost" ? "ghost" : "cat";

function onPet() {
    const profile = currentProfile();
    updateSave(profile, { pets: getSave(profile).pets + 1 });
    addXp(profile, 2).then(notifyLevel);
}

function buildController(): PetController | GhostController {
    const getConfig = () => ({
        size: settings.store.size,
        speed: settings.store.speed,
        reactions: settings.store.reactions,
        sleepWhenIdle: settings.store.sleepWhenIdle
    });
    return settings.store.style === "ghost"
        ? new GhostController({ getConfig, onPet })
        : new PetController({ getConfig, onPet });
}

function startController() {
    controller = buildController();
    controller.setEquipped(getSave(currentProfile()).equipped);
    controller.start();
}

function restartController() {
    if (!controller) return;
    controller.stop();
    startController();
}

function notifyLevel(level: number | null) {
    if (level === null) return;
    const set = ACCESSORY_SETS[currentProfile()];
    const unlocked = Object.entries(set.levels).find(([, l]) => l === level)?.[0];
    const note = unlocked ? ` You unlocked the ${set.registry[unlocked].label.toLowerCase()}!` : "";
    const name = currentProfile() === "ghost" ? "ghost" : "kitty";
    showToast(`Your ${name} reached level ${level}!${note}`, Toasts.Type.SUCCESS);
}

function PetModal({ rootProps }: { rootProps: any; }) {
    const [, forceUpdate] = React.useReducer(x => x + 1, 0);
    const profile = currentProfile();
    const isGhost = profile === "ghost";
    const set = ACCESSORY_SETS[profile];
    const save = getSave(profile);
    const level = levelFor(save.xp);
    const next = nextLevelXp(level);
    const progress = next === null ? 1 : Math.min(1, save.xp / next);

    async function equip(id: string | null) {
        await updateSave(profile, { equipped: id });
        controller?.setEquipped(id);
        forceUpdate();
    }

    return (
        <ModalRoot {...rootProps} size={ModalSize.SMALL}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>Your {isGhost ? "KittyGhost" : "KittyPet"}</Text>
                <ModalCloseButton onClick={rootProps.onClose} />
            </ModalHeader>
            <ModalContent>
                <div style={{ margin: "12px 0" }}>
                    <Text variant="heading-md/semibold">Level {level}{level >= MAX_LEVEL ? " (max)" : ""}</Text>
                    <div style={{ height: 8, borderRadius: 999, background: "var(--background-tertiary)", margin: "8px 0" }}>
                        <div style={{ height: "100%", width: `${Math.round(progress * 100)}%`, borderRadius: 999, background: "linear-gradient(90deg, #ff5fa6, #ff8ac4)" }} />
                    </div>
                    <Text variant="text-sm/normal" style={{ opacity: 0.8 }}>
                        {next === null
                            ? (isGhost ? "Fully grown — what a lovely little spirit." : "Fully grown — what a good kitty.")
                            : `${save.xp} / ${next} XP — click your pet and chat to level up.`}
                    </Text>
                    <Text variant="text-sm/normal" style={{ opacity: 0.8, marginTop: 4 }}>
                        Petted {save.pets} time{save.pets === 1 ? "" : "s"}.
                    </Text>

                    <Text variant="heading-md/semibold" style={{ marginTop: 16, marginBottom: 8 }}>Accessories</Text>
                    <Flex style={{ gap: 8, flexWrap: "wrap" }}>
                        <Button
                            size={Button.Sizes.SMALL}
                            color={save.equipped === null ? Button.Colors.BRAND : Button.Colors.PRIMARY}
                            onClick={() => equip(null)}
                        >
                            None
                        </Button>
                        {Object.entries(set.registry).map(([id, acc]) => {
                            const needed = set.levels[id] ?? 1;
                            const locked = level < needed;
                            return (
                                <Button
                                    key={id}
                                    size={Button.Sizes.SMALL}
                                    color={save.equipped === id ? Button.Colors.BRAND : Button.Colors.PRIMARY}
                                    disabled={locked}
                                    onClick={() => equip(id)}
                                >
                                    <Flex style={{ gap: 6, alignItems: "center" }}>
                                        <img src={set.thumbs[id]} style={{ height: 14, imageRendering: set.pixel ? "pixelated" : "auto" }} alt="" />
                                        <span>{locked ? `${acc.label} (level ${needed})` : acc.label}</span>
                                    </Flex>
                                </Button>
                            );
                        })}
                    </Flex>
                </div>
            </ModalContent>
        </ModalRoot>
    );
}

export default definePlugin({
    name: "KittyPet",
    description: "A tiny pet that lives in your Discord — pick a pixel cat that walks around the bottom, or a ghost that drifts around the screen on its own. It reacts to pings, can be petted, and levels up to unlock accessories. Each pet keeps its own level and accessories.",
    authors: [{ name: "Kittycord", id: 0n }],
    tags: ["Fun", "Customisation"],
    settings,

    toolboxActions: {
        "Open KittyPet"() {
            openModal(props => <PetModal rootProps={props} />);
        }
    },

    flux: {
        async MESSAGE_CREATE({ message, optimistic }: { message: any; optimistic: boolean; }) {
            if (optimistic || !controller || !message?.author) return;
            const me = UserStore.getCurrentUser();
            if (!me) return;
            if (message.author.id === me.id) {
                const profile = currentProfile();
                const today = new Date().toDateString();
                const save = getSave(profile);
                const spent = save.msgDay === today ? save.msgXp : 0;
                if (spent < DAILY_MSG_XP_CAP) {
                    await updateSave(profile, { msgDay: today, msgXp: spent + 1 });
                    notifyLevel(await addXp(profile, 1));
                }
                return;
            }
            const mentionsMe = Array.isArray(message.mentions) && message.mentions.some((u: any) => (u?.id ?? u) === me.id);
            if (mentionsMe) controller.react("mention");
            else if (message.channel_id === SelectedChannelStore.getChannelId()) controller.react("message");
        },
        TYPING_START({ channelId, userId }: { channelId: string; userId: string; }) {
            if (!controller) return;
            const me = UserStore.getCurrentUser();
            if (!me || userId === me.id) return;
            if (channelId === SelectedChannelStore.getChannelId()) controller.react("typing");
        }
    },

    async start() {
        enableStyle(style);
        await loadSave("cat");
        await loadSave("ghost");
        startController();
    },

    stop() {
        controller?.stop();
        controller = null;
        disableStyle(style);
    }
});
