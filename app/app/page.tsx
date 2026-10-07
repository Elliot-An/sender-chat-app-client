"use client"

import Image from "next/image"
import {useCallback, useEffect, useMemo, useRef, useState} from "react"
import {useQuery, useQueryClient} from "@tanstack/react-query"
import {
    Check,
    MessageCirclePlus,
    Search,
    Settings,
    UserPlus,
    X,
} from "lucide-react"
import {
    authApi,
    clearAccessToken,
    getAccessToken,
    type PublicUser,
} from "@/lib/auth/api"
import {socialApi, type Friendship, type UserSummary} from "@/lib/social/api"
import {
    conversationApi,
    type ConversationSummary,
    type ConversationUpdatedEvent,
    type Message,
    type MessageProgressEvent,
} from "@/lib/conversation/api"
import {connectRealtime, type RealtimeEvent} from "@/lib/realtime/client"
import {Avatar} from "./avatar"
import {ChangePasswordForm} from "./change-password-form"
import {ChatView} from "./chat-view"
import {InfoPanel} from "./info-panel"
import {MessageSearch} from "./message-search"
import {NewGroupView} from "./new-group-view"
import {SettingsView} from "./settings-view"
import {AVATAR_COLORS, initials, type Conversation, type ConversationMemberProfile} from "./types"
import {useConversationMessages} from "./use-conversation-messages"

function formatUser(user: UserSummary) {
    return user.displayName || user.username
}

function summaryToConversation(summary: ConversationSummary): Conversation {
    const name =
        summary.name ||
        summary.otherUser?.displayName ||
        summary.otherUser?.username ||
        "Conversation"
    return {
        id: summary.id,
        name,
        initials: initials(name),
        color: AVATAR_COLORS[summary.id % AVATAR_COLORS.length],
        online: false,
        group: summary.type === "GROUP",
        avatarUrl:
            summary.type === "GROUP"
                ? summary.avatarUrl
                : (summary.otherUser?.avatarUrl ?? null),
        unreadCount: summary.unreadCount,
        messages: summary.latestMessage
            ? [
                {
                    id: summary.latestMessage.id,
                    from: "them" as const,
                    text: summary.latestMessage.body,
                    time: new Date(summary.latestMessage.createdAt).toLocaleTimeString(
                        "en-US",
                        {hour: "numeric", minute: "2-digit"},
                    ),
                    createdAt: summary.latestMessage.createdAt,
                    senderId: summary.latestMessage.sender.id,
                    senderName:
                        summary.latestMessage.sender.displayName ||
                        summary.latestMessage.sender.username,
                    senderAvatarUrl: summary.latestMessage.sender.avatarUrl,
                    senderColor:
                        AVATAR_COLORS[
                            summary.latestMessage.sender.id % AVATAR_COLORS.length
                        ],
                    delivery: "sent" as const,
                    deliveredBy: [],
                    readBy: [],
                },
            ]
            : [],
    }
}

export default function AppPage() {
    const [currentUser, setCurrentUser] = useState<PublicUser | null>(null)
    const [friends, setFriends] = useState<Friendship[]>([])
    const [requests, setRequests] = useState<Friendship[]>([])
    const [searchResults, setSearchResults] = useState<UserSummary[]>([])
    const [search, setSearch] = useState("")
    const [activeTab, setActiveTab] = useState<"conversations" | "friends">(
        "conversations",
    )
    const [activeConversation, setActiveConversation] = useState<number | null>(
        null,
    )
    const [message, setMessage] = useState("")
    const [showInfo, setShowInfo] = useState(false)
    const [view, setView] = useState<
        "chat" | "settings" | "change-password" | "new-group"
    >("chat")
    const [loadingSocial, setLoadingSocial] = useState(true)
    const [sentRequestUserIds, setSentRequestUserIds] = useState<number[]>([])
    const [messageSearchOpen, setMessageSearchOpen] = useState(false)
    const [highlightedMessageId, setHighlightedMessageId] = useState<
        number | null
    >(null)
    const [typingByConversation, setTypingByConversation] = useState<
        Record<number, Record<number, number>>
    >({})
    const typingPublisher = useRef<
        (conversationId: number, state: "STARTED" | "STOPPED") => void
    >(() => {
    })

    const token = getAccessToken()
    const queryClient = useQueryClient()
    const conversationQuery = useQuery({
        queryKey: ["conversations", token],
        queryFn: () => conversationApi.list(token as string),
        enabled: Boolean(token),
    })
    const activeConversationDetails = useQuery({
        queryKey: ["conversation", token, activeConversation],
        queryFn: () =>
            conversationApi.get(token as string, activeConversation as number),
        enabled: Boolean(token && activeConversation),
    })
    const {
        messageQuery,
        sendMutation,
        activeMessages,
        handleRealtimeMessage,
        handleRealtimeProgress,
    } = useConversationMessages(token, activeConversation, currentUser?.id)
    const conversations = useMemo(
        () => (conversationQuery.data?.items ?? []).map(summaryToConversation),
        [conversationQuery.data],
    )
    const active = useMemo(() => {
        const base = conversations.find(item => item.id === activeConversation) ?? null
        if (!base) return null
        const details = activeConversationDetails.data
        if (!details || details.id !== base.id) return base
        const group = details.type === "GROUP"
        const name =
            details.name ||
            details.members.find(member => member.userId !== currentUser?.id)?.displayName ||
            base.name
        return {
            ...base,
            name,
            initials: initials(name),
            group,
            members: group ? details.members.length : undefined,
            avatarUrl: group ? details.avatarUrl : base.avatarUrl,
        }
    }, [
        activeConversation,
        activeConversationDetails.data,
        conversations,
        currentUser?.id,
    ])

    useEffect(() => {
        if (activeConversation !== null || !conversations.length) return
        // Desktop: open the first conversation. Mobile keeps the list until the user picks one.
        if (window.matchMedia("(min-width: 721px)").matches) {
            setActiveConversation(conversations[0].id)
        }
    }, [activeConversation, conversations])

    useEffect(() => {
        if (!token) return
        Promise.all([socialApi.friends(token), socialApi.requests(token)])
            .then(async ([accepted, incoming]) => {
                const user = await authApi.me(getAccessToken() ?? token)
                setCurrentUser(user)
                setFriends(accepted)
                setRequests(incoming)
            })
            .catch(error => console.error("Could not load contacts", error))
            .finally(() => setLoadingSocial(false))
    }, [token])

    useEffect(() => {
        if (!token) return
        return connectRealtime({
            token,
            onReady: publish => {
                typingPublisher.current = publish
            },
            onConnected: reconnected => {
                console.info(
                    `[realtime] client connected${reconnected ? " after reconnect" : ""}`,
                )
            },
            onEvent: (event: RealtimeEvent) => {
                if (event.type === "MESSAGE_CREATED") {
                    const payload = event.payload as { message?: Message }
                    const incoming = payload.message
                    if (!incoming) return
                    handleRealtimeMessage(incoming)
                    return
                }
                if (event.type === "MESSAGE_DELIVERED" || event.type === "MESSAGE_READ") {
                    const payload = event.payload as MessageProgressEvent
                    handleRealtimeProgress({
                        ...payload,
                        kind: event.type === "MESSAGE_READ" ? "READ" : "DELIVERED",
                    })
                    return
                }
                if (event.type === "TYPING_STARTED" || event.type === "TYPING_STOPPED") {
                    const payload = event.payload as {
                        conversationId?: number
                        userId?: number
                        expiresAt?: string
                    }
                    if (!payload.conversationId || !payload.userId) return
                    setTypingByConversation(current => {
                        const conversation = {
                            ...(current[payload.conversationId!] ?? {}),
                        }
                        if (event.type === "TYPING_STOPPED") {
                            delete conversation[payload.userId!]
                        } else {
                            conversation[payload.userId!] = payload.expiresAt
                                ? Date.parse(payload.expiresAt)
                                : Date.now() + 5000
                        }
                        return {...current, [payload.conversationId!]: conversation}
                    })
                    return
                }
                if (event.type === "CONVERSATION_UPDATED") {
                    const payload = event.payload as ConversationUpdatedEvent
                    if (
                        payload.membership === "REMOVED" ||
                        payload.membership === "DISSOLVED"
                    ) {
                        queryClient.setQueryData(
                            ["conversations", token],
                            (data: { items: ConversationSummary[] } | undefined) =>
                                data && {
                                    ...data,
                                    items: data.items.filter(
                                        item => item.id !== payload.conversationId,
                                    ),
                                },
                        )
                        queryClient.removeQueries({
                            queryKey: ["conversation", token, payload.conversationId],
                        })
                        queryClient.removeQueries({
                            queryKey: ["messages", token, payload.conversationId],
                        })
                        setActiveConversation(current =>
                            current === payload.conversationId ? null : current,
                        )
                        setShowInfo(false)
                        return
                    }
                    if (payload.conversation) {
                        const updated = payload.conversation
                        queryClient.setQueryData(
                            ["conversation", token, updated.id],
                            updated,
                        )
                        queryClient.setQueryData(
                            ["conversations", token],
                            (data: { items: ConversationSummary[] } | undefined) => {
                                if (!data) return data
                                const nextSummary: ConversationSummary = {
                                    id: updated.id,
                                    type: updated.type,
                                    name: updated.name,
                                    avatarUrl: updated.avatarUrl,
                                    otherUser: null,
                                    latestMessage: null,
                                    unreadCount: 0,
                                    updatedAt: updated.updatedAt,
                                }
                                const exists = data.items.some(item => item.id === updated.id)
                                return {
                                    ...data,
                                    items: exists
                                        ? data.items.map(item =>
                                              item.id === updated.id
                                                  ? {
                                                        ...item,
                                                        name: updated.name,
                                                        avatarUrl: updated.avatarUrl,
                                                        type: updated.type,
                                                        updatedAt: updated.updatedAt,
                                                    }
                                                  : item,
                                          )
                                        : [nextSummary, ...data.items],
                                }
                            },
                        )
                    }
                    return
                }
                const payload = event.payload as { friendship?: Friendship }
                if (!payload.friendship) return
                if (event.type === "FRIEND_REQUEST_CREATED") {
                    setRequests(items =>
                        items.some(item => item.id === payload.friendship?.id)
                            ? items
                            : [payload.friendship as Friendship, ...items],
                    )
                    return
                }
                if (
                    event.type === "FRIENDSHIP_UPDATED" &&
                    payload.friendship.status === "ACCEPTED"
                ) {
                    setFriends(items =>
                        items.some(item => item.id === payload.friendship?.id)
                            ? items
                            : [...items, payload.friendship as Friendship],
                    )
                }
            },
            onReconnect: () => {
                setTypingByConversation({})
                queryClient.invalidateQueries({queryKey: ["conversations", token]})
                queryClient.invalidateQueries({queryKey: ["messages", token]})
                Promise.all([socialApi.requests(token), socialApi.friends(token)])
                    .then(([incoming, accepted]) => {
                        setRequests(incoming)
                        setFriends(accepted)
                    })
                    .catch(error =>
                        console.error("Could not reconcile realtime state", error),
                    )
            },
        })
    }, [handleRealtimeMessage, handleRealtimeProgress, queryClient, token])

    useEffect(() => {
        const timer = window.setInterval(() => {
            const now = Date.now()
            setTypingByConversation(current =>
                Object.fromEntries(
                    Object.entries(current)
                        .map(([conversationId, users]) => [
                            conversationId,
                            Object.fromEntries(
                                Object.entries(users).filter(([, expiresAt]) => expiresAt > now),
                            ),
                        ])
                        .filter(([, users]) => Object.keys(users).length),
                ),
            )
        }, 1000)
        return () => window.clearInterval(timer)
    }, [])

    const sendTyping = useCallback(
        (state: "STARTED" | "STOPPED") => {
            if (activeConversation) typingPublisher.current(activeConversation, state)
        },
        [activeConversation],
    )
    const memberProfiles: ConversationMemberProfile[] = useMemo(() => {
        const byId = new Map<number, ConversationMemberProfile>()
        for (const member of activeConversationDetails.data?.members ?? []) {
            byId.set(member.userId, {
                userId: member.userId,
                name: member.displayName || member.username,
                avatarUrl: member.avatarUrl,
                color: AVATAR_COLORS[member.userId % AVATAR_COLORS.length],
            })
        }
        const otherUser = conversationQuery.data?.items.find(
            item => item.id === activeConversation,
        )?.otherUser
        if (otherUser && !byId.has(otherUser.id)) {
            byId.set(otherUser.id, {
                userId: otherUser.id,
                name: otherUser.displayName || otherUser.username,
                avatarUrl: otherUser.avatarUrl,
                color: AVATAR_COLORS[otherUser.id % AVATAR_COLORS.length],
            })
        }
        for (const message of activeMessages) {
            if (byId.has(message.senderId)) continue
            byId.set(message.senderId, {
                userId: message.senderId,
                name: message.senderName,
                avatarUrl: message.senderAvatarUrl,
                color: message.senderColor,
            })
        }
        return [...byId.values()]
    }, [
        activeConversation,
        activeConversationDetails.data?.members,
        activeMessages,
        conversationQuery.data?.items,
    ])
    const typingNames = memberProfiles
        .filter(member =>
            Object.prototype.hasOwnProperty.call(
                typingByConversation[active?.id ?? 0] ?? {},
                member.userId,
            ),
        )
        .map(member => member.name)

    useEffect(() => {
        if (!token || search.trim().length < 2) return
        const timeout = window.setTimeout(() => {
            socialApi
                .searchUsers(token, search.trim())
                .then(setSearchResults)
                .catch(error => console.error("Search failed", error))
        }, 250)
        return () => window.clearTimeout(timeout)
    }, [search, token])

    const friendUsers = useMemo(
        () =>
            friends.map(friend => {
                const user =
                    friend.requester.id === currentUser?.id
                        ? friend.addressee
                        : friend.requester
                return {...user, friendshipId: friend.id}
            }),
        [friends, currentUser],
    )
    const friendIds = useMemo(
        () => new Set(friendUsers.map(user => user.id)),
        [friendUsers],
    )
    const sentRequestIds = useMemo(
        () => new Set(sentRequestUserIds),
        [sentRequestUserIds],
    )

    const visibleConversations = conversations.filter(
        item => !search || item.name.toLowerCase().includes(search.toLowerCase()),
    )

    function openConversation(id: number) {
        setActiveConversation(id)
        setView("chat")
        setShowInfo(false)
        setMessageSearchOpen(false)
        setHighlightedMessageId(null)
    }

    async function openSearchResult(messageId: number) {
        if (!activeConversation) return
        setMessageSearchOpen(false)
        setShowInfo(false)
        let pages = messageQuery.data?.pages ?? []
        while (
            !pages.some(page => page.items.some(item => item.id === messageId)) &&
            messageQuery.hasNextPage
            ) {
            const next = await messageQuery.fetchNextPage()
            pages = next.data?.pages ?? pages
        }
        if (pages.some(page => page.items.some(item => item.id === messageId))) {
            setHighlightedMessageId(messageId)
            window.setTimeout(() => setHighlightedMessageId(null), 2500)
        }
    }

    async function startDirect(userId: number) {
        if (!token) return
        try {
            const conversation = await conversationApi.direct(token, userId)
            await queryClient.invalidateQueries({queryKey: ["conversations", token]})
            openConversation(conversation.id)
        } catch (error) {
            console.error("Could not create conversation", error)
        }
    }

    async function createGroup(name: string, memberIds: number[]) {
        if (!token) return
        try {
            const conversation = await conversationApi.group(token, name, memberIds)
            await queryClient.invalidateQueries({queryKey: ["conversations", token]})
            openConversation(conversation.id)
        } catch (error) {
            console.error("Could not create group", error)
        }
    }

    function sendMessage(event: React.FormEvent) {
        event.preventDefault()
        const text = message.trim()
        if (!text || !active) return
        sendMutation.mutate({id: active.id, body: text})
        setMessage("")
    }

    async function decideRequest(
        friendshipId: number,
        decision: "ACCEPT" | "DECLINE",
    ) {
        if (!token) return
        try {
            const friendship = await socialApi.decideRequest(
                token,
                friendshipId,
                decision,
            )
            setRequests(items => items.filter(item => item.id !== friendshipId))
            if (decision === "ACCEPT") {
                setFriends(items => [...items, friendship])
            }
        } catch (error) {
            console.error("Could not update request", error)
        }
    }

    async function addFriend(userId: number) {
        if (!token) return
        try {
            await socialApi.sendRequest(token, userId)
            setSentRequestUserIds(ids =>
                ids.includes(userId) ? ids : [...ids, userId],
            )
        } catch (error) {
            console.error("Could not send request", error)
        }
    }

    async function logout() {
        try {
            await authApi.logout()
        } catch (error) {
            console.error("Logout failed", error)
        } finally {
            clearAccessToken()
            window.location.assign("/login")
        }
    }

    const accountName =
        currentUser?.displayName ?? currentUser?.username ?? "Your account"

    return (
        <main
            className="grid h-dvh grid-cols-[340px_minmax(0,1fr)] overflow-hidden bg-[#151b42] font-sans text-[#f7f8ff] max-[720px]:block">
            <aside
                className={`flex min-h-0 min-w-0 flex-col border-r border-[#2d3560] bg-[#151b42] max-[720px]:h-dvh ${
                    activeConversation || view !== "chat" ? "max-[720px]:hidden" : ""
                }`}
            >
                <div className="flex items-center gap-2.5 p-2 text-xl tracking-[-.04em]">
                    <Image
                        className="block h-auto object-contain object-left"
                        src="/sender-icon.svg"
                        alt="Sender"
                        width={60}
                        height={60}
                        priority
                    />
                    <button
                        className="ml-auto grid size-9 shrink-0 place-items-center rounded-[10px] border-0 bg-transparent text-[#a6adcb] hover:bg-[#252e68] hover:text-[#2a3bff]"
                        aria-label="Create group chat"
                        onClick={() => setView("new-group")}
                    >
                        <MessageCirclePlus size={20}/>
                    </button>
                </div>

                <label
                    className="mx-4 mb-2.5 flex items-center gap-2 rounded-xl border border-[#2d3560] bg-[#0d1026] px-3 py-2 text-[#a6adcb]">
                    <Search size={17}/>
                    <input
                        className="min-w-0 w-full border-0 bg-transparent text-inherit outline-0"
                        value={search}
                        onChange={event => setSearch(event.target.value)}
                        placeholder="Search people"
                        aria-label="Search people"
                    />
                </label>

                {search && token && search.length >= 2 ? (
                    <div className="search-results">
                        <div
                            className="px-4 pb-2 pt-3.5 text-[11px] font-extrabold uppercase tracking-[.08em] text-[#a6adcb]">
                            People
                        </div>
                        {searchResults.length ? (
                            searchResults.map(user => (
                                <div
                                    className="flex w-full items-center gap-2.5 px-4 py-2.5"
                                    key={user.id}
                                >
                                    <Avatar
                                        name={formatUser(user)}
                                        color={AVATAR_COLORS[user.id % AVATAR_COLORS.length]}
                                        online
                                        imageUrl={user.avatarUrl}
                                    />
                                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                                        <b className="truncate text-sm">{formatUser(user)}</b>
                                        <span className="truncate text-xs text-[#a6adcb]">
                      @{user.username}
                    </span>
                                    </div>
                                    {friendIds.has(user.id) ? (
                                        <span className="text-xs text-[#a6adcb]">Friends</span>
                                    ) : sentRequestIds.has(user.id) ? (
                                        <span className="text-xs text-[#a6adcb]">Request sent</span>
                                    ) : (
                                        <button
                                            className="grid size-[30px] place-items-center rounded-lg border-0 bg-[#252e68] text-[#2a3bff]"
                                            onClick={() => addFriend(user.id)}
                                            aria-label={`Add ${formatUser(user)}`}
                                        >
                                            <UserPlus size={16}/>
                                        </button>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="p-6 text-center text-xs text-[#a6adcb]">
                                {loadingSocial ? "Loading people..." : "No people found"}
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <div
                            className="grid grid-cols-2 border-y border-[#2d3560]"
                            role="tablist"
                        >
                            <button
                                className={`border-0 border-b-2 border-transparent bg-transparent p-3 text-sm font-semibold text-[#a6adcb] ${
                                    activeTab === "conversations"
                                        ? "border-b-[#2a3bff] !text-[#f7f8ff]"
                                        : ""
                                }`}
                                onClick={() => setActiveTab("conversations")}
                            >
                                Conversations
                            </button>
                            <button
                                className={`relative border-0 border-b-2 border-transparent bg-transparent p-3 text-sm font-semibold text-[#a6adcb] ${
                                    activeTab === "friends"
                                        ? "border-b-[#2a3bff] !text-[#f7f8ff]"
                                        : ""
                                }`}
                                onClick={() => setActiveTab("friends")}
                            >
                                Friends
                                {requests.length > 0 && (
                                    <em className="absolute top-2 rounded-full bg-[#2a3bff] px-1.5 py-px text-[10px] not-italic text-white">
                                        {requests.length}
                                    </em>
                                )}
                            </button>
                        </div>

                        <div className="min-h-0 flex-1 overflow-auto">
                            {activeTab === "conversations" ? (
                                visibleConversations.map(conversation => (
                                    <button
                                        className={`flex w-full items-center gap-2.5 border-0 px-4 py-3 text-left ${
                                            activeConversation === conversation.id
                                                ? "bg-[#1e2752]"
                                                : "bg-transparent"
                                        } hover:bg-[#1e2752]`}
                                        key={conversation.id}
                                        onClick={() => openConversation(conversation.id)}
                                    >
                                        <Avatar
                                            name={conversation.name}
                                            color={conversation.color}
                                            online={conversation.online}
                                            imageUrl={conversation.avatarUrl}
                                        />
                                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex justify-between gap-2">
                        <b className="truncate text-sm">{conversation.name}</b>
                        <span className="flex items-center gap-2">
                          <time className="text-xs text-[#a6adcb]">
                            {conversation.messages.at(-1)?.time}
                          </time>
                            {conversation.unreadCount > 0 && (
                                <em className="min-w-5 rounded-full bg-[#2a3bff] px-1.5 py-0.5 text-center text-[10px] not-italic text-white">
                                    {conversation.unreadCount}
                                </em>
                            )}
                        </span>
                      </span>
                      <span className="truncate text-xs text-[#a6adcb]">
                        {conversation.messages.at(-1)?.from === "me"
                            ? "You: "
                            : ""}
                          {conversation.messages.at(-1)?.text}
                      </span>
                    </span>
                                    </button>
                                ))
                            ) : (
                                <>
                                    {requests.length > 0 && (
                                        <div className="border-b border-[#2d3560]">
                                            <div
                                                className="px-4 pb-2 pt-3.5 text-[11px] font-extrabold uppercase tracking-[.08em] text-[#a6adcb]">
                                                Friend requests
                                            </div>
                                            {requests.map(request => {
                                                const user = request.requester
                                                return (
                                                    <div
                                                        className="flex items-center gap-2.5 px-4 py-2.5"
                                                        key={request.id}
                                                    >
                                                        <Avatar
                                                            name={formatUser(user)}
                                                            color={
                                                                AVATAR_COLORS[user.id % AVATAR_COLORS.length]
                                                            }
                                                            online
                                                            imageUrl={user.avatarUrl}
                                                        />
                                                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                                                            <b className="truncate text-sm">
                                                                {formatUser(user)}
                                                            </b>
                                                            <span className="truncate text-xs text-[#a6adcb]">
                                Wants to connect
                              </span>
                                                        </div>
                                                        <button
                                                            className="grid size-7 place-items-center rounded-full border-0 bg-[#2a3bff] text-white"
                                                            onClick={() =>
                                                                decideRequest(request.id, "ACCEPT")
                                                            }
                                                            aria-label="Accept request"
                                                        >
                                                            <Check size={15}/>
                                                        </button>
                                                        <button
                                                            className="grid size-7 place-items-center rounded-full border border-[#2d3560] bg-transparent text-[#a6adcb]"
                                                            onClick={() =>
                                                                decideRequest(request.id, "DECLINE")
                                                            }
                                                            aria-label="Decline request"
                                                        >
                                                            <X size={15}/>
                                                        </button>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                    <div>
                                        <div
                                            className="px-4 pb-2 pt-3.5 text-[11px] font-extrabold uppercase tracking-[.08em] text-[#a6adcb]">
                                            Friends ({friendUsers.length})
                                        </div>
                                        {friendUsers.length ? (
                                            friendUsers.map(user => (
                                                <button
                                                    className="flex w-full items-center gap-2.5 border-0 bg-transparent px-4 py-3 text-left hover:bg-[#1e2752]"
                                                    key={user.id}
                                                    onClick={() => startDirect(user.id)}
                                                >
                                                    <Avatar
                                                        name={formatUser(user)}
                                                        color={
                                                            AVATAR_COLORS[user.id % AVATAR_COLORS.length]
                                                        }
                                                        online
                                                        imageUrl={user.avatarUrl}
                                                    />
                                                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="flex justify-between gap-2">
                              <b className="truncate text-sm">
                                {formatUser(user)}
                              </b>
                            </span>
                            <span className="truncate text-xs text-[#a6adcb]">
                              @{user.username}
                            </span>
                          </span>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="p-6 text-center text-xs text-[#a6adcb]">
                                                {token
                                                    ? "No friends yet"
                                                    : "Sign in to see your friends"}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                )}

                <button
                    className={`mt-auto flex h-[68px] w-full items-center gap-2.5 border-0 border-t border-[#2d3560] px-4 py-3 text-left ${
                        view === "settings" || view === "change-password"
                            ? "bg-[#1e2752]"
                            : "bg-transparent"
                    } hover:bg-[#1e2752]`}
                    onClick={() => setView("settings")}
                >
                    <Avatar
                        name={accountName}
                        color="#4338ca"
                        online
                        imageUrl={currentUser?.avatarUrl}
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
            <b className="truncate text-sm">{accountName}</b>
            <span className="truncate text-xs text-[#a6adcb]">Settings</span>
          </span>
                    <Settings size={17}/>
                </button>
            </aside>

            <section
                className={`relative flex min-h-0 min-w-0 border-l border-[#2d3560] bg-[#0d1026] max-[720px]:h-dvh ${
                    !activeConversation && view === "chat" ? "max-[720px]:hidden" : ""
                }`}
            >
                {view === "settings" ? (
                    <SettingsView
                        user={currentUser}
                        onBack={() => setView("chat")}
                        onChangePassword={() => setView("change-password")}
                        onLogout={logout}
                        onSaved={setCurrentUser}
                    />
                ) : view === "change-password" ? (
                    <ChangePasswordForm onBack={() => setView("settings")}/>
                ) : view === "new-group" ? (
                    <NewGroupView
                        onBack={() => setView("chat")}
                        friends={friendUsers}
                        onCreate={createGroup}
                    />
                ) : active ? (
                    <>
                        <ChatView
                            conversation={{...active, messages: activeMessages}}
                            members={memberProfiles}
                            message={message}
                            setMessage={setMessage}
                            onSend={sendMessage}
                            onTyping={sendTyping}
                            typingUsers={typingNames}
                            showInfo={showInfo}
                            setShowInfo={setShowInfo}
                            onBack={() => {
                                setShowInfo(false)
                                setMessageSearchOpen(false)
                                setActiveConversation(null)
                            }}
                            onLoadMore={() => messageQuery.fetchNextPage()}
                            hasMore={Boolean(messageQuery.hasNextPage)}
                            highlightedMessageId={highlightedMessageId}
                            onSearch={() => setMessageSearchOpen(true)}
                        />
                        {messageSearchOpen && token && (
                            <MessageSearch
                                token={token}
                                conversationId={active.id}
                                onClose={() => setMessageSearchOpen(false)}
                                onSelect={openSearchResult}
                            />
                        )}
                    </>
                ) : (
                    <div className="m-auto grid max-w-[360px] place-items-center p-6 text-center">
                        <Image
                            src="/sender-icon.svg"
                            loading="eager"
                            alt="Sender"
                            width={360}
                            height={360}
                        />
                        <h2 className="my-4 text-2xl font-semibold tracking-[-.04em]">
                            Your conversations, in one place.
                        </h2>
                        <p className="m-0 leading-relaxed text-[#a6adcb]">
                            Select a conversation or find someone new to message.
                        </p>
                    </div>
                )}
                {showInfo && active && token && (
                    <InfoPanel
                        conversation={active}
                        members={activeConversationDetails.data?.members ?? []}
                        currentUserId={currentUser?.id ?? null}
                        token={token}
                        friends={friendUsers}
                        onClose={() => setShowInfo(false)}
                        onSearch={() => {
                            setShowInfo(false)
                            setMessageSearchOpen(true)
                        }}
                        onConversationUpdated={conversationId => {
                            queryClient.invalidateQueries({
                                queryKey: ["conversation", token, conversationId],
                            })
                            queryClient.invalidateQueries({
                                queryKey: ["conversations", token],
                            })
                        }}
                        onLeftConversation={conversationId => {
                            queryClient.setQueryData(
                                ["conversations", token],
                                (data: { items: ConversationSummary[] } | undefined) =>
                                    data && {
                                        ...data,
                                        items: data.items.filter(
                                            item => item.id !== conversationId,
                                        ),
                                    },
                            )
                            queryClient.removeQueries({
                                queryKey: ["conversation", token, conversationId],
                            })
                            queryClient.removeQueries({
                                queryKey: ["messages", token, conversationId],
                            })
                            setShowInfo(false)
                            setActiveConversation(null)
                        }}
                    />
                )}
            </section>
        </main>
    )
}
