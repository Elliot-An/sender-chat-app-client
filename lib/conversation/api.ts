import { type PublicUser, clearAccessToken, setAccessToken, authApi } from "@/lib/auth/api"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"

export type Message = {
  id: number
  conversationId: number
  sender: PublicUser
  body: string
  clientMessageId: string
  createdAt: string
  receipts: MessageReceipt[]
}

export type MessageReceipt = {
  viewerId: number
  deliveredAt: string | null
  readAt: string | null
}

export type MessageProgressEvent = {
  kind: "DELIVERED" | "READ"
  conversationId: number
  viewerId: number
  throughMessageId: number
  occurredAt?: string
}

export type MessageProgress = {
  conversationId: number
  deliveredThroughMessageId: number | null
  deliveredAt: string | null
  readThroughMessageId: number | null
  readAt: string | null
  unreadCount: number
}

export type MessageSearchResult = {
  message: Message
  rank: number
  snippet: string
}

export type MessageSearchPage = Page<MessageSearchResult>

export type ConversationSummary = {
  id: number
  type: "DIRECT" | "GROUP"
  name: string | null
  otherUser: Pick<PublicUser, "id" | "username" | "displayName"> | null
  latestMessage: Message | null
  unreadCount: number
  updatedAt: string
}

export type Conversation = {
  id: number
  type: "DIRECT" | "GROUP"
  name: string | null
  createdAt: string
  updatedAt: string
  members: Array<{ userId: number; username: string; displayName: string; joinedAt: string }>
}

type Page<T> = { items: T[]; nextCursor: string | null; hasMore: boolean }

let refreshPromise: Promise<string> | null = null

async function refresh() {
  if (!refreshPromise) {
    refreshPromise = authApi.refresh().then(result => {
      setAccessToken(result.accessToken)
      return result.accessToken
    }).catch(error => {
      clearAccessToken()
      throw error
    }).finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

async function request<T>(path: string, token: string, init: RequestInit = {}, canRefresh = true): Promise<T> {
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers },
  })
  if (response.status === 401 && canRefresh) return request(path, await refresh(), init, false)
  if (!response.ok) {
    const error = await response.json().catch(() => null) as { message?: string } | null
    throw new Error(error?.message ?? "Request failed")
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>
}

export const conversationApi = {
  list: (token: string) => request<Page<ConversationSummary>>("/conversations?limit=50", token),
  get: (token: string, id: number) => request<Conversation>(`/conversations/${id}`, token),
  messages: (token: string, id: number, cursor?: string | null) =>
    request<Page<Message>>(`/conversations/${id}/messages?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`, token),
  searchMessages: (token: string, id: number, query: string, cursor?: string | null) =>
    request<MessageSearchPage>(`/conversations/${id}/messages/search?q=${encodeURIComponent(query)}&limit=30${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`, token),
  send: (token: string, id: number, body: string, clientMessageId: string) =>
    request<Message>(`/conversations/${id}/messages`, token, { method: "POST", body: JSON.stringify({ body, clientMessageId }) }),
  delivered: (token: string, id: number, messageId: number) =>
    request<MessageProgress>(`/conversations/${id}/delivery`, token, {
      method: "POST",
      body: JSON.stringify({ messageId }),
    }),
  read: (token: string, id: number, messageId: number) =>
    request<MessageProgress>(`/conversations/${id}/read`, token, {
      method: "POST",
      body: JSON.stringify({ messageId }),
    }),
  direct: (token: string, otherUserId: number) =>
    request<Conversation>(`/conversations/direct`, token, { method: "POST", body: JSON.stringify({ otherUserId }) }),
  group: (token: string, name: string, memberIds: number[]) =>
    request<Conversation>(`/conversations/group`, token, { method: "POST", body: JSON.stringify({ name, memberIds }) }),
}
