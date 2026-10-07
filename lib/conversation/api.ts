import { type PublicUser, clearAccessToken, setAccessToken, authApi } from "@/lib/auth/api"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"

export type MessageAttachment = {
  id: string
  originalFilename: string
  contentType: string
  sizeBytes: number
  sortOrder: number
}

export type ConversationAttachment = {
  id: string
  messageId: number
  originalFilename: string
  contentType: string
  sizeBytes: number
  sortOrder: number
  createdAt: string
}

export type AttachmentKind = "all" | "media" | "files"

export type Message = {
  id: number
  conversationId: number
  sender: PublicUser
  body: string | null
  clientMessageId: string
  createdAt: string
  attachments?: MessageAttachment[]
  receipts: MessageReceipt[]
}

export type AttachmentCommit = {
  objectKey: string
  originalFilename: string
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
  avatarUrl: string | null
  otherUser: Pick<PublicUser, "id" | "username" | "displayName" | "avatarUrl"> | null
  latestMessage: Message | null
  unreadCount: number
  updatedAt: string
  online: boolean
}

export type ConversationMember = {
  userId: number
  username: string
  displayName: string
  avatarUrl: string | null
  joinedAt: string
}

export type Conversation = {
  id: number
  type: "DIRECT" | "GROUP"
  name: string | null
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
  members: ConversationMember[]
}

export type ConversationUpdatedEvent = {
  conversationId: number
  membership: "ACTIVE" | "REMOVED" | "DISSOLVED"
  conversation: Conversation | null
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
  send: (
    token: string,
    id: number,
    input: { body?: string | null; clientMessageId: string; attachments?: AttachmentCommit[] },
  ) =>
    request<Message>(`/conversations/${id}/messages`, token, {
      method: "POST",
      body: JSON.stringify({
        body: input.body ?? null,
        clientMessageId: input.clientMessageId,
        attachments: input.attachments ?? [],
      }),
    }),
  createAttachmentUpload: (
    token: string,
    id: number,
    input: { contentType: string; contentLength: number; originalFilename: string },
  ) =>
    request<{ putUrl: string; objectKey: string; expiresAt: string }>(
      `/conversations/${id}/attachment-uploads`,
      token,
      { method: "POST", body: JSON.stringify(input) },
    ),
  async uploadAttachment(
    file: File,
    putUrl: string,
    contentType: string,
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    try {
      const response = await fetch(putUrl, {
        method: "PUT",
        // Must match the Content-Type signed into the presigned URL (not a free-form file.type).
        headers: { "Content-Type": contentType },
        body: file,
      })
      if (!response.ok) {
        return { ok: false, message: "Could not upload attachment" }
      }
      return { ok: true }
    } catch {
      return { ok: false, message: "Could not upload attachment" }
    }
  },
  downloadAttachment: (token: string, conversationId: number, messageId: number, attachmentId: string) =>
    request<{ getUrl: string; expiresAt: string }>(
      `/conversations/${conversationId}/messages/${messageId}/attachments/${attachmentId}/download`,
      token,
    ),
  listAttachments: (
    token: string,
    conversationId: number,
    options: { kind?: AttachmentKind; cursor?: string | null; limit?: number } = {},
  ) => {
    const kind = options.kind ?? "all"
    const limit = options.limit ?? 30
    const cursor = options.cursor ? `&cursor=${encodeURIComponent(options.cursor)}` : ""
    return request<Page<ConversationAttachment>>(
      `/conversations/${conversationId}/attachments?kind=${encodeURIComponent(kind)}&limit=${limit}${cursor}`,
      token,
    )
  },
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
  updateGroup: (token: string, id: number, input: { name?: string; avatarObjectKey?: string }) =>
    request<Conversation>(`/conversations/${id}`, token, { method: "PATCH", body: JSON.stringify(input) }),
  createGroupAvatarUpload: (token: string, id: number, input: { contentType: string; contentLength: number }) =>
    request<{ putUrl: string; objectKey: string; publicUrl: string; expiresAt: string }>(
      `/conversations/${id}/avatar-uploads`,
      token,
      { method: "POST", body: JSON.stringify(input) },
    ),
  addMember: (token: string, id: number, userId: number) =>
    request<Conversation>(`/conversations/${id}/members`, token, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),
  removeMember: (token: string, id: number, memberId: number) =>
    request<Conversation | undefined>(`/conversations/${id}/members/${memberId}`, token, { method: "DELETE" }),
}
