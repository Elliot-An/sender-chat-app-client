"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { AuthShell } from "@/components/auth/auth-shell"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { authApi, setAccessToken } from "@/lib/auth/api"

export default function RegisterPage() {
  const [form, setForm] = useState({ username: "", email: "", password: "", confirmation: "" })
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const mutation = useMutation({
    mutationFn: () => authApi.register({ username: form.username, email: form.email, password: form.password }),
  })
  const errors = {
    username: touched.username && (!form.username ? "Username is required" : !/^[A-Za-z0-9_]{3,30}$/.test(form.username) ? "Use 3-30 letters, numbers, or underscores" : ""),
    email: touched.email && (!form.email ? "Email is required" : !/^\S+@\S+\.\S+$/.test(form.email) ? "Enter a valid email" : ""),
    password: touched.password && (!form.password ? "Password is required" : form.password.length < 8 ? "Use at least 8 characters" : ""),
    confirmation: touched.confirmation && (!form.confirmation ? "Please confirm your password" : form.confirmation !== form.password ? "Passwords do not match" : ""),
  }
  const hasErrors = !/^[A-Za-z0-9_]{3,30}$/.test(form.username) || !/^\S+@\S+\.\S+$/.test(form.email) || form.password.length < 8 || form.confirmation !== form.password
  const set = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }))
  const blur = (key: string) => setTouched(current => ({ ...current, [key]: true }))

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched({ username: true, email: true, password: true, confirmation: true })
    if (hasErrors) return
    mutation.mutate(undefined, {
      onSuccess: result => {
        setAccessToken(result.accessToken)
        window.location.assign("/app")
      },
    })
  }

  const field = (key: keyof typeof form, label: string, type = "text", autoComplete?: string) => (
    <div className="grid gap-2">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        type={type}
        value={form[key]}
        onChange={event => set(key, event.target.value)}
        onBlur={() => blur(key)}
        autoComplete={autoComplete}
        aria-invalid={!!errors[key]}
        aria-describedby={errors[key] ? `${key}-error` : undefined}
        placeholder={key === "username" ? "your_username" : key === "email" ? "you@example.com" : "At least 8 characters"}
      />
      {errors[key] && <p id={`${key}-error`} className="m-0 text-[.74rem] leading-[1.4] text-[#ffb5a7]" role="alert">{errors[key]}</p>}
    </div>
  )

  return (
    <AuthShell
      eyebrow="Start fresh"
      title="Your space is ready."
      description="Create an account and bring your conversations together."
      alternateText="Already have an account?"
      alternateLabel="Sign in"
      alternateHref="/login"
    >
      <form onSubmit={submit} className="mt-7 grid gap-[.9rem]" noValidate>
        {field("username", "Username", "text", "username")}
        {field("email", "Email", "email", "email")}
        {field("password", "Password", "password", "new-password")}
        {field("confirmation", "Confirm password", "password", "new-password")}
        {mutation.isError && <p role="alert" className="m-0 rounded-lg border border-[#ffb5a7]/25 bg-[#ffb5a7]/[.08] p-3 text-[.74rem] text-[#ffb5a7]">{mutation.error.message}</p>}
        <Button type="submit" disabled={mutation.isPending} className="mt-1 h-13 w-full rounded-lg bg-[#2a3bff] text-white hover:bg-[#1d2edc]">
          {mutation.isPending ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthShell>
  )
}
