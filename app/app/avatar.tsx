"use client"

import {useState} from "react"
import {initials} from "./types"

const AVATAR_PX = {xs: 16, sm: 34, md: 44, lg: 78} as const

const COLOR_CLASS: Record<string, string> = {
    "#9a3412": "bg-orange-800",
    "#a16207": "bg-yellow-700",
    "#4338ca": "bg-indigo-700",
    "#be123c": "bg-rose-700",
    "#0369a1": "bg-sky-700",
}

type AvatarProps = {
    name: string
    color?: string
    online?: boolean
    size?: "xs" | "sm" | "md" | "lg"
    imageUrl?: string | null
    className?: string
    title?: string
}

export function Avatar({
                           name,
                           color = "#0f766e",
                           online = false,
                           size = "md",
                           imageUrl,
                           className = "",
                           title,
                       }: AvatarProps) {
    const [failedUrl, setFailedUrl] = useState<string | null>(null)
    const showImage = Boolean(imageUrl) && failedUrl !== imageUrl
    const px = AVATAR_PX[size]
    const colorClass = COLOR_CLASS[color] ?? "bg-teal-700"
    const sizeClass =
        size === "xs"
            ? "size-4 text-[7px]"
            : size === "sm"
                ? "size-[34px] text-[10px]"
                : size === "lg"
                    ? "size-[78px] text-xl"
                    : "size-11"

    return (
        <span
            className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full text-xs font-extrabold text-white ${sizeClass} ${colorClass} ${className}`}
            aria-hidden="true"
            title={title}
        >
      {showImage ? (
          <img
              src={imageUrl!}
              alt=""
              width={px}
              height={px}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 size-full max-w-none object-cover"
              onError={() => setFailedUrl(imageUrl ?? null)}
          />
      ) : (
          initials(name)
      )}
            {online && (
                <i className="absolute -bottom-px right-[-1px] z-10 size-3 rounded-full border-2 border-[#151b42] bg-[#35a77a]"/>
            )}
    </span>
    )
}
