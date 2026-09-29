import Link from "next/link"
import Image from "next/image"
import type { ReactNode } from "react"

type AuthShellProps = {
  eyebrow: string
  title: string
  description: string
  alternateText: string
  alternateLabel: string
  alternateHref: string
  children: ReactNode
}

export function AuthShell({
  eyebrow,
  title,
  description,
  alternateText,
  alternateLabel,
  alternateHref,
  children,
}: AuthShellProps) {
  return (
    <main className="auth-page">
      <div className="auth-orb auth-orb-one" aria-hidden="true" />
      <div className="auth-orb auth-orb-two" aria-hidden="true" />

      <section className="auth-layout">
        <div className="auth-story" aria-label="About Sender Chat">
          <Link className="auth-brand" href="/" aria-label="Sender Chat home">
            <span className="auth-brand-lockup">
              <Image src="/sender-logo.png" alt="Sender" width={152} height={40} priority />
            </span>
          </Link>

          <div className="auth-story-copy">
            <p className="auth-kicker">Conversations, in focus.</p>
            <h1>Make room for the messages that matter.</h1>
            <p className="auth-story-description">
              A calmer place to stay close, catch up, and keep every conversation moving.
            </p>
          </div>

          <div className="auth-chat-scene" aria-hidden="true">
            <span className="auth-scene-line auth-scene-line-one" />
            <span className="auth-scene-line auth-scene-line-two" />
            <div className="auth-chat-note auth-chat-note-one">
              <span className="auth-avatar auth-avatar-coral">L</span>
              <span>are you free for a quick chat?</span>
            </div>
            <div className="auth-chat-note auth-chat-note-two">
              <span>yes, send it over</span>
              <span className="auth-avatar auth-avatar-cream">M</span>
            </div>
            <span className="auth-scene-star">*</span>
          </div>
        </div>

        <div className="auth-form-column">
          <div className="auth-form-card">
            <div className="auth-form-heading">
              <p className="auth-kicker">{eyebrow}</p>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
            {children}
            <p className="auth-switch">
              {alternateText}{" "}
              <Link href={alternateHref}>{alternateLabel}</Link>
            </p>
          </div>
          <p className="auth-legal">By continuing, you agree to use Sender respectfully.</p>
        </div>
      </section>
    </main>
  )
}
