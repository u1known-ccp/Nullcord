/*
 * Kittycord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { Flex } from "@components/Flex";
import { ErrorBoundary } from "@components/index";
import { getUniqueUsername } from "@utils/discord";
import { ModalCloseButton as ModalCloseButtonRaw, ModalContent as ModalContentRaw, ModalHeader as ModalHeaderRaw, ModalRoot as ModalRootRaw, ModalSize, openModal } from "@utils/modal";
import { relaunch } from "@utils/native";
import definePlugin from "@utils/types";
import type { Message, MessageAttachment, User } from "@vencord/discord-types";
import { Alerts, Button, Menu, React, RelationshipStore, SearchableSelect, showToast, Text, TextInput, Toasts, UserStore } from "@webpack/common";
import type { ComponentType } from "react";

import { applyShare, fetchShare, findShareAttachment, sendShare, type ShareEnvelope, type ShareScope } from "./utils";

// The @utils/modal components are intentionally typed `never` (deprecated). Cast them so we can use them as JSX.
const ModalRoot = ModalRootRaw as ComponentType<any>;
const ModalHeader = ModalHeaderRaw as ComponentType<any>;
const ModalContent = ModalContentRaw as ComponentType<any>;
const ModalCloseButton = ModalCloseButtonRaw as ComponentType<any>;

const SCOPE_OPTIONS: { label: string; value: ShareScope; }[] = [
    { label: "Plugins & their settings", value: "plugins" },
    { label: "Themes & QuickCSS", value: "css" },
    { label: "Everything (plugins, CSS, plugin data)", value: "all" }
];
const scopeLabel = (s: ShareScope) => SCOPE_OPTIONS.find(o => o.value === s)?.label ?? s;

function restartPrompt() {
    showNotification({
        title: "Setup imported — restart to apply",
        body: "Click here to restart Discord now.",
        onClick: () => (IS_WEB ? location.reload() : relaunch())
    });
}

function SendModal({ rootProps, user }: { rootProps: any; user: User; }) {
    const [scope, setScope] = React.useState<ShareScope>("plugins");
    const [note, setNote] = React.useState("Here's my Kittycord setup — open it in Kittycord to import.");
    const [busy, setBusy] = React.useState(false);

    async function send() {
        setBusy(true);
        try {
            await sendShare(user.id, scope, note.trim() || "Here's my Kittycord setup.");
            showToast("Setup sent.", Toasts.Type.SUCCESS);
            rootProps.onClose();
        } catch (e) {
            showToast(String((e as Error)?.message ?? "Could not send the setup."), Toasts.Type.FAILURE);
        } finally {
            setBusy(false);
        }
    }

    return (
        <ModalRoot {...rootProps} size={ModalSize.SMALL}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>Send your Kittycord setup</Text>
                <ModalCloseButton onClick={rootProps.onClose} />
            </ModalHeader>
            <ModalContent>
                <Text variant="text-sm/normal" style={{ margin: "12px 0" }}>
                    Sends {getUniqueUsername(user)} a file they can import in Kittycord. Your account token is never included.
                </Text>

                <Text variant="text-sm/semibold" style={{ marginBottom: 4 }}>What to share</Text>
                <SearchableSelect options={SCOPE_OPTIONS} value={scope} onChange={(v: ShareScope) => setScope(v)} closeOnSelect />

                <Text variant="text-sm/semibold" style={{ margin: "12px 0 4px" }}>Message</Text>
                <TextInput value={note} onChange={setNote} />

                <Flex style={{ gap: 8, justifyContent: "flex-end", margin: "16px 0" }}>
                    <Button look={Button.Looks.LINK} color={Button.Colors.PRIMARY} onClick={rootProps.onClose}>Cancel</Button>
                    <Button color={Button.Colors.BRAND} disabled={busy} onClick={send}>Send</Button>
                </Flex>
            </ModalContent>
        </ModalRoot>
    );
}

function ImportCardInner({ message, attachment }: { message: Message; attachment: MessageAttachment; }) {
    const author = message.author?.username ?? "Someone";

    async function startImport() {
        let envelope: ShareEnvelope;
        try {
            envelope = await fetchShare(attachment);
        } catch (e) {
            showToast(String((e as Error)?.message ?? "Could not read that setup."), Toasts.Type.FAILURE);
            return;
        }

        Alerts.show({
            title: `Import ${author}'s Kittycord setup?`,
            body: (
                <div style={{ textAlign: "left" }}>
                    <Text variant="text-md/normal">Includes: <b>{scopeLabel(envelope.scope)}</b></Text>
                    {envelope.enabledPlugins.length > 0 && (
                        <Text variant="text-sm/normal" style={{ opacity: 0.8, marginTop: 4 }}>
                            {envelope.enabledPlugins.length} enabled plugin(s) in this setup.
                        </Text>
                    )}
                    <Text variant="text-sm/normal" style={{ marginTop: 8 }}>
                        This merges into your current settings and needs a restart afterwards. It can't be undone automatically.
                    </Text>
                </div>
            ),
            confirmText: "Import",
            cancelText: "Cancel",
            onConfirm: async () => {
                try {
                    await applyShare(envelope);
                    restartPrompt();
                } catch (e) {
                    showToast(String((e as Error)?.message ?? "Import failed."), Toasts.Type.FAILURE);
                }
            }
        });
    }

    return (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, margin: "4px 0", borderRadius: 8, background: "var(--background-secondary)" }}>
            <Text variant="text-md/semibold" style={{ flex: 1 }}>📦 {author} shared their Kittycord setup</Text>
            <Button size={Button.Sizes.SMALL} color={Button.Colors.BRAND} onClick={startImport}>Import</Button>
        </div>
    );
}

const ImportCard = ErrorBoundary.wrap(ImportCardInner, { noop: true });

export default definePlugin({
    name: "ShareSetup",
    description: "Send your Kittycord plugins, themes and settings to a friend in one click. They get a one-tap import card right in the DM.",
    authors: [{ name: "Kittycord", id: 0n }],
    tags: ["Utility"],
    dependencies: ["MessageAccessoriesAPI", "ContextMenuAPI"],

    contextMenus: {
        "user-context"(children, { user }: { user?: User; }) {
            if (!user || user.bot || !RelationshipStore.isFriend(user.id)) return;
            children.push(
                <Menu.MenuItem
                    id="vc-sharesetup-send"
                    label="Send my Kittycord setup…"
                    action={() => openModal(props => <SendModal rootProps={props} user={user} />)}
                />
            );
        }
    },

    renderMessageAccessory({ message }) {
        if (message.author?.id === UserStore.getCurrentUser()?.id) return null;
        const attachment = findShareAttachment(message.attachments);
        if (!attachment) return null;
        return <ImportCard message={message} attachment={attachment} />;
    }
});
