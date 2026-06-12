/*
 * Kittycord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { getCurrentChannel } from "@utils/discord";
import { ModalCloseButton as ModalCloseButtonRaw, ModalContent as ModalContentRaw, ModalHeader as ModalHeaderRaw, ModalRoot as ModalRootRaw, ModalSize } from "@utils/modal";
import type { User } from "@vencord/discord-types";
import { Button, DraftType, React, RelationshipStore, SearchableSelect, showToast, Text, TextInput, Toasts, UploadHandler, UserStore } from "@webpack/common";
import type { ComponentType } from "react";

import { sendFileToUser } from "./dm";

// The @utils/modal components are intentionally typed `never` (deprecated). Cast them so we can use them as JSX.
const ModalRoot = ModalRootRaw as ComponentType<any>;
const ModalHeader = ModalHeaderRaw as ComponentType<any>;
const ModalContent = ModalContentRaw as ComponentType<any>;
const ModalCloseButton = ModalCloseButtonRaw as ComponentType<any>;

export function ShareFileModal({ rootProps, title, blurb, buildFile, defaultNote }: {
    rootProps: any;
    title: string;
    blurb: string;
    buildFile(): File;
    defaultNote: string;
}) {
    const [target, setTarget] = React.useState<User | null>(null);
    const [note, setNote] = React.useState(defaultNote);
    const [busy, setBusy] = React.useState(false);

    const friendOptions = React.useMemo(() =>
        RelationshipStore.getFriendIDs()
            .map(id => UserStore.getUser(id))
            .filter((u): u is User => Boolean(u))
            .map(u => ({ label: u.globalName || u.username, value: u.id }))
            .sort((a, b) => a.label.localeCompare(b.label)), []);

    async function sendDm() {
        if (!target) return;
        setBusy(true);
        try {
            await sendFileToUser(target.id, buildFile(), note.trim());
            showToast(`Sent to ${target.globalName || target.username}.`, Toasts.Type.SUCCESS);
            rootProps.onClose();
        } catch (e) {
            showToast(String((e as Error)?.message ?? "Could not send that."), Toasts.Type.FAILURE);
        } finally {
            setBusy(false);
        }
    }

    function postInChat() {
        const channel = getCurrentChannel();
        if (!channel) return showToast("Open a chat first to post it there.", Toasts.Type.FAILURE);
        UploadHandler.promptToUpload([buildFile()], channel, DraftType.ChannelMessage);
        rootProps.onClose();
    }

    return (
        <ModalRoot {...rootProps} size={ModalSize.SMALL}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>{title}</Text>
                <ModalCloseButton onClick={rootProps.onClose} />
            </ModalHeader>
            <ModalContent>
                <Text variant="text-sm/normal" style={{ margin: "12px 0", opacity: 0.8 }}>{blurb}</Text>

                <Text variant="text-sm/semibold" style={{ marginBottom: 4 }}>Send to a friend</Text>
                <SearchableSelect
                    options={friendOptions}
                    value={target?.id}
                    placeholder="Pick a friend…"
                    onChange={(v: string) => setTarget(UserStore.getUser(v) ?? null)}
                    closeOnSelect
                />

                <Text variant="text-sm/semibold" style={{ margin: "12px 0 4px" }}>Message</Text>
                <TextInput value={note} onChange={setNote} />

                <Flex style={{ gap: 8, justifyContent: "flex-end", margin: "16px 0" }}>
                    <Button look={Button.Looks.LINK} color={Button.Colors.PRIMARY} onClick={postInChat}>Post in current chat</Button>
                    <Button color={Button.Colors.BRAND} disabled={!target || busy} onClick={sendDm}>Send</Button>
                </Flex>
            </ModalContent>
        </ModalRoot>
    );
}
