"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import { authApi, clearAccessToken, getAccessToken } from "@/lib/auth/api"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

type ChangePasswordFormProps = {
  onBack: () => void
}

export function ChangePasswordForm({ onBack }: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [logoutAllDevices, setLogoutAllDevices] = useState(true)
  const [touched, setTouched] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  })

  const mutation = useMutation({
    mutationFn: async () => {
      const accessToken = getAccessToken()
      if (!accessToken) throw new Error("Your session has expired. Please sign in again.")
      return authApi.changePassword({ currentPassword, newPassword }, accessToken)
    },
    onSuccess: () => {
      clearAccessToken()
      window.location.assign("/login")
    },
  })

  const currentPasswordError = touched.currentPassword && !currentPassword
    ? "Current password is required"
    : ""
  const newPasswordError = touched.newPassword && (!newPassword
    ? "New password is required"
    : newPassword.length < 8
      ? "Password must be at least 8 characters"
      : "")
  const confirmPasswordError = touched.confirmPassword && (!confirmPassword
    ? "Please confirm your new password"
    : confirmPassword !== newPassword
      ? "Passwords do not match"
      : "")
  const hasErrors = !currentPassword || newPassword.length < 8 || confirmPassword !== newPassword

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched({ currentPassword: true, newPassword: true, confirmPassword: true })
    if (hasErrors) return
    mutation.mutate()
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#0d1026]">
      <header className="flex min-h-[72px] items-center gap-3 border-b border-[#2d3560] bg-[#151b42]/90 px-5 backdrop-blur">
        <button
          className="grid size-9 place-items-center rounded-xl border border-[#2d3560] bg-[#1b2350] text-[#c0c6df] transition hover:border-[#6572ff] hover:text-white active:scale-95"
          onClick={onBack}
          aria-label="Back to settings"
          type="button"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="m-0 text-[10px] font-bold uppercase tracking-[.18em] text-[#7780a6]">Security</p>
          <h1 className="m-0 text-base font-semibold tracking-[-.02em] text-white">Change password</h1>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-[760px] px-5 py-8 lg:px-10 lg:py-12">
          <div className="mb-8">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[.16em] text-[#6572ff]">Account security</p>
            <h2 className="mt-2 max-w-[520px] text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-none tracking-[-.06em] text-white">A stronger sign-in starts here.</h2>
            <p className="mt-3 max-w-[470px] text-sm leading-relaxed text-[#9aa4c7]">Use a password you do not reuse elsewhere. You will need to sign in again after this change.</p>
          </div>
          <form className="grid gap-6 rounded-2xl border border-[#2d3560] bg-[#151b42] p-5 shadow-[0_18px_50px_rgba(4,7,28,.22)] sm:p-7" onSubmit={submit} noValidate>
            <div className="grid gap-2">
              <Label htmlFor="current-password" className="text-xs font-semibold text-[#e7e9f5]">Current password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={event => setCurrentPassword(event.target.value)}
              onBlur={() => setTouched(value => ({ ...value, currentPassword: true }))}
              autoComplete="current-password"
              aria-invalid={!!currentPasswordError}
              aria-describedby={currentPasswordError ? "current-password-error" : undefined}
            />
            {currentPasswordError && <p id="current-password-error" className="m-0 text-xs text-[#ffb5a7]" role="alert">{currentPasswordError}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-password" className="text-xs font-semibold text-[#e7e9f5]">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={event => setNewPassword(event.target.value)}
              onBlur={() => setTouched(value => ({ ...value, newPassword: true }))}
              autoComplete="new-password"
              aria-invalid={!!newPasswordError}
              aria-describedby={newPasswordError ? "new-password-error" : undefined}
            />
            {newPasswordError && <p id="new-password-error" className="m-0 text-xs text-[#ffb5a7]" role="alert">{newPasswordError}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password" className="text-xs font-semibold text-[#e7e9f5]">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
              onBlur={() => setTouched(value => ({ ...value, confirmPassword: true }))}
              autoComplete="new-password"
              aria-invalid={!!confirmPasswordError}
              aria-describedby={confirmPasswordError ? "confirm-password-error" : undefined}
            />
            {confirmPasswordError && <p id="confirm-password-error" className="m-0 text-xs text-[#ffb5a7]" role="alert">{confirmPasswordError}</p>}
            </div>
            <label className="flex items-start gap-3 rounded-xl border border-[#3a4677] bg-[#111638] p-4 text-sm transition has-[:checked]:border-[#6572ff]/70">
            <input
              className="mt-0.5 size-4 shrink-0 accent-[#2a3bff]"
              type="checkbox"
              checked={logoutAllDevices}
              onChange={event => setLogoutAllDevices(event.target.checked)}
            />
            <span>
              <span className="block">Log out of all devices</span>
              <span className="mt-1 block text-xs leading-relaxed text-[#a6adcb]">
                All active sessions are revoked when your password changes.
              </span>
            </span>
            </label>
            {mutation.isError && <p role="alert" className="m-0 rounded-xl border border-[#ffb5a7]/25 bg-[#ffb5a7]/[.08] p-3 text-xs text-[#ffb5a7]">{mutation.error.message}</p>}
            <div className="flex flex-col-reverse gap-3 border-t border-[#2d3560] pt-5 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={onBack} disabled={mutation.isPending} className="rounded-xl border-[#3a4677] text-[#dce0f2] hover:bg-[#252e68]">Cancel</Button>
              <Button type="submit" disabled={mutation.isPending || hasErrors} className="rounded-xl bg-[#6572ff] text-white hover:bg-[#5360e8]">
                {mutation.isPending ? "Changing password..." : "Save new password"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
