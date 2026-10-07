"use client"

import { useEffect, useRef, useState } from "react"
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  KeyRound,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import { getAccessToken, type PublicUser } from "@/lib/auth/api"
import { userApi } from "@/lib/user/api"
import { prepareAvatarFile } from "@/lib/user/prepare-avatar"
import { Avatar } from "./conversation-components"

type SettingsViewProps = {
  user: PublicUser | null
  onBack: () => void
  onChangePassword: () => void
  onLogout: () => void
  onSaved: (user: PublicUser) => void
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_BYTES = 2 * 1024 * 1024

export function SettingsView({ user, onBack, onChangePassword, onLogout, onSaved }: SettingsViewProps) {
  const displayName = user?.displayName || user?.username || "Your account"
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.displayName ?? "")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [processing, setProcessing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setName(user?.displayName ?? "")
  }, [user?.displayName])

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  async function chooseFile(next: File | null) {
    setError("")
    if (!next) {
      setFile(null)
      return
    }
    if (!ALLOWED_TYPES.includes(next.type)) {
      setError("Avatar must be a JPEG, PNG, or WebP image")
      return
    }
    if (next.size > MAX_BYTES) {
      setError("Avatar must be 2MB or smaller")
      return
    }
    setProcessing(true)
    try {
      const prepared = await prepareAvatarFile(next)
      if (prepared.size > MAX_BYTES) {
        setError("Avatar must be 2MB or smaller")
        setFile(null)
        return
      }
      setFile(prepared)
    } catch {
      setError("Could not process avatar image")
      setFile(null)
    } finally {
      setProcessing(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    const token = getAccessToken()
    if (!token || !user) {
      setError("Your session has expired. Please sign in again.")
      return
    }
    const trimmed = name.trim()
    if (!trimmed || trimmed.length > 30) {
      setError("Display name must be 1 to 30 characters")
      return
    }
    setSaving(true)
    setError("")
    try {
      let avatarObjectKey: string | undefined
      if (file) {
        const upload = await userApi.createAvatarUpload(token, {
          contentType: file.type,
          contentLength: file.size,
        })
        await userApi.uploadAvatar(file, upload.putUrl)
        avatarObjectKey = upload.objectKey
      }
      const next = await userApi.updateProfile(token, {
        displayName: trimmed,
        ...(avatarObjectKey ? { avatarObjectKey } : {}),
      })
      onSaved(next)
      setEditing(false)
      setFile(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update profile")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#0d1026]">
      <header className="flex min-h-[72px] items-center gap-3 border-b border-[#2d3560] bg-[#151b42]/90 px-5 backdrop-blur">
        <button
          className="grid size-9 place-items-center rounded-xl border border-[#2d3560] bg-[#1b2350] text-[#c0c6df] transition hover:border-[#6572ff] hover:text-white active:scale-95"
          onClick={onBack}
          aria-label="Back"
          type="button"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="m-0 text-[10px] font-bold uppercase tracking-[.18em] text-[#7780a6]">Account</p>
          <h1 className="m-0 text-base font-semibold tracking-[-.02em] text-white">Settings</h1>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto grid w-full max-w-[920px] gap-8 px-5 py-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14 lg:px-10 lg:py-12">
          <aside className="hidden lg:block">
            <p className="m-0 text-[10px] font-bold uppercase tracking-[.18em] text-[#7780a6]">Your space</p>
            <nav className="mt-5 grid gap-1 text-sm">
              <span className="flex items-center gap-3 rounded-xl bg-[#252e68] px-3 py-2.5 font-semibold text-white">
                <UserRound size={16} className="text-[#8d97ff]" />
                Profile
              </span>
              <span className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[#8d96b8]">
                <ShieldCheck size={16} />
                Security
              </span>
              <span className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[#8d96b8]">
                <Bell size={16} />
                Notifications
              </span>
            </nav>
          </aside>

          <main className="min-w-0">
            <div className="mb-8">
              <p className="m-0 text-[11px] font-bold uppercase tracking-[.16em] text-[#6572ff]">Profile</p>
              <h2 className="mt-2 text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-none tracking-[-.06em] text-white">Make Sender yours.</h2>
              <p className="mt-3 max-w-[430px] text-sm leading-relaxed text-[#9aa4c7]">Manage your identity, account security, and the way Sender keeps you in the loop.</p>
            </div>

            <section className="overflow-hidden rounded-2xl border border-[#2d3560] bg-[#151b42] shadow-[0_18px_50px_rgba(4,7,28,.22)]">
              {editing ? (
                <form className="p-5 sm:p-6" onSubmit={save}>
                  <div className="flex flex-wrap items-center gap-4">
                    <button type="button" className="rounded-2xl" onClick={() => inputRef.current?.click()} aria-label="Choose avatar">
                      <Avatar name={trimmedOr(name, displayName)} color="#4338ca" size="lg" imageUrl={preview ?? user?.avatarUrl} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <label className="grid gap-2 text-[11px] font-bold uppercase tracking-[.16em] text-[#7780a6]">
                        Display name
                        <input
                          className="rounded-xl border border-[#2d3560] bg-[#111638] px-3 py-2 text-sm font-semibold normal-case tracking-normal text-white outline-none focus:border-[#6572ff]"
                          maxLength={30}
                          value={name}
                          onChange={event => setName(event.target.value)}
                          required
                        />
                      </label>
                      <p className="m-0 mt-2 text-xs text-[#9aa4c7]">Username @{user?.username} stays the same.</p>
                    </div>
                  </div>
                  <input
                    ref={inputRef}
                    className="sr-only"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={event => chooseFile(event.target.files?.[0] ?? null)}
                  />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="rounded-xl bg-[#2a3bff] px-3.5 py-2 text-xs font-bold text-white disabled:opacity-50" disabled={saving || processing} type="submit">
                      {saving ? "Saving..." : processing ? "Processing..." : "Save profile"}
                    </button>
                    <button
                      className="rounded-xl border border-[#3a4677] px-3.5 py-2 text-xs font-bold text-[#dce0f2]"
                      type="button"
                      onClick={() => { setEditing(false); setFile(null); setError(""); setName(user?.displayName ?? "") }}
                    >
                      Cancel
                    </button>
                  </div>
                  {error && <p className="mt-3 text-xs text-[#ffb5a7]">{error}</p>}
                </form>
              ) : (
                <div className="flex flex-wrap items-center gap-4 border-b border-[#2d3560] p-5 sm:p-6">
                  <Avatar name={displayName} color="#4338ca" size="lg" imageUrl={user?.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <h3 className="m-0 truncate text-base font-semibold text-white">{displayName}</h3>
                    <p className="m-0 mt-1 truncate text-sm text-[#9aa4c7]">{user?.email ?? "Sign in to load your profile"}</p>
                  </div>
                  <button
                    className="rounded-xl border border-[#3a4677] px-3.5 py-2 text-xs font-bold text-[#dce0f2] transition hover:border-[#6572ff] hover:bg-[#252e68] active:scale-[.98]"
                    type="button"
                    onClick={() => { setEditing(true); setError(""); setName(user?.displayName ?? "") }}
                  >
                    Edit profile
                  </button>
                </div>
              )}

              <div className="p-5 sm:p-6">
                <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.16em] text-[#7780a6]">
                  <KeyRound size={14} className="text-[#6572ff]" />
                  Security
                </div>
                <button
                  className="group flex w-full items-center gap-4 rounded-xl border border-[#2d3560] bg-[#111638] p-4 text-left transition hover:border-[#6572ff]/60 hover:bg-[#1b2350] active:scale-[.995]"
                  onClick={onChangePassword}
                  type="button"
                >
                  <span className="grid size-9 place-items-center rounded-lg bg-[#252e68] text-[#9da6ff]">
                    <KeyRound size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-white">Change password</span>
                    <span className="mt-1 block text-xs text-[#8993b7]">Update your password and revoke active sessions.</span>
                  </span>
                  <ChevronRight size={17} className="text-[#7780a6] transition group-hover:translate-x-0.5 group-hover:text-white" />
                </button>
              </div>
            </section>

            <section className="mt-5 rounded-2xl border border-[#2d3560] bg-[#151b42] p-5 sm:p-6">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.16em] text-[#7780a6]">
                <Bell size={14} className="text-[#6572ff]" />
                Notifications
              </div>
              <label className="flex items-center justify-between gap-4 border-b border-[#2d3560] py-4 text-sm text-[#e7e9f5]">
                <span><span className="block font-medium">Desktop notifications</span><span className="mt-1 block text-xs text-[#8993b7]">Get notified when a new message arrives.</span></span>
                <input className="size-4 accent-[#6572ff]" type="checkbox" defaultChecked />
              </label>
              <label className="flex items-center justify-between gap-4 py-4 text-sm text-[#e7e9f5]">
                <span><span className="block font-medium">Message sounds</span><span className="mt-1 block text-xs text-[#8993b7]">Play a sound for incoming messages.</span></span>
                <input className="size-4 accent-[#6572ff]" type="checkbox" defaultChecked />
              </label>
            </section>

            <button className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[#6c3c55] px-3.5 py-2.5 text-xs font-bold text-[#ffb5c9] transition hover:bg-[#3a1f3a] active:scale-[.98]" onClick={onLogout} type="button">
              <LogOut size={15} />
              Log out
            </button>
          </main>
        </div>
      </div>
    </div>
  )
}

function trimmedOr(value: string, fallback: string) {
  return value.trim() || fallback
}
