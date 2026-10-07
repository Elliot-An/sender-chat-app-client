"use client"

import {Search, X} from "lucide-react"
import {useEffect, useState} from "react"
import {useQuery} from "@tanstack/react-query"
import {
    conversationApi,
    type MessageSearchResult,
} from "@/lib/conversation/api"

type MessageSearchProps = {
    token: string
    conversationId: number
    onClose: () => void
    onSelect: (messageId: number) => void
}

export function MessageSearch({
                                  token,
                                  conversationId,
                                  onClose,
                                  onSelect,
                              }: MessageSearchProps) {
    const [query, setQuery] = useState("")
    const [debouncedQuery, setDebouncedQuery] = useState("")

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250)
        return () => window.clearTimeout(timer)
    }, [query])

    const result = useQuery({
        queryKey: ["message-search", token, conversationId, debouncedQuery],
        queryFn: () =>
            conversationApi.searchMessages(token, conversationId, debouncedQuery),
        enabled: debouncedQuery.length >= 2,
    })

    return (
        <aside
            className="absolute inset-x-4 top-4 z-30 max-h-[min(70vh,520px)] overflow-auto rounded-xl border border-[#2d3560] bg-[#151b42] shadow-2xl">
            <header className="flex items-center gap-2 border-b border-[#2d3560] p-3">
                <Search size={17} className="text-[#a6adcb]"/>
                <input
                    autoFocus
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    placeholder="Search messages..."
                    aria-label="Search messages"
                    className="min-w-0 flex-1 bg-transparent text-sm text-[#f7f8ff] outline-none"
                />
                <button
                    onClick={onClose}
                    aria-label="Close message search"
                    className="grid size-8 place-items-center rounded-lg border-0 bg-transparent text-[#a6adcb] hover:bg-[#252e68]"
                >
                    <X size={17}/>
                </button>
            </header>

            {debouncedQuery.length < 2 ? (
                <p className="p-5 text-center text-xs text-[#a6adcb]">
                    Type at least 2 characters.
                </p>
            ) : result.isPending ? (
                <p className="p-5 text-center text-xs text-[#a6adcb]">Searching...</p>
            ) : result.isError ? (
                <p className="p-5 text-center text-xs text-[#ffb5a7]">
                    Search failed. Try again.
                </p>
            ) : result.data?.items.length ? (
                <div className="divide-y divide-[#2d3560]">
                    {result.data.items.map((item: MessageSearchResult) => (
                        <button
                            key={item.message.id}
                            onClick={() => onSelect(item.message.id)}
                            className="block w-full px-4 py-3 text-left hover:bg-[#1e2752]"
                        >
              <span className="block text-xs text-[#a6adcb]">
                {item.message.sender.displayName || item.message.sender.username}
                  {" · "}
                  {new Date(item.message.createdAt).toLocaleString()}
              </span>
                            <span className="mt-1 block overflow-hidden text-sm text-[#f7f8ff]">
                {item.snippet}
              </span>
                        </button>
                    ))}
                </div>
            ) : (
                <p className="p-5 text-center text-xs text-[#a6adcb]">
                    No messages found.
                </p>
            )}
        </aside>
    )
}
