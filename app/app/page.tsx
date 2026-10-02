"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  Info,
  MessageCirclePlus,
  Paperclip,
  Search,
  Send,
  Settings,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import { authApi, clearAccessToken, getAccessToken, type PublicUser } from "@/lib/auth/api"
import { socialApi, type Friendship, type UserSummary } from "@/lib/social/api"
import { ChangePasswordForm } from "./change-password-form"
import { SettingsView } from "./settings-view"

type MockMessage = { from: "me" | "them"; text: string; time: string }
type Conversation = {
  id: number
  name: string
  initials: string
  color: string
  online: boolean
  messages: MockMessage[]
  members?: number
  group?: boolean
}

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 1,
    name: "Minh Anh",
    initials: "MA",
    color: "#0f766e",
    online: true,
    messages: [
      { from: "them", text: "Are you free this afternoon?", time: "9:12 AM" },
      { from: "me", text: "Yes, what’s up?", time: "9:14 AM" },
      { from: "them", text: "Coffee and weekend plans?", time: "9:15 AM" },
      { from: "them", text: "I booked a table for 3 PM.", time: "9:15 AM" },
    ],
  },
  {
    id: 2,
    name: "Hanoi Project Team",
    initials: "HP",
    color: "#9a3412",
    online: false,
    group: true,
    members: 4,
    messages: [
      { from: "them", text: "The new design is in the shared folder.", time: "Yesterday" },
      { from: "them", text: "I also added the export notes.", time: "Yesterday" },
      { from: "me", text: "Thanks, taking a look now.", time: "Yesterday" },
    ],
  },
  {
    id: 3,
    name: "Mom",
    initials: "M",
    color: "#a16207",
    online: false,
    messages: [{ from: "them", text: "Remember to eat on time.", time: "Mon" }],
  },
]

const COLORS = ["#0f766e", "#9a3412", "#a16207", "#4338ca", "#be123c", "#0369a1"]

function initials(name: string) {
  return name
    .split(" ")
    .map(part => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function Avatar({ name, color = "#0f766e", online = false, size = "md" }: { name: string; color?: string; online?: boolean; size?: "sm" | "md" | "lg" }) {
  const colorClass = color === "#9a3412" ? "bg-orange-800" : color === "#a16207" ? "bg-yellow-700" : color === "#4338ca" ? "bg-indigo-700" : color === "#be123c" ? "bg-rose-700" : color === "#0369a1" ? "bg-sky-700" : "bg-teal-700"
  return (
    <span className={`relative grid shrink-0 place-items-center rounded-full text-xs font-extrabold text-white ${size === "sm" ? "size-[34px] text-[10px]" : size === "lg" ? "size-[78px] text-xl" : "size-11"} ${colorClass}`} aria-hidden="true">
      {initials(name)}
      {online && <i className="absolute -bottom-px right-[-1px] size-3 rounded-full border-2 border-[#151b42] bg-[#35a77a]" />}
    </span>
  )
}

function formatUser(user: UserSummary) {
  return user.displayName || user.username
}

export default function AppPage() {
  const [currentUser, setCurrentUser] = useState<PublicUser | null>(null)
  const [friends, setFriends] = useState<Friendship[]>([])
  const [requests, setRequests] = useState<Friendship[]>([])
  const [searchResults, setSearchResults] = useState<UserSummary[]>([])
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<"conversations" | "friends">("conversations")
  const [activeConversation, setActiveConversation] = useState<number | null>(1)
  const [conversations, setConversations] = useState(MOCK_CONVERSATIONS)
  const [message, setMessage] = useState("")
  const [showInfo, setShowInfo] = useState(false)
  const [view, setView] = useState<"chat" | "settings" | "change-password" | "new-group">("chat")
  const [loadingSocial, setLoadingSocial] = useState(true)
  const [sentRequestUserIds, setSentRequestUserIds] = useState<number[]>([])

  const token = getAccessToken()
  const active = conversations.find(item => item.id === activeConversation) ?? null

  useEffect(() => {
    if (!token) {
      return
    }
    Promise.all([socialApi.friends(token), socialApi.requests(token)])
      .then(async ([accepted, incoming]) => {
        const user = await authApi.me(getAccessToken() ?? token)
        setCurrentUser(user)
        setFriends(accepted)
        setRequests(incoming)
      })
      .catch(error => console.error("Could not load contacts", error))
      .finally(() => setLoadingSocial(false))
  }, [token])

  useEffect(() => {
    if (!token || search.trim().length < 2) {
      return
    }
    const timeout = window.setTimeout(() => {
      socialApi.searchUsers(token, search.trim())
        .then(setSearchResults)
        .catch(error => console.error("Search failed", error))
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [search, token])

  const friendUsers = useMemo(() => friends.map(friend => {
    const user = friend.requester.id === currentUser?.id ? friend.addressee : friend.requester
    return { ...user, friendshipId: friend.id }
  }), [friends, currentUser])
  const friendIds = useMemo(() => new Set(friendUsers.map(user => user.id)), [friendUsers])
  const sentRequestIds = useMemo(() => new Set(sentRequestUserIds), [sentRequestUserIds])

  const visibleConversations = conversations.filter(item =>
    !search || item.name.toLowerCase().includes(search.toLowerCase()),
  )

  function openConversation(id: number) {
    setActiveConversation(id)
    setView("chat")
    setShowInfo(false)
  }

  function sendMessage(event: React.FormEvent) {
    event.preventDefault()
    const text = message.trim()
    if (!text || !active) return
    const now = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    setConversations(items => items.map(item => item.id === active.id
      ? { ...item, messages: [...item.messages, { from: "me", text, time: now }] }
      : item,
    ))
    setMessage("")
    window.setTimeout(() => {
      setConversations(items => items.map(item => item.id === active.id
        ? { ...item, messages: [...item.messages, { from: "them", text: "Got it, thanks!", time: now }] }
        : item,
      ))
    }, 850)
  }

  async function decideRequest(friendshipId: number, decision: "ACCEPT" | "DECLINE") {
    if (!token) return
    try {
      const friendship = await socialApi.decideRequest(token, friendshipId, decision)
      setRequests(items => items.filter(item => item.id !== friendshipId))
      if (decision === "ACCEPT") {
        setFriends(items => [...items, friendship])
      }
    } catch (error) {
      console.error("Could not update request", error)
    }
  }

  async function addFriend(userId: number) {
    if (!token) {
      return
    }
    try {
      await socialApi.sendRequest(token, userId)
      setSentRequestUserIds(ids => ids.includes(userId) ? ids : [...ids, userId])
    } catch (error) {
      console.error("Could not send request", error)
    }
  }

  async function logout() {
    try {
      await authApi.logout()
    } catch (error) {
      console.error("Logout failed", error)
    } finally {
      clearAccessToken()
      window.location.assign("/login")
    }
  }

  return (
    <main className="grid h-dvh grid-cols-[340px_minmax(0,1fr)] overflow-hidden bg-[#151b42] font-sans text-[#f7f8ff] max-[720px]:block">
      <aside className={`flex min-h-0 min-w-0 flex-col border-r border-[#2d3560] bg-[#151b42] max-[720px]:h-dvh ${activeConversation ? "max-[720px]:hidden" : ""}`}>
        <div className="flex items-center gap-2.5 p-2 text-xl tracking-[-.04em]">
          <Image className="block h-auto object-contain object-left" src="/sender-icon.svg" alt="Sender" width={60} height={60} priority />
          <button className="ml-auto grid size-9 shrink-0 place-items-center rounded-[10px] border-0 bg-transparent text-[#a6adcb] hover:bg-[#252e68] hover:text-[#2a3bff]" aria-label="Create group chat" onClick={() => setView("new-group")}><MessageCirclePlus size={20} /></button>
        </div>
        <label className="mx-4 mb-2.5 flex items-center gap-2 rounded-xl border border-[#2d3560] bg-[#0d1026] px-3 py-2 text-[#a6adcb]">
          <Search size={17} />
          <input className="min-w-0 w-full border-0 bg-transparent text-inherit outline-0" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search people" aria-label="Search people" />
        </label>
        {search && token && search.length >= 2 ? (
          <div className="search-results">
            <div className="px-4 pb-2 pt-3.5 text-[11px] font-extrabold uppercase tracking-[.08em] text-[#a6adcb]">People</div>
            {searchResults.length ? searchResults.map(user => (
              <div className="flex w-full items-center gap-2.5 px-4 py-2.5" key={user.id}>
                <Avatar name={formatUser(user)} color={COLORS[user.id % COLORS.length]} online />
                <div className="flex min-w-0 flex-1 flex-col gap-1"><b className="truncate text-sm">{formatUser(user)}</b><span className="truncate text-xs text-[#a6adcb]">@{user.username}</span></div>
                {friendIds.has(user.id) ? <span className="text-xs text-[#a6adcb]">Friends</span> : sentRequestIds.has(user.id) ? <span className="text-xs text-[#a6adcb]">Request sent</span> : <button className="grid size-[30px] place-items-center rounded-lg border-0 bg-[#252e68] text-[#2a3bff]" onClick={() => addFriend(user.id)} aria-label={`Add ${formatUser(user)}`}><UserPlus size={16} /></button>}
              </div>
            )) : <div className="p-6 text-center text-xs text-[#a6adcb]">{loadingSocial ? "Loading people..." : "No people found"}</div>}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 border-y border-[#2d3560]" role="tablist">
              <button className={`border-0 border-b-2 border-transparent bg-transparent p-3 text-sm font-semibold text-[#a6adcb] ${activeTab === "conversations" ? "border-b-[#2a3bff] !text-[#f7f8ff]" : ""}`} onClick={() => setActiveTab("conversations")}>Conversations</button>
              <button className={`relative border-0 border-b-2 border-transparent bg-transparent p-3 text-sm font-semibold text-[#a6adcb] ${activeTab === "friends" ? "border-b-[#2a3bff] !text-[#f7f8ff]" : ""}`} onClick={() => setActiveTab("friends")}>Friends{requests.length > 0 && <em className="absolute top-2 rounded-full bg-[#2a3bff] px-1.5 py-px text-[10px] not-italic text-white">{requests.length}</em>}</button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {activeTab === "conversations" ? visibleConversations.map(conversation => (
                <button className={`flex w-full items-center gap-2.5 border-0 px-4 py-3 text-left ${activeConversation === conversation.id ? "bg-[#1e2752]" : "bg-transparent"} hover:bg-[#1e2752]`} key={conversation.id} onClick={() => openConversation(conversation.id)}>
                  <Avatar name={conversation.name} color={conversation.color} online={conversation.online} />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex justify-between gap-2"><b className="truncate text-sm">{conversation.name}</b><time className="text-xs text-[#a6adcb]">{conversation.messages.at(-1)?.time}</time></span>
                    <span className="truncate text-xs text-[#a6adcb]">{conversation.messages.at(-1)?.from === "me" ? "You: " : ""}{conversation.messages.at(-1)?.text}</span>
                  </span>
                </button>
              )) : (
                <>
                  {requests.length > 0 && <div className="border-b border-[#2d3560]"><div className="px-4 pb-2 pt-3.5 text-[11px] font-extrabold uppercase tracking-[.08em] text-[#a6adcb]">Friend requests</div>
                    {requests.map(request => {
                      const user = request.requester
                      return <div className="flex items-center gap-2.5 px-4 py-2.5" key={request.id}><Avatar name={formatUser(user)} color={COLORS[user.id % COLORS.length]} online /><div className="flex min-w-0 flex-1 flex-col gap-1"><b className="truncate text-sm">{formatUser(user)}</b><span className="truncate text-xs text-[#a6adcb]">Wants to connect</span></div><button className="grid size-7 place-items-center rounded-full border-0 bg-[#2a3bff] text-white" onClick={() => decideRequest(request.id, "ACCEPT")} aria-label="Accept request"><Check size={15} /></button><button className="grid size-7 place-items-center rounded-full border border-[#2d3560] bg-transparent text-[#a6adcb]" onClick={() => decideRequest(request.id, "DECLINE")} aria-label="Decline request"><X size={15} /></button></div>
                    })}
                  </div>}
                  <div><div className="px-4 pb-2 pt-3.5 text-[11px] font-extrabold uppercase tracking-[.08em] text-[#a6adcb]">Friends ({friendUsers.length})</div>
                    {friendUsers.length ? friendUsers.map(user => <button className="flex w-full items-center gap-2.5 border-0 bg-transparent px-4 py-3 text-left hover:bg-[#1e2752]" key={user.id} onClick={() => openConversation(user.id)}><Avatar name={formatUser(user)} color={COLORS[user.id % COLORS.length]} online /><span className="flex min-w-0 flex-1 flex-col gap-1"><span className="flex justify-between gap-2"><b className="truncate text-sm">{formatUser(user)}</b></span><span className="truncate text-xs text-[#a6adcb]">@{user.username}</span></span></button>) : <div className="p-6 text-center text-xs text-[#a6adcb]">{token ? "No friends yet" : "Sign in to see your friends"}</div>}
                  </div>
                </>
              )}
            </div>
          </>
        )}
        <button className={`mt-auto flex h-[68px] w-full items-center gap-2.5 border-0 border-t border-[#2d3560] px-4 py-3 text-left ${view === "settings" || view === "change-password" ? "bg-[#1e2752]" : "bg-transparent"} hover:bg-[#1e2752]`} onClick={() => setView("settings")}>
          <Avatar name={currentUser?.displayName ?? currentUser?.username ?? "Your account"} color="#4338ca" online />
          <span className="flex min-w-0 flex-1 flex-col gap-1"><b className="truncate text-sm">{currentUser?.displayName ?? currentUser?.username ?? "Your account"}</b><span className="truncate text-xs text-[#a6adcb]">Settings</span></span>
          <Settings size={17} />
        </button>
      </aside>

      <section className="relative flex min-h-0 min-w-0 border-l border-[#2d3560] bg-[#0d1026]">
        {view === "settings" ? <SettingsView user={currentUser} onBack={() => setView("chat")} onChangePassword={() => setView("change-password")} onLogout={logout} /> :
          view === "change-password" ? <ChangePasswordForm onBack={() => setView("settings")} /> :
          view === "new-group" ? <NewGroupView onBack={() => setView("chat")} friends={friendUsers} /> :
            active ? <ChatView conversation={active} message={message} setMessage={setMessage} onSend={sendMessage} showInfo={showInfo} setShowInfo={setShowInfo} onBack={() => setActiveConversation(null)} /> :
              <div className="m-auto grid max-w-[360px] place-items-center p-6 text-center"><Image src="/sender-icon.svg" alt="Sender" width={360} height={360} /><h2 className="my-4 text-2xl font-semibold tracking-[-.04em]">Your conversations, in one place.</h2><p className="m-0 leading-relaxed text-[#a6adcb]">Select a conversation or find someone new to message.</p></div>}
        {showInfo && active && <InfoPanel conversation={active} onClose={() => setShowInfo(false)} />}
      </section>
    </main>
  )
}

function ChatView({ conversation, message, setMessage, onSend, showInfo, setShowInfo, onBack }: { conversation: Conversation; message: string; setMessage: (value: string) => void; onSend: (event: React.FormEvent) => void; showInfo: boolean; setShowInfo: (value: boolean) => void; onBack: () => void }) {
  return <div className="flex min-h-0 min-w-0 flex-1 flex-col">
    <header className="flex min-h-[67px] items-center gap-2.5 border-b border-[#2d3560] bg-[#151b42] px-4 py-3"><button className="grid size-9 shrink-0 place-items-center rounded-[10px] border-0 bg-transparent text-[#a6adcb] max-[720px]:grid hover:bg-[#252e68] hover:text-[#2a3bff]" onClick={onBack} aria-label="Back"><ArrowLeft size={20} /></button><Avatar name={conversation.name} color={conversation.color} online={conversation.online} /><div className="flex min-w-0 flex-col gap-1"><b className="text-[15px]">{conversation.name}</b><span className="text-xs text-[#a6adcb]">{conversation.group ? `${conversation.members} members` : conversation.online ? "Active now" : "Offline"}</span></div><span className="ml-auto" /><button className={`grid size-9 shrink-0 place-items-center rounded-[10px] border-0 bg-transparent text-[#a6adcb] hover:bg-[#252e68] hover:text-[#2a3bff] ${showInfo ? "bg-[#252e68] text-[#2a3bff]" : ""}`} onClick={() => setShowInfo(!showInfo)} aria-label="Conversation info"><Info size={19} /></button></header>
    <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto px-[max(18px,5vw)] py-5">
      <div className="my-0 mb-4 self-center text-[11px] text-[#a6adcb]">Today</div>
      {conversation.messages.map((item, index) => <div className={`mb-0.5 flex ${item.from === "me" ? "justify-end" : ""}`} key={`${item.time}-${index}`}><div className={`max-w-[min(70%,460px)] overflow-wrap-anywhere rounded-[17px_17px_17px_5px] border border-[#2d3560] bg-[#151b42] px-3 py-2.5 leading-[1.45] ${item.from === "me" ? "rounded-[17px_17px_5px_17px] border-0 bg-[#2a3bff] text-white" : ""}`}>{item.text}<small className={`mt-1 block text-right text-[10px] text-[#a6adcb] ${item.from === "me" ? "text-[#bde9df]" : ""}`}>{item.time}</small></div></div>)}
      <div className="mt-2 flex items-center gap-1 self-start text-xs text-[#a6adcb]"><span className="size-1 rounded-full bg-[#a6adcb]" /><span className="size-1 rounded-full bg-[#a6adcb]" /><span className="size-1 rounded-full bg-[#a6adcb]" /> Minh Anh is typing</div>
    </div>
    <form className="flex h-[68px] items-center gap-2 border-t border-[#2d3560] bg-[#151b42] px-4 py-3" onSubmit={onSend}><button type="button" className="grid size-9 shrink-0 place-items-center rounded-[10px] border-0 bg-transparent text-[#a6adcb]" aria-label="Attach a file"><Paperclip size={19} /></button><input className="min-w-0 flex-1 rounded-[22px] border border-[#2d3560] bg-[#0d1026] px-4 py-2.5 text-[#f7f8ff] outline-0" value={message} onChange={event => setMessage(event.target.value)} placeholder="Write a message..." aria-label="Message" /><button className="grid size-[38px] shrink-0 place-items-center rounded-full border-0 bg-[#2a3bff] text-white disabled:cursor-default disabled:opacity-45" type="submit" disabled={!message.trim()} aria-label="Send message"><Send size={18} /></button></form>
  </div>
}

function InfoPanel({ conversation, onClose }: { conversation: Conversation; onClose: () => void }) {
  return <aside className="absolute inset-0 z-20 w-full overflow-auto border-l border-[#2d3560] bg-[#151b42] md:relative md:w-[300px]"><header className="flex items-center justify-between border-b border-[#2d3560] px-4 py-3.5"><b className="text-sm">Conversation info</b><button className="grid size-9 place-items-center rounded-[10px] border-0 bg-transparent text-[#a6adcb]" onClick={onClose} aria-label="Close info"><X size={18} /></button></header><div className="p-6 text-center"><Avatar name={conversation.name} color={conversation.color} online={conversation.online} size="lg" /><h3 className="mt-3 text-base">{conversation.name}</h3><p className="my-1 text-xs text-[#a6adcb]">{conversation.group ? `${conversation.members} members` : conversation.online ? "Active now" : "Offline"}</p><div className="flex justify-center gap-4"><button className="flex flex-col items-center gap-1.5 border-0 bg-transparent text-[11px] text-[#a6adcb]"><Bell size={34} className="rounded-full bg-[#1e2752] p-2 text-[#2a3bff]" /><span>Mute</span></button><button className="flex flex-col items-center gap-1.5 border-0 bg-transparent text-[11px] text-[#a6adcb]"><Search size={34} className="rounded-full bg-[#1e2752] p-2 text-[#2a3bff]" /><span>Search</span></button><button className="flex flex-col items-center gap-1.5 border-0 bg-transparent text-[11px] text-[#a6adcb]"><Users size={34} className="rounded-full bg-[#1e2752] p-2 text-[#2a3bff]" /><span>Add people</span></button></div></div><details className="border-t border-[#2d3560] px-4" open><summary className="flex cursor-pointer list-none justify-between py-4 text-sm font-semibold">Media, files and links <ChevronRight size={16} /></summary><p className="p-4 text-center text-xs text-[#a6adcb]">No shared media yet.</p></details><details className="border-t border-[#2d3560] px-4"><summary className="flex cursor-pointer list-none justify-between py-4 text-sm font-semibold">Privacy and support <ChevronRight size={16} /></summary><button className="border-0 bg-transparent pb-4 text-[#ffb5a7]">Delete chat</button></details></aside>
}

function NewGroupView({ onBack, friends }: { onBack: () => void; friends: Array<UserSummary & { friendshipId: number }> }) {
  return <div className="flex min-h-0 min-w-0 flex-1 flex-col"><header className="flex min-h-[67px] items-center gap-2.5 border-b border-[#2d3560] bg-[#151b42] px-4 py-3"><button className="grid size-9 place-items-center rounded-[10px] border-0 bg-transparent text-[#a6adcb]" onClick={onBack} aria-label="Back"><ArrowLeft size={20} /></button><b className="text-[15px]">New group</b></header><div className="w-full flex-1 overflow-auto px-[clamp(24px,6vw,72px)] pb-8 pt-2"><div className="py-5"><div className="grid size-[52px] rotate-[-7deg] place-items-center rounded-[10px] bg-[#2a3bff] text-[#f2fffb]"><Users size={24} /></div><h2 className="my-4 max-w-[360px] text-[28px] font-semibold tracking-[-.05em]">Create a group for your next conversation.</h2><p className="max-w-[420px] leading-relaxed text-[#a6adcb]">Groups are mock data for now. Friends are loaded from the friendships API.</p></div><label className="my-4 grid gap-2 text-xs font-bold text-[#a6adcb]">Group name<input className="rounded-lg border border-[#2d3560] bg-[#151b42] px-3 py-2 text-[#f7f8ff]" placeholder="Name your group" /></label><h3 className="my-4 text-sm">Add members</h3>{friends.length ? friends.map(friend => <label className="flex items-center gap-2.5 border-b border-[#2d3560] py-2.5 text-sm" key={friend.id}><input className="accent-[#2a3bff]" type="checkbox" /><Avatar name={formatUser(friend)} color="#0f766e" /><span>{formatUser(friend)}</span></label>) : <p className="p-4 text-center text-xs text-[#a6adcb]">Add friends first to start a group.</p>}<button className="mt-6 rounded-lg border-0 bg-[#2a3bff] px-4 py-2.5 font-bold text-white">Create group</button></div></div>
}
