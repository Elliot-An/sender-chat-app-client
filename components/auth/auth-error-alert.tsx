import { AlertCircle, Clock3, WifiOff } from "lucide-react"
import { getAuthErrorPresentation } from "@/lib/auth/errors"
import { cn } from "@/lib/utils"

type AuthErrorAlertProps = {
  error: unknown
  intent?: "login" | "register"
  className?: string
}

export function AuthErrorAlert({ error, intent = "login", className }: AuthErrorAlertProps) {
  const presentation = getAuthErrorPresentation(error, intent)
  const Icon =
    presentation.code === "NETWORK_ERROR"
      ? WifiOff
      : presentation.code === "RATE_LIMITED"
        ? Clock3
        : AlertCircle

  return (
    <div
      role="alert"
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-xl border border-[#ff8f7a]/35 bg-[linear-gradient(135deg,rgb(255_143_122_/_0.16),rgb(255_143_122_/_0.05))] p-3.5 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.06)] animate-[auth-enter_420ms_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none",
        className,
      )}
    >
      <span
        className="mt-0.5 grid size-9 place-items-center rounded-full border border-[#ffb5a7]/35 bg-[#ffb5a7]/[.12] text-[#ffcfc5]"
        aria-hidden="true"
      >
        <Icon className="size-4" strokeWidth={2.25} />
      </span>
      <div className="min-w-0">
        <p className="m-0 text-[.84rem] font-semibold leading-snug tracking-[-.01em] text-[#ffe1da]">
          {presentation.title}
        </p>
        <p className="m-0 mt-1 text-[.76rem] leading-[1.5] text-[#ffc4b8]">{presentation.message}</p>
      </div>
    </div>
  )
}
