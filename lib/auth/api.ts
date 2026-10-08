import {
  type AuthErrorBody,
  httpAuthError,
  networkAuthError,
} from "@/lib/auth/errors"

export type PublicUser = {
  id: number;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
};

export type AuthResponse = {
  user: PublicUser;
  accessToken: string;
  accessTokenExpiresAt: string;
};

export { AuthApiError, getAuthErrorPresentation } from "@/lib/auth/errors"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const ACCESS_TOKEN_COOKIE = "sender_access_token";

export function getAccessToken() {
  if (typeof document === "undefined") return null;
  const value = document.cookie
    .split("; ")
    .find(cookie => cookie.startsWith(`${ACCESS_TOKEN_COOKIE}=`))
    ?.slice(ACCESS_TOKEN_COOKIE.length + 1);
  return value ? decodeURIComponent(value) : null;
}

export function setAccessToken(token: string) {
  document.cookie = `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}; Path=/; SameSite=Lax`;
}

export function clearAccessToken() {
  document.cookie = `${ACCESS_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_URL}/api/v1${path}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...init.headers },
    })
  } catch (cause) {
    throw networkAuthError(cause)
  }

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as AuthErrorBody | null
    throw httpAuthError(response.status, error)
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const authApi = {
  register(input: { username: string; email: string; password: string }) {
    return request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  login(input: { email: string; password: string }) {
    return request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  refresh() {
    return request<AuthResponse>("/auth/refresh", { method: "POST" });
  },
  logout(allDevices = false) {
    return request<void>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ allDevices }),
    });
  },
  changePassword(input: { currentPassword: string; newPassword: string }, accessToken: string) {
    return request<void>("/auth/change-password", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(input),
    });
  },
  me(accessToken: string) {
    return request<PublicUser>("/auth/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
};
