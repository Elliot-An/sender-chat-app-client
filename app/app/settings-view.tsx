"use client"

import {
  ArrowLeft,
  Bell,
  ChevronRight,
  KeyRound,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import type { PublicUser } from "@/lib/auth/api"

type SettingsViewProps = {
  user: PublicUser | null
  onBack: () => void
  onChangePassword: () => void
  onLogout: () => void
}

function initials(name: string) {
  return name
    .split(" ")
    .map(part => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function SettingsView({ user, onBack, onChangePassword, onLogout }: SettingsViewProps) {
  const displayName = user?.displayName || user?.username || "Your account"

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
              <div className="flex flex-wrap items-center gap-4 border-b border-[#2d3560] p-5 sm:p-6">
                <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#313b92] text-lg font-bold text-white ring-4 ring-[#313b92]/20">
                  {initials(displayName)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="m-0 truncate text-base font-semibold text-white">{displayName}</h3>
                  <p className="m-0 mt-1 truncate text-sm text-[#9aa4c7]">{user?.email ?? "Sign in to load your profile"}</p>
                </div>
                <button className="rounded-xl border border-[#3a4677] px-3.5 py-2 text-xs font-bold text-[#dce0f2] transition hover:border-[#6572ff] hover:bg-[#252e68] active:scale-[.98]" type="button">
                  Edit profile
                </button>
              </div>

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
