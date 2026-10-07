import { authApi, clearAccessToken, setAccessToken, type PublicUser } from "@/lib/auth/api"

export type UserSummary = Pick<PublicUser, "id" | "username" | "displayName" | "avatarUrl"> & {
  online?: boolean
}
export type Friendship = {
  id: number
  requester: UserSummary
  addressee: UserSummary
  status: "PENDING" | "ACCEPTED" | "DECLINED"
  createdAt: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"

let refreshPromise: Promise<string> | null = null

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = authApi.refresh()
      .then(result => {
        setAccessToken(result.accessToken)
        return result.accessToken
      })
      .catch(error => {
        clearAccessToken()
        throw error
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

async function request<T>(path: string, token: string, init: RequestInit = {}, canRefresh = true): Promise<T> {
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers },
  })
  if (response.status === 401 && canRefresh) {
    const nextToken = await refreshAccessToken()
    return request<T>(path, nextToken, init, false)
  }
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(error?.message ?? "Request failed")
  }
  return response.json() as Promise<T>
}

export const socialApi = {
  friends: (token: string) => request<Friendship[]>("/friendships", token),
  requests: (token: string) => request<Friendship[]>("/friendships/requests", token),
  searchUsers: (token: string, query: string) =>
    request<UserSummary[]>(`/users/search?q=${encodeURIComponent(query)}`, token),
  sendRequest: (token: string, userId: number) =>
    request<Friendship>("/friendships", token, { method: "POST", body: JSON.stringify({ userId }) }),
  decideRequest: (token: string, friendshipId: number, decision: "ACCEPT" | "DECLINE") =>
    request<Friendship>(`/friendships/${friendshipId}`, token, {
      method: "PATCH",
      body: JSON.stringify({ decision }),
    }),
}
