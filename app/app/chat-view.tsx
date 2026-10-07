"use client"

import {ArrowLeft, Info, Paperclip, Search, Send, X} from "lucide-react"
import {useEffect, useLayoutEffect, useMemo, useRef, useState} from "react"
import {conversationApi} from "@/lib/conversation/api"
import {MESSAGE_BODY_MAX_LENGTH} from "@/lib/message/emoji"
import {Avatar} from "./avatar"
import {EmojiPickerButton} from "./emoji-picker-button"
import {MessageBubble} from "./message-bubble"
import type {ChatMessage, Conversation, ConversationMemberProfile} from "./types"

const ALLOWED_ATTACHMENT_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "text/plain",
])
const MAX_ATTACHMENTS = 5
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
const MAX_TOTAL_ATTACHMENT_BYTES = 25 * 1024 * 1024

type PendingAttachment = {
    id: string
    file: File
    status: "ready" | "error"
    error?: string
}

function sameCalendarDay(a: Date, b: Date) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    )
}

function dayKey(iso: string) {
    const date = new Date(iso)
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function formatDayLabel(iso: string) {
    const date = new Date(iso)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)
    if (sameCalendarDay(date, today)) return "Today"
    if (sameCalendarDay(date, yesterday)) return "Yesterday"
    return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        ...(date.getFullYear() !== today.getFullYear() ? {year: "numeric" as const} : {}),
    })
}

type TimelineItem =
    | { kind: "day"; key: string; label: string }
    | {
    kind: "message"
    key: string
    message: ChatMessage
    showName: boolean
    showAvatar: boolean
    isFirstInGroup: boolean
    isLastInGroup: boolean
}

function buildTimeline(messages: ChatMessage[]): TimelineItem[] {
    const items: TimelineItem[] = []
    let lastDay: string | null = null

    for (let index = 0; index < messages.length; index++) {
        const message = messages[index]
        const day = dayKey(message.createdAt)
        if (day !== lastDay) {
            items.push({
                kind: "day",
                key: `day-${day}`,
                label: formatDayLabel(message.createdAt),
            })
            lastDay = day
        }

        const previous = messages[index - 1]
        const next = messages[index + 1]
        const continuesPrevious =
            previous != null &&
            previous.senderId === message.senderId &&
            dayKey(previous.createdAt) === day
        const continuesNext =
            next != null &&
            next.senderId === message.senderId &&
            dayKey(next.createdAt) === day
        const isFirstInGroup = !continuesPrevious
        const isLastInGroup = !continuesNext

        items.push({
            kind: "message",
            key: String(message.id),
            message,
            showName: message.from === "them" && isFirstInGroup,
            showAvatar: message.from === "them" && isLastInGroup,
            isFirstInGroup,
            isLastInGroup,
        })
    }

    return items
}

type ChatViewProps = {
    conversation: Conversation
    members: ConversationMemberProfile[]
    token: string
    message: string
    setMessage: (value: string) => void
    onSend: (payload: {
        body: string | null
        attachments: Array<{ objectKey: string; originalFilename: string }>
        clientMessageId: string
    }) => void
    onTyping: (state: "STARTED" | "STOPPED") => void
    typingUsers: string[]
    showInfo: boolean
    setShowInfo: (value: boolean) => void
    onBack: () => void
    onLoadMore: () => void
    hasMore: boolean
    highlightedMessageId: number | null
    onSearch: () => void
}

function conversationStatus(conversation: Conversation) {
    if (conversation.group) {
        return conversation.members
            ? `${conversation.members} members`
            : "Group"
    }
    return conversation.online ? "Active now" : "Offline"
}

function typingLabel(typingUsers: string[]) {
    if (typingUsers.length <= 3) {
        const verb = typingUsers.length === 1 ? "is" : "are"
        return `${typingUsers.join(", ")} ${verb} typing...`
    }
    const named = typingUsers.slice(0, 3).join(", ")
    return `${named} and ${typingUsers.length - 3} others are typing...`
}

export function ChatView({
     conversation,
     members,
     token,
     message,
     setMessage,
     onSend,
     onTyping,
     typingUsers,
     showInfo,
     setShowInfo,
     onBack,
     onLoadMore,
     hasMore,
     highlightedMessageId,
     onSearch,
 }: ChatViewProps) {
    const typingTimer = useRef<number | undefined>(undefined)
    const messagesScrollRef = useRef<HTMLDivElement>(null)
    const messageInputRef = useRef<HTMLInputElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([])
    const [sending, setSending] = useState(false)
    const [emojiPicker, setEmojiPicker] = useState({
        conversationId: conversation.id,
        open: false,
    })
    const emojiOpen =
        emojiPicker.conversationId === conversation.id && emojiPicker.open
    const setEmojiOpen = (open: boolean) =>
        setEmojiPicker({conversationId: conversation.id, open})
    const lastMessageId = conversation.messages.at(-1)?.id
    const showDeliveryOnMessageId =
        lastMessageId != null && conversation.messages.at(-1)?.from === "me"
            ? lastMessageId
            : null

    useEffect(
        () => () => {
            if (typingTimer.current) window.clearTimeout(typingTimer.current)
            onTyping("STOPPED")
        },
        [onTyping],
    )

    useLayoutEffect(() => {
        if (highlightedMessageId !== null) return
        const el = messagesScrollRef.current
        if (!el) return
        el.scrollTop = el.scrollHeight
    }, [conversation.id, lastMessageId, highlightedMessageId])

    function changeMessage(value: string) {
        setMessage(value)
        if (typingTimer.current) window.clearTimeout(typingTimer.current)
        if (!value.trim()) {
            onTyping("STOPPED")
            return
        }
        onTyping("STARTED")
        typingTimer.current = window.setTimeout(() => onTyping("STOPPED"), 4500)
    }

    useEffect(() => {
        if (highlightedMessageId === null) return
        document
            .querySelector(`[data-message-id="${highlightedMessageId}"]`)
            ?.scrollIntoView({behavior: "smooth", block: "center"})
    }, [highlightedMessageId, conversation.id])

    const timeline = useMemo(
        () => buildTimeline(conversation.messages),
        [conversation.messages],
    )

    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <header className="flex min-h-[67px] items-center gap-2.5 border-b border-[#2d3560] bg-[#151b42] px-4 py-3">
                <button
                    type="button"
                    className="hidden size-9 shrink-0 place-items-center rounded-[10px] border-0 bg-transparent text-[#a6adcb] max-[720px]:grid hover:bg-[#252e68] hover:text-[#2a3bff]"
                    onClick={onBack}
                    aria-label="Back"
                >
                    <ArrowLeft size={20}/>
                </button>
                <Avatar
                    name={conversation.name}
                    color={conversation.color}
                    online={conversation.online}
                    imageUrl={conversation.avatarUrl}
                />
                <div className="flex min-w-0 flex-col gap-1">
                    <b className="text-[15px]">{conversation.name}</b>
                    <span className="text-xs text-[#a6adcb]">
            {conversationStatus(conversation)}
          </span>
                </div>
                <span className="ml-auto"/>
                <button
                    className="grid size-9 shrink-0 place-items-center rounded-[10px] border-0 bg-transparent text-[#a6adcb] hover:bg-[#252e68] hover:text-[#2a3bff]"
                    onClick={onSearch}
                    aria-label="Search messages"
                >
                    <Search size={19}/>
                </button>
                <button
                    className={`grid size-9 shrink-0 place-items-center rounded-[10px] border-0 bg-transparent text-[#a6adcb] hover:bg-[#252e68] hover:text-[#2a3bff] ${
                        showInfo ? "bg-[#252e68] text-[#2a3bff]" : ""
                    }`}
                    onClick={() => setShowInfo(!showInfo)}
                    aria-label="Conversation info"
                >
                    <Info size={19}/>
                </button>
            </header>

            <div
                ref={messagesScrollRef}
                className="chat-messages-scroll flex min-h-0 flex-1 flex-col overflow-auto px-[max(18px,2vw)] py-5"
            >
                {hasMore && (
                    <button
                        className="mb-3 self-center text-xs text-[#9da6ff]"
                        onClick={onLoadMore}
                        type="button"
                    >
                        Load older messages
                    </button>
                )}
                {timeline.map(item =>
                    item.kind === "day" ? (
                        <div
                            key={item.key}
                            className="my-3 self-center text-[11px] font-medium text-[#a6adcb]"
                        >
                            {item.label}
                        </div>
                    ) : (
                        <MessageBubble
                            key={item.key}
                            token={token}
                            message={item.message}
                            highlighted={highlightedMessageId === item.message.id}
                            showName={item.showName}
                            showAvatar={item.showAvatar}
                            isFirstInGroup={item.isFirstInGroup}
                            isLastInGroup={item.isLastInGroup}
                            showDeliveryStatus={item.message.id === showDeliveryOnMessageId}
                            members={members}
                        />
                    ),
                )}
            </div>

            {typingUsers.length > 0 && (
                <div className="px-5 pb-1 text-xs text-[#a6adcb]">
                    {typingLabel(typingUsers)}
                </div>
            )}

            {pendingAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 px-4 pb-1">
                    {pendingAttachments.map(item => (
                        <span
                            key={item.id}
                            className="inline-flex max-w-full items-center gap-1 rounded-md border border-[#2d3560] bg-[#0d1026] px-2 py-1 text-xs text-[#f7f8ff]"
                        >
                            <span className="truncate">{item.file.name}</span>
                            {item.status === "error" && (
                                <span className="text-[#f87171]">{item.error ?? "Failed"}</span>
                            )}
                            <button
                                type="button"
                                className="grid size-4 place-items-center border-0 bg-transparent text-[#a6adcb]"
                                aria-label={`Remove ${item.file.name}`}
                                onClick={() =>
                                    setPendingAttachments(current =>
                                        current.filter(entry => entry.id !== item.id),
                                    )
                                }
                            >
                                <X size={12}/>
                            </button>
                        </span>
                    ))}
                </div>
            )}

            <form
                className="relative flex min-h-[68px] items-center gap-2 px-4 py-3"
                onSubmit={async event => {
                    event.preventDefault()
                    setEmojiOpen(false)
                    onTyping("STOPPED")
                    const text = message.trim()
                    if ((!text && pendingAttachments.length === 0) || sending) return
                    if (pendingAttachments.some(item => item.status === "error")) return
                    setSending(true)
                    const clientMessageId = crypto.randomUUID()
                    const uploaded: Array<{ objectKey: string; originalFilename: string }> = []
                    let failedId: string | null = null
                    let failedMessage = "Upload failed"
                    try {
                        for (const item of pendingAttachments) {
                            const contentType = item.file.type.split(";")[0].trim().toLowerCase()
                            const upload = await conversationApi.createAttachmentUpload(
                                token,
                                conversation.id,
                                {
                                    contentType,
                                    contentLength: item.file.size,
                                    originalFilename: item.file.name,
                                },
                            )
                            const put = await conversationApi.uploadAttachment(
                                item.file,
                                upload.putUrl,
                                contentType,
                            )
                            if (!put.ok) {
                                failedId = item.id
                                failedMessage = put.message
                                break
                            }
                            uploaded.push({
                                objectKey: upload.objectKey,
                                originalFilename: item.file.name,
                            })
                        }

                        if (failedId != null) {
                            setPendingAttachments(current =>
                                current.map(item =>
                                    item.id === failedId
                                        ? { ...item, status: "error" as const, error: failedMessage }
                                        : item,
                                ),
                            )
                            return
                        }

                        onSend({
                            body: text || null,
                            attachments: uploaded,
                            clientMessageId,
                        })
                        setPendingAttachments([])
                    } catch {
                        const markId = failedId ?? pendingAttachments[0]?.id
                        if (markId != null) {
                            setPendingAttachments(current =>
                                current.map(item =>
                                    item.id === markId
                                        ? { ...item, status: "error" as const, error: failedMessage }
                                        : item,
                                ),
                            )
                        }
                    } finally {
                        setSending(false)
                    }
                }}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    accept="image/jpeg,image/png,image/webp,application/pdf,text/plain"
                    onChange={event => {
                        const files = Array.from(event.target.files ?? [])
                        event.target.value = ""
                        setPendingAttachments(current => {
                            const next = [...current]
                            let total = next.reduce((sum, item) => sum + item.file.size, 0)
                            for (const file of files) {
                                if (next.length >= MAX_ATTACHMENTS) break
                                if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) continue
                                if (file.size < 1 || file.size > MAX_ATTACHMENT_BYTES) continue
                                if (total + file.size > MAX_TOTAL_ATTACHMENT_BYTES) continue
                                total += file.size
                                next.push({
                                    id: crypto.randomUUID(),
                                    file,
                                    status: "ready",
                                })
                            }
                            return next
                        })
                    }}
                />
                <button
                    type="button"
                    className="grid size-9 shrink-0 place-items-center rounded-[10px] border-0 bg-transparent text-[#a6adcb]"
                    aria-label="Attach a file"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Paperclip size={19}/>
                </button>
                <EmojiPickerButton
                    value={message}
                    onChange={changeMessage}
                    inputRef={messageInputRef}
                    open={emojiOpen}
                    onOpenChange={setEmojiOpen}
                />
                <input
                    ref={messageInputRef}
                    className="min-w-0 flex-1 rounded-[22px] border border-[#2d3560] bg-[#0d1026] px-4 py-2.5 text-[#f7f8ff] outline-0"
                    value={message}
                    onChange={event => changeMessage(event.target.value)}
                    onBlur={() => onTyping("STOPPED")}
                    placeholder="Write a message..."
                    aria-label="Message"
                    maxLength={MESSAGE_BODY_MAX_LENGTH}
                />
                <button
                    className="grid size-[38px] shrink-0 place-items-center rounded-full border-0 bg-[#2a3bff] text-white disabled:cursor-default disabled:opacity-45"
                    type="submit"
                    disabled={
                        sending
                        || (!message.trim() && pendingAttachments.length === 0)
                        || pendingAttachments.some(item => item.status === "error")
                    }
                    aria-label="Send message"
                >
                    <Send size={18}/>
                </button>
            </form>
        </div>
    )
}
