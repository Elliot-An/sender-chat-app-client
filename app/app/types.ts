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
  unreadCount: number
}

export const AVATAR_COLORS = [
  "#0f766e",
  "#9a3412",
  "#a16207",
  "#4338ca",
  "#be123c",
  "#0369a1",
] as const

export function initials(name: string) {
  return name
    .split(" ")
    .map(part => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}
