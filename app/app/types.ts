export type ChatAttachment = {
    id: string
    originalFilename: string
    contentType: string
    sizeBytes: number
    sortOrder: number
}

export type ChatMessage = {
    id: number
    conversationId: number
    from: "me" | "them"
    text: string
    time: string
    createdAt: string
    senderId: number
    senderName: string
    senderAvatarUrl?: string | null
    senderColor: string
    delivery: "sent" | "delivered" | "read"
    deliveredBy: number[]
    readBy: number[]
    attachments: ChatAttachment[]
}

export type ConversationMemberProfile = {
    userId: number
    name: string
    avatarUrl?: string | null
    color: string
}

export type Conversation = {
    id: number
    name: string
    initials: string
    color: string
    online: boolean
    messages: ChatMessage[]
    members?: number
    group?: boolean
    avatarUrl?: string | null
    unreadCount: number
}

export const AVATAR_COLORS = [
    "#0f766e",
    "#9a3412",
    "#a16207",
    "#4338ca",
    "#be123c",
    "#0369a1",
] as const

export function initials(name: string) {
    return name
        .split(" ")
        .map(part => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
}
