/*
 * Kittycord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { get, set } from "@api/DataStore";
import { updateMessage } from "@api/MessageUpdater";
import { Flex } from "@components/Flex";
import { ModalCloseButton as ModalCloseButtonRaw, ModalContent as ModalContentRaw, ModalHeader as ModalHeaderRaw, ModalRoot as ModalRootRaw, ModalSize, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Message } from "@vencord/discord-types";
import { Button, ChannelStore, MessageActions, React, Text } from "@webpack/common";
import type { ComponentType } from "react";

// The @utils/modal components are intentionally typed `never` (deprecated). Cast them so we can use them as JSX.
const ModalRoot = ModalRootRaw as ComponentType<any>;
const ModalHeader = ModalHeaderRaw as ComponentType<any>;
const ModalContent = ModalContentRaw as ComponentType<any>;
const ModalCloseButton = ModalCloseButtonRaw as ComponentType<any>;

const KEY = "Kittycord_Bookmarks";

interface Bookmark {
    messageId: string;
    channelId: string;
    guildId: string | null;
    author: string;
    content: string;
    time: number;
}

let bookmarks: Bookmark[] = [];
let ids = new Set<string>();

async function load() {
    bookmarks = (await get<Bookmark[]>(KEY)) ?? [];
    ids = new Set(bookmarks.map(b => b.messageId));
}

async function save() {
    await set(KEY, bookmarks);
    ids = new Set(bookmarks.map(b => b.messageId));
}

async function toggle(msg: Message) {
    if (ids.has(msg.id)) {
        bookmarks = bookmarks.filter(b => b.messageId !== msg.id);
    } else {
        bookmarks = [{
            messageId: msg.id,
            channelId: msg.channel_id,
            guildId: ChannelStore.getChannel(msg.channel_id)?.guild_id ?? null,
            author: msg.author?.username ?? "Unknown",
            content: (msg.content || "").slice(0, 140),
            time: Date.now()
        }, ...bookmarks];
    }
    await save();
    updateMessage(msg.channel_id, msg.id);
}

function BookmarkIcon(props: any) {
    return (
        <svg viewBox="0 0 24 24" width={24} height={24} fill="currentColor" {...props}>
            <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
        </svg>
    );
}

function BookmarksModal({ rootProps }: { rootProps: any; }) {
    const [list, setList] = React.useState<Bookmark[]>(bookmarks);

    function remove(id: string) {
        bookmarks = bookmarks.filter(b => b.messageId !== id);
        save();
        setList([...bookmarks]);
    }

    return (
        <ModalRoot {...rootProps} size={ModalSize.LARGE}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>Bookmarks ({list.length})</Text>
                <ModalCloseButton onClick={rootProps.onClose} />
            </ModalHeader>
            <ModalContent>
                {list.length === 0
                    ? <Text variant="text-md/normal" style={{ padding: "16px 0" }}>No bookmarks yet. Hover a message and click the bookmark button.</Text>
                    : list.map(b => (
                        <Flex key={b.messageId} style={{ padding: "8px 0", alignItems: "center", gap: 8 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <Text variant="text-sm/semibold">{b.author}</Text>
                                <Text variant="text-sm/normal" style={{ opacity: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {b.content || "(no text)"}
                                </Text>
                            </div>
                            <Button size={Button.Sizes.SMALL} onClick={() => {
                                MessageActions.jumpToMessage({ channelId: b.channelId, messageId: b.messageId, flash: true });
                                rootProps.onClose();
                            }}>Jump</Button>
                            <Button size={Button.Sizes.SMALL} color={Button.Colors.RED} onClick={() => remove(b.messageId)}>Remove</Button>
                        </Flex>
                    ))}
            </ModalContent>
        </ModalRoot>
    );
}

function openBookmarks() {
    openModal(props => <BookmarksModal rootProps={props} />);
}

export default definePlugin({
    name: "Bookmarks",
    description: "Privately bookmark messages (beyond Discord's 50-pin limit) with a hover button, then view and jump to them from the toolbox.",
    authors: [{ name: "Kittycord", id: 0n }],
    tags: ["Utility", "Chat"],
    dependencies: ["MessagePopoverAPI", "MessageUpdaterAPI"],

    messagePopoverButton: {
        icon: BookmarkIcon,
        render(msg: Message) {
            return {
                label: ids.has(msg.id) ? "Remove Bookmark" : "Bookmark",
                icon: BookmarkIcon,
                message: msg,
                channel: ChannelStore.getChannel(msg.channel_id),
                onClick: () => toggle(msg)
            };
        }
    },

    toolboxActions: {
        "Open Bookmarks"() {
            openBookmarks();
        }
    },

    async start() {
        await load();
    },

    stop() {
        bookmarks = [];
        ids.clear();
    }
});
