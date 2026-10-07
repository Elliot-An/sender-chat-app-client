"use client"

import {
  ArrowLeft,
  Bell,
  ChevronRight,
  Info,
  Paperclip,
  Search,
  Send,
  Users,
  X,
} from "lucide-react"
import { Check, UserRound } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { conversationApi, type MessageSearchResult } from "@/lib/conversation/api"

export type ChatMessage = {
  id: number
  from: "me" | "them"
  text: string
  time: string
  delivery: "sent" | "delivered" | "read"
  deliveredBy: number[]
  readBy: number[]
}

export type Conversation = {
  id: number
  name: string
  initials: string
  color: string
  online: boolean
  messages: ChatMessage[]
  members?: number
  group?: boolean
  avatarUrl?: string | null
}

export function MessageSearch({ token, conversationId, onClose, onSelect }: { token: string; conversationId: number; onClose: () => void; onSelect: (messageId: number) => void }) {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [query])
  const result = useQuery({
    queryKey: ["message-search", token, conversationId, debouncedQuery],
    queryFn: () => conversationApi.searchMessages(token, conversationId, debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  })
  return <aside className="absolute inset-x-4 top-4 z-30 max-h-[min(70vh,520px)] overflow-auto rounded-xl border border-[#2d3560] bg-[#151b42] shadow-2xl">
    <header className="flex items-center gap-2 border-b border-[#2d3560] p-3"><Search size={17} className="text-[#a6adcb]" /><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search messages..." aria-label="Search messages" className="min-w-0 flex-1 bg-transparent text-sm text-[#f7f8ff] outline-none" /><button onClick={onClose} aria-label="Close message search" className="grid size-8 place-items-center rounded-lg border-0 bg-transparent text-[#a6adcb] hover:bg-[#252e68]"><X size={17} /></button></header>
    {debouncedQuery.length < 2 ? <p className="p-5 text-center text-xs text-[#a6adcb]">Type at least 2 characters.</p> :
      result.isPending ? <p className="p-5 text-center text-xs text-[#a6adcb]">Searching...</p> :
      result.isError ? <p className="p-5 text-center text-xs text-[#ffb5a7]">Search failed. Try again.</p> :
      result.data?.items.length ? <div className="divide-y divide-[#2d3560]">{result.data.items.map((item: MessageSearchResult) => <button key={item.message.id} onClick={() => onSelect(item.message.id)} className="block w-full px-4 py-3 text-left hover:bg-[#1e2752]"><span className="block text-xs text-[#a6adcb]">{item.message.sender.displayName || item.message.sender.username} · {new Date(item.message.createdAt).toLocaleString()}</span><span className="mt-1 block overflow-hidden text-sm text-[#f7f8ff]">{item.snippet}</span></button>)}</div> :
      <p className="p-5 text-center text-xs text-[#a6adcb]">No messages found.</p>}
  </aside>
}

export function initials(name: string) {
  return name
    .split(" ")
    .map(part => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

const AVATAR_PX = { sm: 34, md: 44, lg: 78 } as const

export function Avatar({ name, color = "#0f766e", online = false, size = "md", imageUrl }: { name: string; color?: string; online?: boolean; size?: "sm" | "md" | "lg"; imageUrl?: string | null }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const showImage = Boolean(imageUrl) && failedUrl !== imageUrl
  const px = AVATAR_PX[size]
  const colorClass = color === "#9a3412" ? "bg-orange-800" : color === "#a16207" ? "bg-yellow-700" : color === "#4338ca" ? "bg-indigo-700" : color === "#be123c" ? "bg-rose-700" : color === "#0369a1" ? "bg-sky-700" : "bg-teal-700"
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full text-xs font-extrabold text-white ${size === "sm" ? "size-[34px] text-[10px]" : size === "lg" ? "size-[78px] text-xl" : "size-11"} ${colorClass}`}
      aria-hidden="true"
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
      {online && <i className="absolute -bottom-px right-[-1px] z-10 size-3 rounded-full border-2 border-[#151b42] bg-[#35a77a]" />}
    </span>
  )
}

export function ChatView({ conversation, message, setMessage, onSend, onTyping, typingUsers, showInfo, setShowInfo, onBack, onLoadMore, hasMore, highlightedMessageId, onSearch }: { conversation: Conversation; message: string; setMessage: (value: string) => void; onSend: (event: React.FormEvent) => void; onTyping: (state: "STARTED" | "STOPPED") => void; typingUsers: string[]; showInfo: boolean; setShowInfo: (value: boolean) => void; onBack: () => void; onLoadMore: () => void; hasMore: boolean; highlightedMessageId: number | null; onSearch: () => void }) {
  const typingTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => {
    if (typingTimer.current) window.clearTimeout(typingTimer.current)
    onTyping("STOPPED")
  }, [onTyping])
  function changeMessage(value: string) {
    setMessage(value)
    if (typingTimer.current) window.clearTimeout(typingTimer.current)
    if (!value.trim()) {
      onTyping("STOPPED")
      return
    }
    onTyping("STARTED")
    typingTimer.current = window.setTimeout(() => onTyping("STOPPED"), 4500)
  }
  useEffect(() => {
    if (highlightedMessageId === null) return
    document.querySelector(`[data-message-id="${highlightedMessageId}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [highlightedMessageId, conversation.id])

  return <div className="flex min-h-0 min-w-0 flex-1 flex-col">
    <header className="flex min-h-[67px] items-center gap-2.5 border-b border-[#2d3560] bg-[#151b42] px-4 py-3"><button className="grid size-9 shrink-0 place-items-center rounded-[10px] border-0 bg-transparent text-[#a6adcb] max-[720px]:grid hover:bg-[#252e68] hover:text-[#2a3bff]" onClick={onBack} aria-label="Back"><ArrowLeft size={20} /></button><Avatar name={conversation.name} color={conversation.color} online={conversation.online} imageUrl={conversation.avatarUrl} /><div className="flex min-w-0 flex-col gap-1"><b className="text-[15px]">{conversation.name}</b><span className="text-xs text-[#a6adcb]">{conversation.group ? (conversation.members ? `${conversation.members} members` : "Group") : conversation.online ? "Active now" : "Offline"}</span></div><span className="ml-auto" /><button className="grid size-9 shrink-0 place-items-center rounded-[10px] border-0 bg-transparent text-[#a6adcb] hover:bg-[#252e68] hover:text-[#2a3bff]" onClick={onSearch} aria-label="Search messages"><Search size={19} /></button><button className={`grid size-9 shrink-0 place-items-center rounded-[10px] border-0 bg-transparent text-[#a6adcb] hover:bg-[#252e68] hover:text-[#2a3bff] ${showInfo ? "bg-[#252e68] text-[#2a3bff]" : ""}`} onClick={() => setShowInfo(!showInfo)} aria-label="Conversation info"><Info size={19} /></button></header>
    <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto px-[max(18px,5vw)] py-5">
      {hasMore && <button className="self-center text-xs text-[#9da6ff]" onClick={onLoadMore} type="button">Load older messages</button>}
      <div className="my-0 mb-2 self-center text-[11px] text-[#a6adcb]">Today</div>
      {conversation.messages.map(item => <div className={`mb-0.5 flex ${item.from === "me" ? "justify-end" : ""} ${highlightedMessageId === item.id ? "rounded-xl bg-[#493d8f] p-1 transition-colors" : ""}`} data-message-id={item.id} key={item.id}><div className={`max-w-[min(70%,460px)] overflow-wrap-anywhere rounded-[17px_17px_5px_17px] border border-[#2d3560] bg-[#151b42] px-3 py-2.5 leading-[1.45] ${item.from === "me" ? "border-0 bg-[#2a3bff] text-white" : "rounded-[17px_17px_17px_5px]"}`}>{item.text}<small className={`mt-1 flex items-center justify-end gap-1 text-[10px] text-[#a6adcb] ${item.from === "me" ? "text-[#bde9df]" : ""}`}>{item.time}{item.from === "me" && <span className="inline-flex items-center gap-0.5" aria-label={item.readBy.length ? "Seen" : item.delivery === "delivered" ? "Delivered" : "Sent"}>{item.readBy.length ? item.readBy.map(viewerId => <span className="grid size-4 place-items-center rounded-full bg-[#bde9df] text-[#2a3bff]" key={viewerId} title={`Seen by user ${viewerId}`}><UserRound size={10} /></span>) : item.delivery === "delivered" ? <span className="grid size-4 place-items-center rounded-full bg-[#bde9df] text-[#2a3bff]"><Check size={10} /></span> : <Check size={13} />}</span>}</small></div></div>)}
    </div>
    {typingUsers.length > 0 && <div className="px-5 pb-1 text-xs text-[#a6adcb]">{typingUsers.length <= 3 ? `${typingUsers.join(", ")} ${typingUsers.length === 1 ? "is" : "are"} typing...` : `${typingUsers.slice(0, 3).join(", ")} and ${typingUsers.length - 3} others are typing...`}</div>}
    <form className="flex h-[68px] items-center gap-2 border-t border-[#2d3560] bg-[#151b42] px-4 py-3" onSubmit={event => { onTyping("STOPPED"); onSend(event) }}><button type="button" className="grid size-9 shrink-0 place-items-center rounded-[10px] border-0 bg-transparent text-[#a6adcb]" aria-label="Attach a file"><Paperclip size={19} /></button><input className="min-w-0 flex-1 rounded-[22px] border border-[#2d3560] bg-[#0d1026] px-4 py-2.5 text-[#f7f8ff] outline-0" value={message} onChange={event => changeMessage(event.target.value)} onBlur={() => onTyping("STOPPED")} placeholder="Write a message..." aria-label="Message" /><button className="grid size-[38px] shrink-0 place-items-center rounded-full border-0 bg-[#2a3bff] text-white disabled:cursor-default disabled:opacity-45" type="submit" disabled={!message.trim()} aria-label="Send message"><Send size={18} /></button></form>
  </div>
}

export function InfoPanel({ conversation, onClose, onSearch }: { conversation: Conversation; onClose: () => void; onSearch: () => void }) {
  return <aside className="absolute inset-0 z-20 w-full overflow-auto border-l border-[#2d3560] bg-[#151b42] md:relative md:w-[300px]"><header className="flex items-center justify-between border-b border-[#2d3560] px-4 py-3.5"><b className="text-sm">Conversation info</b><button className="grid size-9 place-items-center rounded-[10px] border-0 bg-transparent text-[#a6adcb]" onClick={onClose} aria-label="Close info"><X size={18} /></button></header><div className="p-6 text-center"><Avatar name={conversation.name} color={conversation.color} online={conversation.online} size="lg" imageUrl={conversation.avatarUrl} /><h3 className="mt-3 text-base">{conversation.name}</h3><p className="my-1 text-xs text-[#a6adcb]">{conversation.group ? `${conversation.members} members` : conversation.online ? "Active now" : "Offline"}</p><div className="flex justify-center gap-4"><button className="flex flex-col items-center gap-1.5 border-0 bg-transparent text-[11px] text-[#a6adcb]"><Bell size={34} className="rounded-full bg-[#1e2752] p-2 text-[#2a3bff]" /><span>Mute</span></button><button onClick={onSearch} className="flex flex-col items-center gap-1.5 border-0 bg-transparent text-[11px] text-[#a6adcb]"><Search size={34} className="rounded-full bg-[#1e2752] p-2 text-[#2a3bff]" /><span>Search</span></button><button className="flex flex-col items-center gap-1.5 border-0 bg-transparent text-[11px] text-[#a6adcb]"><Users size={34} className="rounded-full bg-[#1e2752] p-2 text-[#2a3bff]" /><span>Add people</span></button></div></div><details className="border-t border-[#2d3560] px-4" open><summary className="flex cursor-pointer list-none justify-between py-4 text-sm font-semibold">Media, files and links <ChevronRight size={16} /></summary><p className="p-4 text-center text-xs text-[#a6adcb]">No shared media yet.</p></details><details className="border-t border-[#2d3560] px-4"><summary className="flex cursor-pointer list-none justify-between py-4 text-sm font-semibold">Privacy and support <ChevronRight size={16} /></summary><button className="border-0 bg-transparent pb-4 text-[#ffb5a7]">Delete chat</button></details></aside>
}
