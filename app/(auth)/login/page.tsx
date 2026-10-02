"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { AuthShell } from "@/components/auth/auth-shell"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { authApi, setAccessToken } from "@/lib/auth/api"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [touched, setTouched] = useState({ email: false, password: false })
  const mutation = useMutation({ mutationFn: () => authApi.login({ email, password }) })
  const emailError = touched.email && (!email ? "Email is required" : !/^\S+@\S+\.\S+$/.test(email) ? "Enter a valid email" : "")
  const passwordError = touched.password && !password ? "Password is required" : ""
  const hasErrors = !email || !/^\S+@\S+\.\S+$/.test(email) || !password

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched({ email: true, password: true })
    if (hasErrors) return
    mutation.mutate(undefined, {
      onSuccess: result => {
        setAccessToken(result.accessToken)
        window.location.assign("/app")
      },
    })
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Good to see you."
      description="Sign in to pick up where you left off."
      alternateText="New to Sender?"
      alternateLabel="Create an account"
      alternateHref="/register"
    >
      <form onSubmit={submit} className="mt-8 grid gap-[1.15rem]" noValidate>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            onBlur={() => setTouched(value => ({ ...value, email: true }))}
            autoComplete="email"
            aria-invalid={!!emailError}
            aria-describedby={emailError ? "email-error" : undefined}
            placeholder="you@example.com"
          />
          {emailError && <p id="email-error" className="m-0 text-[.74rem] leading-[1.4] text-[#ffb5a7]" role="alert">{emailError}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            onBlur={() => setTouched(value => ({ ...value, password: true }))}
            autoComplete="current-password"
            aria-invalid={!!passwordError}
            aria-describedby={passwordError ? "password-error" : undefined}
            placeholder="Enter your password"
          />
          {passwordError && <p id="password-error" className="m-0 text-[.74rem] leading-[1.4] text-[#ffb5a7]" role="alert">{passwordError}</p>}
        </div>
        {mutation.isError && <p role="alert" className="m-0 rounded-lg border border-[#ffb5a7]/25 bg-[#ffb5a7]/[.08] p-3 text-[.74rem] text-[#ffb5a7]">{mutation.error.message}</p>}
        <Button type="submit" disabled={mutation.isPending} className="mt-1 h-13 w-full rounded-lg bg-[#2a3bff] text-white hover:bg-[#1d2edc]">
          {mutation.isPending ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  )
}
