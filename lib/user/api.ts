import { type PublicUser, authApi, clearAccessToken, setAccessToken } from "@/lib/auth/api"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"

export type AvatarUpload = {
  putUrl: string
  objectKey: string
  publicUrl: string
  expiresAt: string
}

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

export const userApi = {
  createAvatarUpload(token: string, input: { contentType: string; contentLength: number }) {
    return request<AvatarUpload>("/users/me/avatar-uploads", token, {
      method: "POST",
      body: JSON.stringify(input),
    })
  },
  updateProfile(token: string, input: { displayName?: string; avatarObjectKey?: string }) {
    return request<PublicUser>("/users/me", token, {
      method: "PATCH",
      body: JSON.stringify(input),
    })
  },
  async uploadAvatar(
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
        return { ok: false, message: "Could not upload avatar" }
      }
      return { ok: true }
    } catch {
      return { ok: false, message: "Could not upload avatar" }
    }
  },
}
