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
    <main className="relative isolate min-h-dvh overflow-hidden bg-[#0d1026] text-[#f5f2eb] before:absolute before:inset-0 before:-z-20 before:bg-[radial-gradient(circle_at_13%_18%,rgb(42_59_255_/_0.24),transparent_24rem),radial-gradient(circle_at_84%_80%,rgb(87_104_255_/_0.2),transparent_30rem)] after:absolute after:inset-0 after:-z-10 after:bg-[linear-gradient(115deg,transparent_20%,rgb(255_255_255_/_0.035)_50%,transparent_80%),linear-gradient(25deg,transparent_35%,rgb(255_255_255_/_0.025)_50%,transparent_65%)] after:bg-[length:11rem_11rem,17rem_17rem] after:opacity-[.14]">
      <div className="pointer-events-none absolute -right-[20%] -top-48 -z-10 size-80 rounded-full bg-[#2a3bff]/[.12] blur-sm" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-56 left-[12%] -z-10 size-80 rounded-full bg-[#5c6dff]/[.14] blur-sm" aria-hidden="true" />

      <section className="mx-auto grid min-h-dvh w-[min(1180px,calc(100%-2rem))] items-center gap-12 py-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,.9fr)] lg:gap-[clamp(3rem,8vw,9rem)] lg:py-12">
        <div className="relative min-h-0 lg:min-h-[700px]" aria-label="About Sender Chat">
          <Link className="inline-flex items-center" href="/" aria-label="Sender Chat home">
            <span className="inline-flex w-36 rounded-xl bg-white px-2.5 py-[.45rem] shadow-[0_.75rem_2rem_rgb(0_0_0_/_0.18)]">
              <Image src="/sender-logo.png" alt="Sender" width={152} height={40} priority />
            </span>
          </Link>

          <div className="max-w-[33rem] pt-16 lg:pt-[clamp(6rem,15vh,10rem)]">
            <p className="mb-4 text-[.7rem] font-bold uppercase tracking-[.18em] text-[#7480ff]">Conversations, in focus.</p>
            <h1 className="max-w-[10ch] font-heading text-[clamp(3rem,6vw,6.1rem)] font-medium leading-[.95] tracking-[-.075em]">Make room for the messages that matter.</h1>
            <p className="mt-7 max-w-[25rem] text-base leading-[1.65] text-[#aeb4c3]">
              A calmer place to stay close, catch up, and keep every conversation moving.
            </p>
          </div>

          <div className="relative mt-5 h-28 w-full lg:absolute lg:bottom-4 lg:right-0 lg:mt-0 lg:w-[min(100%,29rem)]" aria-hidden="true">
            <span className="absolute left-0 top-10 h-px w-48 origin-left -rotate-[16deg] bg-white/20" />
            <span className="absolute bottom-12 right-0 h-px w-36 origin-right -rotate-[14deg] bg-white/20" />
            <div className="absolute left-8 top-2 flex animate-[auth-float-one_6s_ease-in-out_infinite] items-center gap-3 rounded-xl border border-white/10 bg-[#2a3146]/75 px-3.5 py-3 text-xs text-[#d7dae2] shadow-2xl backdrop-blur-xl motion-reduce:animate-none">
              <span className="grid size-7 place-items-center rounded-full bg-[#9da6ff] text-[.65rem] font-extrabold text-[#0d1026]">L</span>
              <span>are you free for a quick chat?</span>
            </div>
            <div className="absolute bottom-2 right-4 flex animate-[auth-float-two_7s_ease-in-out_infinite] items-center gap-3 rounded-xl bg-[#2a3bff] px-3.5 py-3 text-xs text-white shadow-2xl motion-reduce:animate-none">
              <span>yes, send it over</span>
              <span className="grid size-7 place-items-center rounded-full bg-[#f5f2eb] text-[.65rem] font-extrabold text-[#2a3bff]">M</span>
            </div>
            <span className="absolute right-20 top-20 animate-[auth-pulse_3.5s_ease-in-out_infinite] text-xl text-[#7480ff] motion-reduce:animate-none">*</span>
          </div>
        </div>

        <div className="w-full max-w-md justify-self-end">
          <div className="rounded-2xl border border-white/[.12] bg-white/[.08] p-7 shadow-[0_2rem_5rem_rgb(0_0_0_/.22),inset_0_1px_0_rgb(255_255_255_/.08)] backdrop-blur-[22px] animate-[auth-enter_700ms_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none lg:p-12">
            <div>
              <p className="mb-4 text-[.7rem] font-bold uppercase tracking-[.18em] text-[#7480ff]">{eyebrow}</p>
              <h2 className="text-[clamp(2rem,4vw,2.8rem)] font-semibold leading-none tracking-[-.055em]">{title}</h2>
              <p className="mt-3 text-[.92rem] leading-[1.6] text-[#aeb4c3]">{description}</p>
            </div>
            {children}
            <p className="mt-6 text-center text-xs leading-[1.5] text-[#a6adcb]">
              {alternateText}{" "}
              <Link href={alternateHref}>{alternateLabel}</Link>
            </p>
          </div>
          <p className="mt-5 text-center text-xs leading-[1.5] text-[#a6adcb]">By continuing, you agree to use Sender respectfully.</p>
        </div>
      </section>
    </main>
  )
}
