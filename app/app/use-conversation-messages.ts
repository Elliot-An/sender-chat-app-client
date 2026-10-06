import { useCallback, useEffect, useRef, useState } from "react"
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { conversationApi, type ConversationSummary, type Message, type MessageProgressEvent } from "@/lib/conversation/api"
import type { ChatMessage } from "./conversation-components"

export function useConversationMessages(token: string | null, activeConversation: number | null, currentUserId?: number) {
  const queryClient = useQueryClient()
  const activeConversationRef = useRef(activeConversation)
  activeConversationRef.current = activeConversation
  const [receipts, setReceipts] = useState<MessageProgressEvent[]>([])
  const pendingProgress = useRef(new Map<number, { delivered?: number; read?: number; timer?: number }>())
  const addMessageToCache = useCallback((message: Message) => {
    queryClient.setQueryData(
      ["messages", token, message.conversationId],
      (data: { pages: Array<{ items: Message[] }> } | undefined) => {
        if (!data) return data
        const exists = data.pages.some(page => page.items.some(item => item.id === message.id))
        if (exists) return data
        return {
          ...data,
          pages: data.pages.map((page, index) => index === 0
            ? { ...page, items: [message, ...page.items] }
            : page),
        }
      },
    )
  }, [queryClient, token])
  const updateConversationSummary = useCallback((message: Message) => {
    queryClient.setQueryData(
      ["conversations", token],
      (data: { items: ConversationSummary[] } | undefined) => data && {
        ...data,
        items: data.items.map(summary => summary.id === message.conversationId
          ? { ...summary, latestMessage: message, updatedAt: message.createdAt }
          : summary),
      },
    )
  }, [queryClient, token])
  const messageQuery = useInfiniteQuery({
    queryKey: ["messages", token, activeConversation],
    queryFn: ({ pageParam }) => conversationApi.messages(token as string, activeConversation as number, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: page => page.nextCursor,
    enabled: Boolean(token && activeConversation),
  })
  const sendMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: string }) =>
      conversationApi.send(token as string, id, body, crypto.randomUUID()),
    onSuccess: (message) => {
      addMessageToCache(message)
      updateConversationSummary(message)
    },
  })
  const { mutate: markDelivered } = useMutation({
    mutationFn: ({ id, messageId }: { id: number; messageId: number }) =>
      conversationApi.delivered(token as string, id, messageId),
    onSuccess: (progress, variables) => {
      queryClient.setQueryData(
        ["conversations", token],
        (data: { items: ConversationSummary[] } | undefined) => data && {
          ...data,
          items: data.items.map(summary => summary.id === variables.id
            ? { ...summary, unreadCount: progress.unreadCount }
            : summary),
        },
      )
    },
  })
  const { mutate: markReadRequest } = useMutation({
    mutationFn: ({ id, messageId }: { id: number; messageId: number }) =>
      conversationApi.read(token as string, id, messageId),
    onSuccess: (progress, variables) => {
      queryClient.setQueryData(
        ["conversations", token],
        (data: { items: ConversationSummary[] } | undefined) => data && {
          ...data,
          items: data.items.map(summary => summary.id === variables.id
            ? { ...summary, unreadCount: progress.unreadCount }
            : summary),
        },
      )
    },
  })
  const acknowledgedRead = useRef(new Map<number, number>())
  const newestMessage = messageQuery.data?.pages[0]?.items[0]

  const flushProgress = useCallback((conversationId: number) => {
    const pending = pendingProgress.current.get(conversationId)
    if (!pending) return
    if (pending.timer) window.clearTimeout(pending.timer)
    pendingProgress.current.delete(conversationId)
    if (pending.read) {
      markReadRequest({ id: conversationId, messageId: pending.read })
    } else if (pending.delivered) {
      markDelivered({ id: conversationId, messageId: pending.delivered })
    }
  }, [markDelivered, markReadRequest])

  const queueProgress = useCallback((conversationId: number, kind: "delivered" | "read", messageId: number) => {
    const pending = pendingProgress.current.get(conversationId) ?? {}
    if (kind === "read") {
      pending.read = Math.max(pending.read ?? 0, messageId)
      pending.delivered = undefined
    } else if (!pending.read) {
      pending.delivered = Math.max(pending.delivered ?? 0, messageId)
    }
    if (pending.timer) window.clearTimeout(pending.timer)
    pending.timer = window.setTimeout(() => flushProgress(conversationId), 250)
    pendingProgress.current.set(conversationId, pending)
  }, [flushProgress])

  const markRead = useCallback((message: Message) => {
    if (!token || message.sender.id === currentUserId) return
    if (acknowledgedRead.current.get(message.conversationId) === message.id) return
    acknowledgedRead.current.set(message.conversationId, message.id)
    queueProgress(message.conversationId, "read", message.id)
  }, [currentUserId, queueProgress, token])

  const handleRealtimeMessage = useCallback((message: Message) => {
    addMessageToCache(message)
    updateConversationSummary(message)
    if (message.conversationId === activeConversationRef.current) {
      markRead(message)
    } else if (message.sender.id !== currentUserId) {
      queueProgress(message.conversationId, "delivered", message.id)
    }
  }, [addMessageToCache, currentUserId, markRead, queueProgress, updateConversationSummary])

  const handleRealtimeProgress = useCallback((receipt: MessageProgressEvent) => {
    setReceipts(current => {
      const existing = current.filter(item => !(item.conversationId === receipt.conversationId
        && item.viewerId === receipt.viewerId
        && item.kind === receipt.kind))
      return [...existing, receipt]
    })
  }, [])

  useEffect(() => {
    if (!newestMessage || newestMessage.conversationId !== activeConversation) return
    markRead(newestMessage)
  }, [activeConversation, markRead, newestMessage])

  const activeMessages: ChatMessage[] = (messageQuery.data?.pages.flatMap(page => page.items) ?? []).map(message => {
    const deliveredBy = message.receipts
      .filter(receipt => receipt.deliveredAt !== null || receipt.readAt !== null)
      .map(receipt => receipt.viewerId)
    const readBy = message.receipts
      .filter(receipt => receipt.readAt !== null)
      .map(receipt => receipt.viewerId)
    const realtimeDeliveredBy = receipts
      .filter(receipt => receipt.conversationId === message.conversationId
      && receipt.throughMessageId >= message.id
      && (receipt.kind === "DELIVERED" || receipt.kind === "READ"))
      .map(receipt => receipt.viewerId)
    const realtimeReadBy = receipts
      .filter(receipt => receipt.conversationId === message.conversationId
        && receipt.kind === "READ"
        && receipt.throughMessageId >= message.id)
      .map(receipt => receipt.viewerId)
    const allDeliveredBy = [...new Set([...deliveredBy, ...realtimeDeliveredBy])]
    const allReadBy = [...new Set([...readBy, ...realtimeReadBy])]
    return {
    id: message.id,
    from: message.sender.id === currentUserId ? "me" as const : "them" as const,
    text: message.body,
    time: new Date(message.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    delivery: allReadBy.length ? "read" : allDeliveredBy.length ? "delivered" : "sent",
    deliveredBy: allDeliveredBy,
    readBy: allReadBy,
  }}).reverse()

  return { messageQuery, sendMutation, activeMessages, handleRealtimeMessage, handleRealtimeProgress, flushProgress }
}
