"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { AuthShell } from "@/components/auth/auth-shell"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { authApi } from "@/lib/auth/api"

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
        sessionStorage.setItem("sender_access_token", result.accessToken)
        window.location.assign("/")
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
      <form onSubmit={submit} className="auth-form" noValidate>
        <div className="auth-field">
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
          {emailError && <p id="email-error" className="auth-error" role="alert">{emailError}</p>}
        </div>
        <div className="auth-field">
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
          {passwordError && <p id="password-error" className="auth-error" role="alert">{passwordError}</p>}
        </div>
        {mutation.isError && <p role="alert" className="auth-form-error">{mutation.error.message}</p>}
        <Button type="submit" disabled={mutation.isPending} className="auth-submit">
          {mutation.isPending ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  )
}
