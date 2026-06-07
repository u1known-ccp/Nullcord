/*
 * Kittycord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { Flex } from "@components/Flex";
import { FormSwitch } from "@components/FormSwitch";
import { ModalCloseButton as ModalCloseButtonRaw, ModalContent as ModalContentRaw, ModalHeader as ModalHeaderRaw, ModalRoot as ModalRootRaw, ModalSize, openModal } from "@utils/modal";
import { relaunch } from "@utils/native";
import definePlugin from "@utils/types";
import { Button, React, SearchableSelect, showToast, Text, TextInput, Toasts } from "@webpack/common";
import type { ComponentType } from "react";

import { applyMode, captureInto, currentThemes, deleteMode, getActiveId, getModes, getTogglablePlugins, loadModes, type Mode, newMode, saveMode, type StatusValue } from "./utils";

// The @utils/modal components are intentionally typed `never` (deprecated). Cast them so we can use them as JSX.
const ModalRoot = ModalRootRaw as ComponentType<any>;
const ModalHeader = ModalHeaderRaw as ComponentType<any>;
const ModalContent = ModalContentRaw as ComponentType<any>;
const ModalCloseButton = ModalCloseButtonRaw as ComponentType<any>;

const STATUS_OPTIONS = [
    { label: "Don't change", value: "" },
    { label: "Online", value: "online" },
    { label: "Idle", value: "idle" },
    { label: "Do Not Disturb", value: "dnd" },
    { label: "Invisible", value: "invisible" }
];

function Label({ children }: { children: string; }) {
    return <Text variant="text-sm/semibold" style={{ marginBottom: 4, marginTop: 12 }}>{children}</Text>;
}

function ModeEditor({ rootProps, initial, onSaved }: { rootProps: any; initial: Mode; onSaved(): void; }) {
    const [name, setName] = React.useState(initial.name);
    const [emoji, setEmoji] = React.useState(initial.emoji ?? "");
    const [status, setStatus] = React.useState<string>(initial.status ?? "");
    const [csOn, setCsOn] = React.useState(initial.customStatus !== undefined);
    const [csText, setCsText] = React.useState(initial.customStatus?.text ?? "");
    const [withThemes, setWithThemes] = React.useState(initial.themes !== undefined);
    const [themes, setThemes] = React.useState<string[]>(initial.themes ?? currentThemes());
    const [pluginMap, setPluginMap] = React.useState<Record<string, boolean>>(initial.plugins ?? {});

    const togglable = React.useMemo(getTogglablePlugins, []);
    const available = togglable.filter(o => !(o.value in pluginMap));

    async function save() {
        const mode: Mode = {
            ...initial,
            name: name.trim() || "Untitled mode",
            emoji: emoji.trim() || undefined,
            status: status ? (status as StatusValue) : undefined,
            customStatus: csOn ? (csText.trim() ? { text: csText.trim() } : null) : undefined,
            themes: withThemes ? themes : undefined,
            plugins: Object.keys(pluginMap).length ? pluginMap : undefined
        };
        await saveMode(mode);
        onSaved();
        rootProps.onClose();
    }

    return (
        <ModalRoot {...rootProps} size={ModalSize.MEDIUM}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>Edit mode</Text>
                <ModalCloseButton onClick={rootProps.onClose} />
            </ModalHeader>
            <ModalContent>
                <Flex style={{ gap: 8, marginTop: 12 }}>
                    <div style={{ width: 64 }}>
                        <Label>Emoji</Label>
                        <TextInput value={emoji} onChange={setEmoji} placeholder="🐱" maxLength={8} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <Label>Name</Label>
                        <TextInput value={name} onChange={setName} placeholder="Work, Gaming, Focus…" />
                    </div>
                </Flex>

                <Label>Online status</Label>
                <SearchableSelect options={STATUS_OPTIONS} value={status} onChange={(v: string) => setStatus(v)} closeOnSelect />

                <FormSwitch
                    title="Change custom status"
                    description="Leave the text empty to clear your custom status."
                    value={csOn}
                    onChange={setCsOn}
                />
                {csOn && <TextInput value={csText} onChange={setCsText} placeholder="Custom status text" />}

                <FormSwitch
                    title="Switch themes with this mode"
                    description={withThemes ? `Will enable ${themes.length} theme(s).` : "Themes stay as they are."}
                    value={withThemes}
                    onChange={setWithThemes}
                />
                {withThemes && (
                    <Button size={Button.Sizes.SMALL} look={Button.Looks.LINK} color={Button.Colors.LINK} onClick={() => setThemes(currentThemes())}>
                        Re-capture from current themes
                    </Button>
                )}

                <Label>Plugins this mode toggles</Label>
                {Object.entries(pluginMap).map(([n, want]) => (
                    <Flex key={n} style={{ gap: 8, alignItems: "center", padding: "4px 0" }}>
                        <Text variant="text-sm/normal" style={{ flex: 1 }}>{n}</Text>
                        <FormSwitch hideBorder title={want ? "On" : "Off"} value={want} onChange={v => setPluginMap(m => ({ ...m, [n]: v }))} />
                        <Button size={Button.Sizes.SMALL} color={Button.Colors.RED} look={Button.Looks.LINK} onClick={() => setPluginMap(m => { const x = { ...m }; delete x[n]; return x; })}>Remove</Button>
                    </Flex>
                ))}
                <div style={{ marginTop: 4 }}>
                    <SearchableSelect options={available} value={undefined} placeholder="Add a plugin…" onChange={(v: string) => setPluginMap(m => ({ ...m, [v]: true }))} closeOnSelect />
                </div>

                <Flex style={{ gap: 8, justifyContent: "flex-end", margin: "16px 0" }}>
                    <Button color={Button.Colors.PRIMARY} look={Button.Looks.LINK} onClick={rootProps.onClose}>Cancel</Button>
                    <Button color={Button.Colors.BRAND} onClick={save}>Save mode</Button>
                </Flex>
            </ModalContent>
        </ModalRoot>
    );
}

function ModesModal({ rootProps }: { rootProps: any; }) {
    const [, forceUpdate] = React.useReducer(x => x + 1, 0);
    const modes = getModes();
    const activeId = getActiveId();

    async function activate(mode: Mode) {
        try {
            const { restartNeeded } = await applyMode(mode);
            forceUpdate();
            showToast(`Switched to "${mode.name}".`, Toasts.Type.SUCCESS);
            if (restartNeeded) {
                showNotification({
                    title: "Mode applied — restart needed",
                    body: "Some plugins in this mode need a restart to fully apply. Click to restart now.",
                    onClick: () => (IS_WEB ? location.reload() : relaunch())
                });
            }
        } catch {
            showToast("Could not apply that mode.", Toasts.Type.FAILURE);
        }
    }

    function openEditor(mode: Mode) {
        openModal(props => <ModeEditor rootProps={props} initial={mode} onSaved={forceUpdate} />);
    }

    return (
        <ModalRoot {...rootProps} size={ModalSize.MEDIUM}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>Modes ({modes.length})</Text>
                <ModalCloseButton onClick={rootProps.onClose} />
            </ModalHeader>
            <ModalContent>
                {modes.length === 0
                    ? <Text variant="text-md/normal" style={{ padding: "16px 0" }}>No modes yet. Set up your client how you like it, then create one — it captures your status, custom status and themes.</Text>
                    : modes.map(mode => (
                        <Flex key={mode.id} style={{ gap: 8, alignItems: "center", padding: "8px 0" }}>
                            <Text variant="text-md/semibold" style={{ flex: 1 }}>
                                {mode.emoji ? mode.emoji + " " : ""}{mode.name}
                                {mode.id === activeId && <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.7 }}>active</span>}
                            </Text>
                            <Button size={Button.Sizes.SMALL} color={Button.Colors.BRAND} onClick={() => activate(mode)}>Activate</Button>
                            <Button size={Button.Sizes.SMALL} look={Button.Looks.LINK} onClick={() => openEditor(mode)}>Edit</Button>
                            <Button size={Button.Sizes.SMALL} color={Button.Colors.RED} look={Button.Looks.LINK} onClick={async () => { await deleteMode(mode.id); forceUpdate(); }}>Delete</Button>
                        </Flex>
                    ))}

                <Flex style={{ marginTop: 16 }}>
                    <Button color={Button.Colors.BRAND} onClick={() => openEditor(captureInto(newMode("New mode")))}>+ New mode (captures current setup)</Button>
                </Flex>
            </ModalContent>
        </ModalRoot>
    );
}

export default definePlugin({
    name: "Modes",
    description: "Switch your whole Discord with one tap: status, custom status, themes and which plugins are on — bundled into named modes like Work, Gaming or Focus.",
    authors: [{ name: "Kittycord", id: 0n }],
    tags: ["Utility"],
    dependencies: ["UserSettingsAPI"],

    toolboxActions: {
        "Open Modes"() {
            openModal(props => <ModesModal rootProps={props} />);
        }
    },

    async start() {
        await loadModes();
    }
});
