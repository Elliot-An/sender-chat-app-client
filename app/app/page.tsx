"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  Check,
  MessageCirclePlus,
  Search,
  Settings,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import { authApi, clearAccessToken, getAccessToken, type PublicUser } from "@/lib/auth/api"
import { socialApi, type Friendship, type UserSummary } from "@/lib/social/api"
import { conversationApi, type Message, type MessageProgressEvent } from "@/lib/conversation/api"
import { ChangePasswordForm } from "./change-password-form"
import { SettingsView } from "./settings-view"
import { connectRealtime, type RealtimeEvent } from "@/lib/realtime/client"
import { Avatar, ChatView, InfoPanel, initials, type Conversation } from "./conversation-components"
import { useConversationMessages } from "./use-conversation-messages"

const COLORS = ["#0f766e", "#9a3412", "#a16207", "#4338ca", "#be123c", "#0369a1"]

function formatUser(user: UserSummary) {
  return user.displayName || user.username
}

function summaryToConversation(summary: { id: number; type: "DIRECT" | "GROUP"; name: string | null; otherUser: UserSummary | null; latestMessage: { id: number; body: string; createdAt: string } | null }): Conversation {
  const name = summary.name || summary.otherUser?.displayName || summary.otherUser?.username || "Conversation"
  return {
    id: summary.id,
    name,
    initials: initials(name),
    color: COLORS[summary.id % COLORS.length],
    online: false,
    group: summary.type === "GROUP",
    members: summary.type === "GROUP" ? 0 : undefined,
    messages: summary.latestMessage ? [{
      id: summary.latestMessage.id,
      from: "them",
      text: summary.latestMessage.body,
      time: new Date(summary.latestMessage.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      delivery: "sent",
      deliveredBy: [],
      readBy: [],
    }] : [],
  }
}

export default function AppPage() {
  const [currentUser, setCurrentUser] = useState<PublicUser | null>(null)
  const [friends, setFriends] = useState<Friendship[]>([])
  const [requests, setRequests] = useState<Friendship[]>([])
  const [searchResults, setSearchResults] = useState<UserSummary[]>([])
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<"conversations" | "friends">("conversations")
  const [activeConversation, setActiveConversation] = useState<number | null>(null)
  const [message, setMessage] = useState("")
  const [showInfo, setShowInfo] = useState(false)
  const [view, setView] = useState<"chat" | "settings" | "change-password" | "new-group">("chat")
  const [loadingSocial, setLoadingSocial] = useState(true)
  const [sentRequestUserIds, setSentRequestUserIds] = useState<number[]>([])

  const token = getAccessToken()
  const queryClient = useQueryClient()
  const conversationQuery = useQuery({
    queryKey: ["conversations", token],
    queryFn: () => conversationApi.list(token as string),
    enabled: Boolean(token),
  })
  const { messageQuery, sendMutation, activeMessages, handleRealtimeMessage, handleRealtimeProgress } = useConversationMessages(token, activeConversation, currentUser?.id)
  const conversations = useMemo(() => (conversationQuery.data?.items ?? []).map(summaryToConversation), [conversationQuery.data])
  const active = conversations.find(item => item.id === activeConversation) ?? null

  useEffect(() => {
    if (activeConversation === null && conversations.length) setActiveConversation(conversations[0].id)
  }, [activeConversation, conversations])

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
    if (!token) return
    return connectRealtime({
      token,
      onConnected: reconnected => {
        console.info(`[realtime] client connected${reconnected ? " after reconnect" : ""}`)
      },
      onEvent: (event: RealtimeEvent) => {
        if (event.type === "MESSAGE_CREATED") {
          const payload = event.payload as { message?: Message }
          const incoming = payload.message
          if (!incoming) return
          handleRealtimeMessage(incoming)
          return
        }
        if (event.type === "MESSAGE_DELIVERED" || event.type === "MESSAGE_READ") {
          const payload = event.payload as MessageProgressEvent
          handleRealtimeProgress({ ...payload, kind: event.type === "MESSAGE_READ" ? "READ" : "DELIVERED" })
          return
        }
        const payload = event.payload as { friendship?: Friendship }
        if (!payload.friendship) return
        if (event.type === "FRIEND_REQUEST_CREATED") {
          setRequests(items => items.some(item => item.id === payload.friendship?.id)
            ? items
            : [payload.friendship as Friendship, ...items])
          return
        }
        if (event.type === "FRIENDSHIP_UPDATED" && payload.friendship.status === "ACCEPTED") {
          setFriends(items => items.some(item => item.id === payload.friendship?.id)
            ? items
            : [...items, payload.friendship as Friendship])
        }
      },
      onReconnect: () => {
        queryClient.invalidateQueries({ queryKey: ["conversations", token] })
        queryClient.invalidateQueries({ queryKey: ["messages", token] })
        Promise.all([socialApi.requests(token), socialApi.friends(token)])
          .then(([incoming, accepted]) => {
            setRequests(incoming)
            setFriends(accepted)
          })
          .catch(error => console.error("Could not reconcile realtime state", error))
      },
    })
  }, [handleRealtimeMessage, handleRealtimeProgress, queryClient, token])

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

  async function startDirect(userId: number) {
    if (!token) return
    try {
      const conversation = await conversationApi.direct(token, userId)
      await queryClient.invalidateQueries({ queryKey: ["conversations", token] })
      openConversation(conversation.id)
    } catch (error) {
      console.error("Could not create conversation", error)
    }
  }

  async function createGroup(name: string, memberIds: number[]) {
    if (!token) return
    try {
      const conversation = await conversationApi.group(token, name, memberIds)
      await queryClient.invalidateQueries({ queryKey: ["conversations", token] })
      openConversation(conversation.id)
    } catch (error) {
      console.error("Could not create group", error)
    }
  }

  function sendMessage(event: React.FormEvent) {
    event.preventDefault()
    const text = message.trim()
    if (!text || !active) return
    sendMutation.mutate({ id: active.id, body: text })
    setMessage("")
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
                    <span className="flex justify-between gap-2"><b className="truncate text-sm">{conversation.name}</b><span className="flex items-center gap-2"><time className="text-xs text-[#a6adcb]">{conversation.messages.at(-1)?.time}</time>{conversation.unreadCount > 0 && <em className="min-w-5 rounded-full bg-[#2a3bff] px-1.5 py-0.5 text-center text-[10px] not-italic text-white">{conversation.unreadCount}</em>}</span></span>
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
                    {friendUsers.length ? friendUsers.map(user => <button className="flex w-full items-center gap-2.5 border-0 bg-transparent px-4 py-3 text-left hover:bg-[#1e2752]" key={user.id} onClick={() => startDirect(user.id)}><Avatar name={formatUser(user)} color={COLORS[user.id % COLORS.length]} online /><span className="flex min-w-0 flex-1 flex-col gap-1"><span className="flex justify-between gap-2"><b className="truncate text-sm">{formatUser(user)}</b></span><span className="truncate text-xs text-[#a6adcb]">@{user.username}</span></span></button>) : <div className="p-6 text-center text-xs text-[#a6adcb]">{token ? "No friends yet" : "Sign in to see your friends"}</div>}
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
          view === "new-group" ? <NewGroupView onBack={() => setView("chat")} friends={friendUsers} onCreate={createGroup} /> :
            active ? <ChatView conversation={{ ...active, messages: activeMessages }} message={message} setMessage={setMessage} onSend={sendMessage} showInfo={showInfo} setShowInfo={setShowInfo} onBack={() => setActiveConversation(null)} onLoadMore={() => messageQuery.fetchNextPage()} hasMore={Boolean(messageQuery.hasNextPage)} /> :
              <div className="m-auto grid max-w-[360px] place-items-center p-6 text-center"><Image src="/sender-icon.svg" loading="eager" alt="Sender" width={360} height={360} /><h2 className="my-4 text-2xl font-semibold tracking-[-.04em]">Your conversations, in one place.</h2><p className="m-0 leading-relaxed text-[#a6adcb]">Select a conversation or find someone new to message.</p></div>}
        {showInfo && active && <InfoPanel conversation={active} onClose={() => setShowInfo(false)} />}
      </section>
    </main>
  )
}

function NewGroupView({ onBack, friends, onCreate }: { onBack: () => void; friends: Array<UserSummary & { friendshipId: number }>; onCreate: (name: string, memberIds: number[]) => void }) {
  const [name, setName] = useState("")
  const [selected, setSelected] = useState<number[]>([])
  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (name.trim() && selected.length) onCreate(name.trim(), selected)
  }
  return <div className="flex min-h-0 min-w-0 flex-1 flex-col"><header className="flex min-h-[67px] items-center gap-2.5 border-b border-[#2d3560] bg-[#151b42] px-4 py-3"><button className="grid size-9 place-items-center rounded-[10px] border-0 bg-transparent text-[#a6adcb]" onClick={onBack} aria-label="Back"><ArrowLeft size={20} /></button><b className="text-[15px]">New group</b></header><form className="w-full flex-1 overflow-auto px-[clamp(24px,6vw,72px)] pb-8 pt-2" onSubmit={submit}><div className="py-5"><div className="grid size-[52px] rotate-[-7deg] place-items-center rounded-[10px] bg-[#2a3bff] text-[#f2fffb]"><Users size={24} /></div><h2 className="my-4 max-w-[360px] text-[28px] font-semibold tracking-[-.05em]">Create a group for your next conversation.</h2><p className="max-w-[420px] leading-relaxed text-[#a6adcb]">Add accepted friends to start a shared conversation.</p></div><label className="my-4 grid gap-2 text-xs font-bold text-[#a6adcb]">Group name<input required maxLength={100} className="rounded-lg border border-[#2d3560] bg-[#151b42] px-3 py-2 text-[#f7f8ff]" value={name} onChange={event => setName(event.target.value)} placeholder="Name your group" /></label><h3 className="my-4 text-sm">Add members</h3>{friends.length ? friends.map(friend => <label className="flex items-center gap-2.5 border-b border-[#2d3560] py-2.5 text-sm" key={friend.id}><input className="accent-[#2a3bff]" type="checkbox" checked={selected.includes(friend.id)} onChange={event => setSelected(ids => event.target.checked ? [...ids, friend.id] : ids.filter(id => id !== friend.id))} /><Avatar name={formatUser(friend)} color="#0f766e" /><span>{formatUser(friend)}</span></label>) : <p className="p-4 text-center text-xs text-[#a6adcb]">Add friends first to start a group.</p>}<button disabled={!name.trim() || !selected.length} className="mt-6 rounded-lg border-0 bg-[#2a3bff] px-4 py-2.5 font-bold text-white disabled:opacity-50">Create group</button></form></div>
}
