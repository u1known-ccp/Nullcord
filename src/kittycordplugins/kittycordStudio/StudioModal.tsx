/*
 * Kittycord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { FormSwitch } from "@components/FormSwitch";
import { Logger } from "@utils/Logger";
import { ModalCloseButton as ModalCloseButtonRaw, ModalContent as ModalContentRaw, ModalHeader as ModalHeaderRaw, ModalRoot as ModalRootRaw, ModalSize, openModal } from "@utils/modal";
import { Button, React, showToast, Slider, Text, TextInput, Toasts } from "@webpack/common";
import type { ComponentType } from "react";

import { ShareFileModal } from "../_shared/ShareFileModal";
import { buildThemeFile } from "./share";
import { enableTheme, getThemes, isThemeEnabled, loadThemes, removeTheme, saveTheme } from "./store";
import { defaultParams, derivePalette, HEX_RE, MAX_ROUNDNESS, NAME_RE, type StudioParams } from "./template";

// The @utils/modal components are intentionally typed `never` (deprecated). Cast them so we can use them as JSX.
const ModalRoot = ModalRootRaw as ComponentType<any>;
const ModalHeader = ModalHeaderRaw as ComponentType<any>;
const ModalContent = ModalContentRaw as ComponentType<any>;
const ModalCloseButton = ModalCloseButtonRaw as ComponentType<any>;

const logger = new Logger("KittycordStudio");

const COLOR_FIELDS: { key: keyof StudioParams["colors"]; label: string; hint: string; }[] = [
    { key: "bg", label: "Background", hint: "the base of everything" },
    { key: "accent", label: "Accent", hint: "buttons, mentions, highlights" },
    { key: "accentHi", label: "Accent light", hint: "links and bright touches" },
    { key: "text", label: "Text", hint: "main text color" },
    { key: "muted", label: "Muted", hint: "quiet labels and channels" }
];

function ColorRow({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange(v: string): void; }) {
    const [draft, setDraft] = React.useState(value);

    React.useEffect(() => setDraft(value), [value]);

    function commit(text: string) {
        setDraft(text);
        const hex = text.trim().toLowerCase();
        if (HEX_RE.test(hex)) onChange(hex);
    }

    return (
        <Flex style={{ alignItems: "center", gap: 10, padding: "5px 0" }}>
            <input
                type="color"
                value={value}
                onChange={e => onChange(e.currentTarget.value.toLowerCase())}
                style={{ width: 36, height: 36, border: "none", borderRadius: 8, padding: 0, background: "none", cursor: "pointer" }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
                <Text variant="text-sm/semibold">{label}</Text>
                <Text variant="text-xs/normal" style={{ opacity: 0.6 }}>{hint}</Text>
            </div>
            <div style={{ width: 110 }}>
                <TextInput value={draft} onChange={commit} maxLength={7} />
            </div>
        </Flex>
    );
}

export function PreviewPane({ params }: { params: StudioParams; }) {
    const p = derivePalette(params);
    const r = Math.max(4, params.roundness - 4);

    return (
        <div style={{ background: p.bg[1], borderRadius: 12, border: `1px solid ${p.line}`, overflow: "hidden", display: "flex", height: 240 }}>
            <div style={{ width: 56, background: p.bg[0], padding: 8, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                {[p.accent, p.bg[5], p.bg[5]].map((c, i) => (
                    <div key={i} style={{ width: 32, height: 32, borderRadius: i === 0 ? 12 : 16, background: c }} />
                ))}
            </div>
            <div style={{ width: 110, background: p.bg[2], padding: "10px 8px" }}>
                <div style={{ color: p.text, fontWeight: 700, fontSize: 12, marginBottom: 10 }}>cat café 🐱</div>
                {["general", "kitty-pics", "mod-talk"].map((c, i) => (
                    <div key={c} style={{ color: i === 1 ? p.text : p.muted, background: i === 1 ? `${p.accent}22` : "transparent", borderRadius: 6, fontSize: 11, padding: "4px 6px", marginBottom: 2 }}>
                        # {c}
                    </div>
                ))}
            </div>
            <div style={{ flex: 1, background: p.bg[3], display: "flex", flexDirection: "column", padding: 10 }}>
                <div style={{ flex: 1, fontSize: 11 }}>
                    <div style={{ marginBottom: 8 }}>
                        <span style={{ color: p.accentHi, fontWeight: 600 }}>mochi</span>
                        <span style={{ color: p.text }}> — this theme is so pretty!</span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                        <span style={{ color: p.blush, fontWeight: 600 }}>luna</span>
                        <span style={{ color: p.text }}> — made it myself in </span>
                        <span style={{ color: p.accentHi, background: `${p.accent}24`, borderRadius: 4, padding: "0 3px" }}>@Kittycord Studio</span>
                    </div>
                    <div style={{ color: p.muted }}>mochi is typing…</div>
                </div>
                <div style={{ background: p.bg[4], border: `1px solid ${p.line}`, borderRadius: r, color: p.muted, fontSize: 11, padding: "7px 10px" }}>
                    Message #kitty-pics
                </div>
            </div>
        </div>
    );
}

function EditorModal({ rootProps, initial, initialFileName, onSaved }: { rootProps: any; initial: StudioParams; initialFileName?: string; onSaved(): void; }) {
    const [params, setParams] = React.useState<StudioParams>(initial);
    const [busy, setBusy] = React.useState(false);

    const nameValid = NAME_RE.test(params.name.trim());

    function setColor(key: keyof StudioParams["colors"], value: string) {
        setParams(prev => ({ ...prev, colors: { ...prev.colors, [key]: value } }));
    }

    async function save() {
        if (!nameValid) return;
        setBusy(true);
        try {
            const fileName = await saveTheme({ ...params, name: params.name.trim() }, initialFileName);
            enableTheme(fileName);
            showToast(`"${params.name.trim()}" saved & applied.`, Toasts.Type.SUCCESS);
            onSaved();
            rootProps.onClose();
        } catch (e) {
            logger.error("save failed", e);
            showToast(String((e as Error)?.message ?? "Could not save the theme."), Toasts.Type.FAILURE);
        } finally {
            setBusy(false);
        }
    }

    return (
        <ModalRoot {...rootProps} size={ModalSize.MEDIUM}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>Kittycord Studio 🎨</Text>
                <ModalCloseButton onClick={rootProps.onClose} />
            </ModalHeader>
            <ModalContent>
                <div style={{ margin: "14px 0" }}>
                    <PreviewPane params={params} />
                </div>

                <Text variant="text-sm/semibold" style={{ marginBottom: 4 }}>Theme name</Text>
                <TextInput value={params.name} onChange={(v: string) => setParams(prev => ({ ...prev, name: v }))} maxLength={40} />
                {!nameValid && (
                    <Text variant="text-xs/normal" style={{ opacity: 0.7, marginTop: 4 }}>
                        Use 1–40 letters, numbers, spaces or - ' ! &amp; .
                    </Text>
                )}

                <Text variant="text-sm/semibold" style={{ margin: "14px 0 2px" }}>Colors</Text>
                {COLOR_FIELDS.map(f => (
                    <ColorRow key={f.key} label={f.label} hint={f.hint} value={params.colors[f.key]} onChange={v => setColor(f.key, v)} />
                ))}

                <Text variant="text-sm/semibold" style={{ margin: "14px 0 8px" }}>Roundness</Text>
                <Slider
                    initialValue={params.roundness}
                    minValue={0}
                    maxValue={MAX_ROUNDNESS}
                    markers={[0, 4, 8, 12, 16, 20, 24]}
                    stickToMarkers={false}
                    onValueChange={(v: number) => setParams(prev => ({ ...prev, roundness: Math.round(v) }))}
                    onValueRender={(v: number) => `${Math.round(v)}px`}
                />

                <div style={{ marginTop: 14 }}>
                    <FormSwitch
                        title="Frosted glass"
                        description="Slightly translucent surfaces that let the backdrop shimmer through."
                        value={params.glass}
                        onChange={v => setParams(prev => ({ ...prev, glass: v }))}
                    />
                    <FormSwitch
                        title="Sparkle backdrop"
                        description="Paints soft glows, diamonds and sparkles behind everything."
                        value={params.sparkles}
                        onChange={v => setParams(prev => ({ ...prev, sparkles: v }))}
                    />
                </div>

                <Flex style={{ gap: 8, justifyContent: "flex-end", margin: "8px 0 16px" }}>
                    <Button look={Button.Looks.LINK} color={Button.Colors.PRIMARY} onClick={rootProps.onClose}>Cancel</Button>
                    <Button color={Button.Colors.BRAND} disabled={!nameValid || busy} onClick={save}>Save &amp; apply</Button>
                </Flex>
            </ModalContent>
        </ModalRoot>
    );
}

function StudioListModal({ rootProps }: { rootProps: any; }) {
    const [, forceUpdate] = React.useReducer(x => x + 1, 0);
    const [ready, setReady] = React.useState(false);

    React.useEffect(() => {
        loadThemes().then(() => setReady(true));
    }, []);

    const themes = Object.entries(getThemes());

    function openEditor(initial: StudioParams, fileName?: string) {
        openModal(props => <EditorModal rootProps={props} initial={initial} initialFileName={fileName} onSaved={forceUpdate} />);
    }

    return (
        <ModalRoot {...rootProps} size={ModalSize.MEDIUM}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>Kittycord Studio 🎨</Text>
                <ModalCloseButton onClick={rootProps.onClose} />
            </ModalHeader>
            <ModalContent>
                <Text variant="text-sm/normal" style={{ margin: "12px 0", opacity: 0.8 }}>
                    Build your own Discord theme from a few colors — no CSS needed. Saved themes apply instantly and live in your themes folder.
                </Text>

                {ready && themes.length === 0 && (
                    <Text variant="text-md/normal" style={{ padding: "8px 0" }}>
                        No Studio themes yet — create your first one!
                    </Text>
                )}
                {themes.map(([fileName, params]) => {
                    const p = derivePalette(params);
                    return (
                        <Flex key={fileName} style={{ alignItems: "center", gap: 10, padding: "8px 0" }}>
                            <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: `1px solid ${p.line}` }}>
                                {[p.bg[1], p.bg[3], p.accent, p.accentHi, p.text].map((c, i) => (
                                    <div key={i} style={{ width: 14, height: 28, background: c }} />
                                ))}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <Text variant="text-md/semibold">{params.name}</Text>
                                {isThemeEnabled(fileName) && <Text variant="text-xs/normal" style={{ opacity: 0.6 }}>active</Text>}
                            </div>
                            <Button size={Button.Sizes.SMALL} color={Button.Colors.BRAND} onClick={() => { enableTheme(fileName); forceUpdate(); }}>Apply</Button>
                            <Button size={Button.Sizes.SMALL} look={Button.Looks.LINK} onClick={() => openEditor(params, fileName)}>Edit</Button>
                            <Button size={Button.Sizes.SMALL} look={Button.Looks.LINK} onClick={() => openModal(props => (
                                <ShareFileModal
                                    rootProps={props}
                                    title={`Share "${params.name}"`}
                                    blurb="Friends with Kittycord get a one-tap import card with a live preview. Only the theme's colors and settings are shared."
                                    buildFile={() => buildThemeFile(params)}
                                    defaultNote={`Here's my "${params.name}" theme, made with Kittycord Studio — add it with one tap!`}
                                />
                            ))}>Share</Button>
                            <Button size={Button.Sizes.SMALL} color={Button.Colors.RED} look={Button.Looks.LINK} onClick={async () => { await removeTheme(fileName); forceUpdate(); }}>Delete</Button>
                        </Flex>
                    );
                })}

                <Flex style={{ margin: "16px 0" }}>
                    <Button color={Button.Colors.BRAND} onClick={() => openEditor(defaultParams())}>+ New theme</Button>
                </Flex>
            </ModalContent>
        </ModalRoot>
    );
}

export function openStudio() {
    openModal(props => <StudioListModal rootProps={props} />);
}
