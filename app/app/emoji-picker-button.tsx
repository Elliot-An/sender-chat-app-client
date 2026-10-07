"use client"

import dynamic from "next/dynamic"
import {Smile} from "lucide-react"
import {useEffect, useRef} from "react"
import {insertAtCaret} from "@/lib/message/emoji"

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
    ssr: false,
    loading: () => (
        <div className="grid h-[350px] w-[min(100vw-2rem,350px)] place-items-center rounded-xl border border-[#2d3560] bg-[#151b42] text-sm text-[#a6adcb]">
            Loading emojis…
        </div>
    ),
})

type EmojiPickerButtonProps = {
    value: string
    onChange: (value: string) => void
    inputRef: React.RefObject<HTMLInputElement | null>
    open: boolean
    onOpenChange: (open: boolean) => void
    disabled?: boolean
}

export function EmojiPickerButton({
    value,
    onChange,
    inputRef,
    open,
    onOpenChange,
    disabled = false,
}: EmojiPickerButtonProps) {
    const rootRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        if (disabled && open) onOpenChange(false)
    }, [disabled, open, onOpenChange])

    useEffect(() => {
        if (!open) return

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") onOpenChange(false)
        }

        function onPointerDown(event: MouseEvent) {
            const target = event.target as Node
            if (rootRef.current?.contains(target)) return
            if (buttonRef.current?.contains(target)) return
            onOpenChange(false)
        }

        document.addEventListener("keydown", onKeyDown)
        document.addEventListener("mousedown", onPointerDown)
        return () => {
            document.removeEventListener("keydown", onKeyDown)
            document.removeEventListener("mousedown", onPointerDown)
        }
    }, [open, onOpenChange])

    function insertEmoji(emoji: string) {
        const input = inputRef.current
        const start = input?.selectionStart ?? value.length
        const end = input?.selectionEnd ?? value.length
        const next = insertAtCaret(value, start, end, emoji)
        onChange(next.value)
        requestAnimationFrame(() => {
            input?.focus()
            input?.setSelectionRange(next.caret, next.caret)
        })
    }

    return (
        <div className="relative shrink-0">
            <button
                ref={buttonRef}
                type="button"
                className={`grid size-9 place-items-center rounded-[10px] border-0 bg-transparent text-[#a6adcb] hover:bg-[#252e68] hover:text-[#2a3bff] disabled:cursor-default disabled:opacity-45 disabled:hover:bg-transparent disabled:hover:text-[#a6adcb] ${
                    open ? "bg-[#252e68] text-[#2a3bff]" : ""
                }`}
                aria-label="Insert emoji"
                aria-expanded={open}
                aria-haspopup="dialog"
                disabled={disabled}
                onClick={() => onOpenChange(!open)}
            >
                <Smile size={19}/>
            </button>
            {open ? (
                <div
                    ref={rootRef}
                    role="dialog"
                    aria-label="Emoji picker"
                    className="emoji-picker-root absolute bottom-[calc(100%+8px)] left-0 z-30"
                    onMouseDown={event => event.preventDefault()}
                >
                    <EmojiPicker
                        theme="dark"
                        skinTonesDisabled
                        lazyLoadEmojis
                        searchPlaceHolder="Search emoji"
                        onEmojiClick={data => insertEmoji(data.emoji)}
                        width={350}
                        height={350}
                    />
                </div>
            ) : null}
        </div>
    )
}
