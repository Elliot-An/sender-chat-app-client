import {Check} from "lucide-react"
import {isEmojiOnlyMessage} from "@/lib/message/emoji"
import {Avatar} from "./avatar"
import type {ChatMessage, ConversationMemberProfile} from "./types"

type MessageBubbleProps = {
    message: ChatMessage
    highlighted: boolean
    showName: boolean
    showAvatar: boolean
    isFirstInGroup: boolean
    isLastInGroup: boolean
    showDeliveryStatus: boolean
    members: ConversationMemberProfile[]
}

function DeliveryStatus({
    message,
    members,
}: {
    message: ChatMessage
    members: ConversationMemberProfile[]
}) {
    const viewers = message.readBy
        .filter(viewerId => viewerId !== message.senderId)
        .map(viewerId => {
            const member = members.find(item => item.userId === viewerId)
            return {
                userId: viewerId,
                name: member?.name ?? `User ${viewerId}`,
                avatarUrl: member?.avatarUrl,
                color: member?.color ?? "#0f766e",
            }
        })

    const seenOrDelivered = message.delivery === "read" || message.delivery === "delivered"
    const label = viewers.length
        ? "Seen"
        : seenOrDelivered
            ? "Delivered"
            : "Sent"

    return (
        <span className="inline-flex items-center gap-0.5" aria-label={label}>
            {viewers.length ? (
                <span className="flex items-center -space-x-1">
                    {viewers.map(viewer => (
                        <Avatar
                            key={viewer.userId}
                            name={viewer.name}
                            color={viewer.color}
                            size="xs"
                            imageUrl={viewer.avatarUrl}
                            className="ring-1 ring-[#0d1026]"
                            title={`Seen by ${viewer.name}`}
                        />
                    ))}
                </span>
            ) : seenOrDelivered ? (
                <span className="grid size-3.5 place-items-center rounded-full bg-[#bde9df] text-[#2a3bff]">
                    <Check size={9}/>
                </span>
            ) : (
                <Check size={12}/>
            )}
        </span>
    )
}

function bubbleRadius(
    fromMe: boolean,
    isFirstInGroup: boolean,
    isLastInGroup: boolean,
) {
    if (isFirstInGroup && isLastInGroup) return "rounded-full"
    if (fromMe) {
        if (isFirstInGroup) return "rounded-[9999px_9999px_4px_9999px]"
        if (isLastInGroup) return "rounded-[9999px_4px_9999px_9999px]"
        return "rounded-[9999px_4px_4px_9999px]"
    }
    if (isFirstInGroup) return "rounded-[9999px_9999px_9999px_4px]"
    if (isLastInGroup) return "rounded-[4px_9999px_9999px_9999px]"
    return "rounded-[4px_9999px_9999px_4px]"
}

export function MessageBubble({
    message,
    highlighted,
    showName,
    showAvatar,
    isFirstInGroup,
    isLastInGroup,
    showDeliveryStatus,
    members,
}: MessageBubbleProps) {
    const fromMe = message.from === "me"
    const largeEmoji = isEmojiOnlyMessage(message.text)

    return (
        <div
            className={`group/msg relative flex ${fromMe ? "justify-end" : "justify-start"} ${
                isLastInGroup ? "mb-3" : "mb-0.5"
            } ${highlighted ? "rounded-sm bg-[#493d8f]/20 px-1 py-0.5 transition-colors" : ""}`}
            data-message-id={message.id}
            title={message.time}
        >
            <div
                className={`flex max-w-[min(75%,460px)] ${
                    fromMe ? "flex-row-reverse" : "flex-row"
                } items-end gap-2`}
            >
                {!fromMe && (
                    <div className="flex w-[34px] shrink-0 justify-center self-end">
                        {showAvatar ? (
                            <Avatar
                                name={message.senderName}
                                color={message.senderColor}
                                size="sm"
                                imageUrl={message.senderAvatarUrl}
                            />
                        ) : null}
                    </div>
                )}

                <div
                    className={`flex min-w-0 flex-col ${fromMe ? "items-end" : "items-start"}`}
                >
                    {showName && (
                        <span className="mb-1 px-1 text-xs font-medium text-[#9da6ff]">
                            {message.senderName}
                        </span>
                    )}

                    <div
                        className={`relative flex items-center gap-2 ${
                            fromMe ? "flex-row-reverse" : "flex-row"
                        }`}
                    >
                        <div
                            className={`overflow-wrap-anywhere ${
                                largeEmoji
                                    ? "px-2 py-1 text-[40px] leading-none"
                                    : "px-3 py-2 text-[15px] leading-[1.4]"
                            } ${bubbleRadius(
                                fromMe,
                                isFirstInGroup,
                                isLastInGroup,
                            )} ${
                                fromMe
                                    ? "bg-[#2a3bff] text-white"
                                    : "border border-[#2d3560] bg-[#151b42] text-[#f7f8ff]"
                            }`}
                        >
                            {message.text}
                        </div>
                        <time
                            dateTime={message.createdAt}
                            className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-[11px] whitespace-nowrap text-[#a6adcb] opacity-0 transition-opacity [@media(hover:hover)]:group-hover/msg:opacity-100 group-focus-within/msg:opacity-100 ${
                                fromMe ? "right-full mr-2" : "left-full ml-2"
                            }`}
                        >
                            {message.time}
                        </time>
                    </div>

                    {showDeliveryStatus && (
                        <span className="mt-1 flex items-center gap-1 text-[11px] text-[#a6adcb]">
                            <DeliveryStatus message={message} members={members}/>
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}
