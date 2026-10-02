import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight, Check, MessageCircle, ShieldCheck, Sparkles } from "lucide-react"

const features = [
  {
    icon: MessageCircle,
    title: "Focus on what matters",
    text: "Keep every conversation in its place, easy to find and free from an endless stream of notifications.",
  },
  {
    icon: ShieldCheck,
    title: "Private by default",
    text: "Sender is designed so your personal conversations stay between you and the people you choose.",
  },
  {
    icon: Sparkles,
    title: "A calmer way to connect",
    text: "A clear, thoughtful space for quick replies and meaningful presence.",
  },
]

function Brand() {
  return (
    <Link className="inline-flex items-center gap-2 text-xl font-extrabold tracking-[-.06em] text-[#11152f]" href="/" aria-label="Sender home">
      <Image src="/sender-icon.svg" alt="" width={38} height={38} priority />
      <span>sender</span>
    </Link>
  )
}

export default function Home() {
  return (
    <main className="min-h-dvh overflow-hidden bg-[#fbfcff] text-[#11152f]">
      <header className="mx-auto flex h-[76px] w-[min(1180px,calc(100%-2rem))] items-center justify-between">
        <Brand />
        <nav className="ml-20 flex gap-8 max-md:hidden" aria-label="Main navigation">
          <a href="#why-sender">Why Sender</a>
          <a href="#mobile-app">Mobile app</a>
        </nav>
        <div className="flex items-center gap-6">
          <Link className="text-sm font-semibold text-[#69708d]" href="/login">Log in</Link>
          <Link className="inline-flex min-h-11 items-center justify-center gap-2.5 rounded-xl bg-[#2a3bff] px-4 text-sm font-bold text-white shadow-[0_.8rem_1.8rem_rgb(42_59_255_/.2)] transition hover:bg-[#1d2edc]" href="/register">
            Get started <ArrowUpRight size={16} strokeWidth={2} />
          </Link>
        </div>
      </header>

      <section className="mx-auto grid min-h-[640px] w-[min(1180px,calc(100%-2rem))] items-center gap-8 py-12 lg:grid-cols-[minmax(0,.92fr)_minmax(500px,1.08fr)]">
        <div>
          <p className="mb-5 flex items-center gap-2 text-[.68rem] font-extrabold uppercase tracking-[.15em] text-[#2a3bff]"><span className="size-2 rounded-full bg-[#ff907c]" /> Connect with intention</p>
          <h1 className="max-w-[8.4ch] font-heading text-[clamp(3.7rem,6.3vw,6rem)] font-medium leading-[.98] tracking-[-.075em]">Talk honestly. <em className="block text-[#2a3bff]">Feel closer.</em></h1>
          <p className="mt-7 max-w-md text-base leading-[1.7] text-[#69708d]">
            Sender is where everyday conversations become clearer, more private and more enjoyable.
          </p>
          <div className="mt-8 flex items-center gap-6">
            <Link className="inline-flex min-h-14 items-center justify-center gap-2.5 rounded-xl bg-[#2a3bff] px-5 text-sm font-bold text-white shadow-[0_.8rem_1.8rem_rgb(42_59_255_/.2)]" href="/register">
              Create a free account <ArrowUpRight size={18} strokeWidth={2} />
            </Link>
            <Link className="text-xs font-bold" href="/login">
              I already have an account <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="mt-12 flex items-center gap-2.5">
            <div className="flex pl-1" aria-hidden="true">
              <span className="grid size-7 place-items-center rounded-full border-2 border-[#fbfcff] bg-[#c7d0ff] text-[.49rem] font-extrabold">AN</span><span className="-ml-1 grid size-7 place-items-center rounded-full border-2 border-[#fbfcff] bg-[#ffc7ba] text-[.49rem] font-extrabold">ML</span><span className="-ml-1 grid size-7 place-items-center rounded-full border-2 border-[#fbfcff] bg-[#b9e1d4] text-[.49rem] font-extrabold">TN</span>
            </div>
            <p>Keep the people who matter close.</p>
          </div>
        </div>

        <div className="relative min-h-[500px]" aria-label="Sender conversation preview">
          <div className="absolute right-[3%] top-[7%] size-[30rem] rounded-full border border-[#dce2ff]" />
          <div className="absolute right-[12%] top-[15%] size-96 rounded-full border border-[#ebedff]" />
          <div className="absolute right-[20%] top-[12%] size-3 rounded-full bg-[#ff907c] animate-[landing-orbit_7s_ease-in-out_infinite] motion-reduce:animate-none" />
          <div className="absolute bottom-[12%] left-[7%] size-3 rounded-full bg-[#2a3bff] animate-[landing-orbit_7s_ease-in-out_infinite] [animation-delay:-3s] motion-reduce:animate-none" />
          <div className="absolute right-[8%] top-[16%] w-[min(23rem,76%)] rotate-[2deg] rounded-2xl border border-[#2a3bff]/10 bg-white/[.92] p-5 shadow-[0_2rem_4rem_rgb(35_48_130_/.13)] animate-[landing-card-in_800ms_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-[#c4ceff] text-xs font-extrabold text-[#2a3bff]">L</span>
                <span><strong className="block text-xs">Lan Anh</strong><small className="mt-0.5 block text-[.58rem] text-[#8a90a6]">Active now</small></span>
              </div>
              <span className="size-2 rounded-full bg-[#64cfaa]" aria-label="Active now" />
            </div>
            <div className="my-5 text-center text-[.57rem] text-[#a0a5b5]">Today, 10:42</div>
            <div className="w-fit max-w-[82%] rounded-xl bg-[#f0f2fb] px-3 py-2.5 text-[.7rem] text-[#50566f]">Want to go for a walk this weekend?</div>
            <div className="ml-auto mt-2 w-fit max-w-[82%] rounded-xl bg-[#2a3bff] px-3 py-2.5 text-[.7rem] text-white">Sounds good. I can't wait! <span className="mt-1 block text-right text-[.5rem] text-[#cbd1ff]">10:43</span></div>
            <div className="mt-2 flex items-center justify-between rounded-lg bg-[#f7f8fc] px-3 py-2 text-[.58rem] text-[#a1a6b6]"><span>Write a message...</span><b className="grid size-5 place-items-center rounded bg-[#2a3bff] text-white">↑</b></div>
          </div>
          <div className="absolute bottom-[15%] right-0 flex w-60 -rotate-3 items-center gap-2.5 rounded-2xl border border-[#2a3bff]/10 bg-white/[.92] p-3 shadow-[0_2rem_4rem_rgb(35_48_130_/.13)] animate-[landing-card-float_6s_ease-in-out_infinite] motion-reduce:animate-none">
            <span className="grid size-8 place-items-center rounded-xl bg-[#ffc7ba] text-xs font-extrabold text-[#c65a4b]">M</span>
            <span><strong className="block text-xs">Minh sent a message</strong><small className="mt-0.5 block text-[.58rem] text-[#8a90a6]">See you later!</small></span>
            <Check size={17} />
          </div>
          <div className="absolute bottom-[3%] left-[7%] text-[clamp(4rem,8vw,7rem)] font-black leading-none tracking-[-.1em] text-[#e8ebff]">sender</div>
        </div>
      </section>

      <section className="mx-auto flex min-h-[74px] w-[min(1180px,calc(100%-2rem))] items-center gap-6 border-t border-[#e5e8f4] text-[.68rem] text-[#7e849a]" aria-label="Highlights">
        <span>Made for conversations that matter</span>
        <span className="h-px flex-1 bg-[#e5e8f4]" />
        <span><Check size={16} /> No distracting ads</span>
        <span><Check size={16} /> Simple to get started</span>
      </section>

      <section id="why-sender" className="mx-auto grid w-[min(1180px,calc(100%-2rem))] gap-12 py-28 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <p className="mb-5 text-[.68rem] font-extrabold uppercase tracking-[.15em] text-[#2a3bff]">Just enough</p>
          <h2 className="max-w-[8ch] font-heading text-[clamp(2.8rem,5vw,4.8rem)] font-medium leading-[.98] tracking-[-.07em]">A better way<br />to stay in touch.</h2>
        </div>
        <div className="grid items-start gap-5 pt-5 md:grid-cols-3">
          {features.map(({ icon: Icon, title, text }, index) => (
            <article className="relative min-h-64 border-t border-[#dde2f2] px-1 py-5" key={title}>
              <span className="absolute right-0 top-6 text-[.62rem] text-[#aab0c2]">0{index + 1}</span>
              <Icon size={22} strokeWidth={1.7} />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="mobile-app" className="relative mx-auto mb-32 grid min-h-[480px] w-[min(1180px,calc(100%-2rem))] items-center gap-16 overflow-hidden rounded-3xl bg-[#11152f] px-8 py-16 text-white md:grid-cols-[1fr_.8fr] md:px-28">
        <div className="absolute -bottom-48 right-[12%] size-[28rem] rounded-full bg-[#2a3bff]/40 blur-sm" aria-hidden="true" />
        <div className="relative">
          <p className="mb-5 text-[.68rem] font-extrabold uppercase tracking-[.15em] text-[#9ca7ff]">Mobile app</p>
          <h2 className="max-w-[8ch] font-heading text-[clamp(2.8rem,5vw,4.8rem)] font-medium leading-[.98] tracking-[-.07em]">Sender is coming to your pocket.</h2>
          <p className="relative mt-6 max-w-md text-sm leading-[1.7] text-[#aeb5d0]">We are polishing the mobile experience. The app will be available on Google Play and the App Store soon.</p>
          <div className="relative mt-8 flex flex-wrap gap-2.5">
            <button className="flex min-w-40 items-center gap-2 rounded-lg border border-white/15 bg-white/[.06] px-3 py-2.5 text-left opacity-70" disabled aria-disabled="true">
              <span className="grid size-6 place-items-center">▶</span>
              <span><small>Coming soon to</small><strong>Google Play</strong></span>
            </button>
            <button className="flex min-w-40 items-center gap-2 rounded-lg border border-white/15 bg-white/[.06] px-3 py-2.5 text-left opacity-70" disabled aria-disabled="true">
              <span className="grid size-6 place-items-center">●</span>
              <span><small>Coming soon to</small><strong>App Store</strong></span>
            </button>
          </div>
        </div>
        <div className="relative mx-auto w-56 rounded-[2rem] border-4 border-[#353b62] bg-[#f5f7ff] p-5 text-[#11152f] shadow-2xl" aria-hidden="true">
          <div className="mx-auto mb-5 h-1 w-16 rounded-full bg-[#353b62]" />
          <div className="flex items-center gap-2 font-bold"><Image src="/sender-icon.svg" alt="" width={30} height={30} /><span>sender</span></div>
          <p className="mt-5 text-sm font-bold">Good morning, An.</p>
          <div className="mt-5 flex items-center gap-2 text-xs"><span className="grid size-8 place-items-center rounded-xl bg-[#c4ceff] font-extrabold text-[#2a3bff]">L</span><span><strong className="block">Lan Anh</strong><small className="text-[.6rem]">Want to go for a walk this weekend?</small></span><b className="ml-auto text-[.6rem]">10:43</b></div>
          <div className="mt-4 flex items-center gap-2 text-xs"><span className="grid size-8 place-items-center rounded-xl bg-[#ffc7ba] font-extrabold text-[#c65a4b]">M</span><span><strong className="block">Minh</strong><small className="text-[.6rem]">See you later!</small></span><b className="ml-auto text-[.6rem]">Yesterday</b></div>
        </div>
      </section>

      <footer className="mx-auto flex w-[min(1180px,calc(100%-2rem))] items-center justify-between border-t border-[#e5e8f4] py-8 text-sm text-[#69708d] max-md:flex-col max-md:gap-4">
        <Brand />
        <p>Conversations that make your day better.</p>
        <div><Link href="/login">Log in</Link><Link href="/register">Sign up</Link><span>© {new Date().getFullYear()} Sender</span></div>
      </footer>
    </main>
  )
}
