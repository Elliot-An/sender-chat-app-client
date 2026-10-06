export type RealtimeEvent<TPayload = unknown> = {
  eventId: string
  type: string
  occurredAt: string
  payload: TPayload
}

const WS_URL = (process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080/ws").replace(/^http/, "ws")

function frame(command: string, headers: Record<string, string>, body = "") {
  return `${command}\n${Object.entries(headers).map(([key, value]) => `${key}:${value}`).join("\n")}\n\n${body}\0`
}

type RealtimeClientOptions = {
  token: string
  onConnected?: (reconnected: boolean) => void
  onReady?: (publish: (conversationId: number, state: "STARTED" | "STOPPED") => void) => void
  onEvent: (event: RealtimeEvent) => void
  onReconnect?: () => void
}

export function connectRealtime({
  token,
  onConnected,
  onEvent,
  onReconnect,
  onReady,
}: RealtimeClientOptions) {
  let socket: WebSocket | null = null
  let stopped = false
  let reconnectTimer: number | undefined
  let reconnectDelay = 1000
  const seenEvents = new Set<string>()
  let wasConnected = false

  function connect() {
    if (stopped) return
    const currentSocket = new WebSocket(WS_URL)
    socket = currentSocket
    currentSocket.onopen = () => {
      if (stopped || currentSocket.readyState !== WebSocket.OPEN) {
        currentSocket.close()
        return
      }
      reconnectDelay = 1000
      currentSocket.send(frame("CONNECT", { Authorization: `Bearer ${token}`, "accept-version": "1.2", host: "sender" }))
    }
    currentSocket.onmessage = message => {
      if (stopped || currentSocket.readyState !== WebSocket.OPEN) return
      const raw = String(message.data)
      const command = raw.split("\n", 1)[0]
      if (command === "CONNECTED") {
        console.info(`[realtime] connected${wasConnected ? " (reconnected)" : ""} to ${WS_URL}`)
        currentSocket.send(frame("SUBSCRIBE", { id: "user-events", destination: "/user/queue/events", ack: "auto" }))
        onReady?.((conversationId, state) => {
          if (currentSocket.readyState !== WebSocket.OPEN) return
          currentSocket.send(frame("SEND", {
            destination: `/app/conversations/${conversationId}/typing`,
            "content-type": "application/json",
          }, JSON.stringify({ state })))
        })
        onConnected?.(wasConnected)
        if (wasConnected) onReconnect?.()
        wasConnected = true
        return
      }
      if (command !== "MESSAGE") return
      const body = raw.split("\n\n").slice(1).join("\n\n").replace(/\0$/, "")
      if (!body) return
      try {
        const event = JSON.parse(body) as RealtimeEvent
        if (event.eventId && !seenEvents.has(event.eventId)) {
          seenEvents.add(event.eventId)
          onEvent(event)
        }
      } catch (error) {
        console.error("Could not decode realtime event", error)
      }
    }
    currentSocket.onclose = () => {
      if (stopped) return
      reconnectTimer = window.setTimeout(connect, reconnectDelay)
      reconnectDelay = Math.min(reconnectDelay * 2, 30000)
    }
  }

  connect()
  return () => {
    stopped = true
    if (reconnectTimer) window.clearTimeout(reconnectTimer)
    if (!socket) return
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(frame("DISCONNECT", { receipt: crypto.randomUUID() }))
    }
    if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) {
      socket.close()
    }
  }
}
