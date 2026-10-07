"use client"

import {useEffect, useState} from "react"
import {useInfiniteQuery} from "@tanstack/react-query"
import {ChevronRight, Download, FileText} from "lucide-react"
import {
    conversationApi,
    type AttachmentKind,
    type ConversationAttachment,
} from "@/lib/conversation/api"

type MediaFilesSectionProps = {
    conversationId: number
    token: string
}

function AttachmentThumb({
    token,
    conversationId,
    attachment,
}: {
    token: string
    conversationId: number
    attachment: ConversationAttachment
}) {
    const isImage = attachment.contentType.startsWith("image/")
    const [imageUrl, setImageUrl] = useState<string | null>(null)

    useEffect(() => {
        if (!isImage) return
        let cancelled = false
        conversationApi
            .downloadAttachment(token, conversationId, attachment.messageId, attachment.id)
            .then(response => {
                if (!cancelled) setImageUrl(response.getUrl)
            })
            .catch(() => {
                if (!cancelled) setImageUrl(null)
            })
        return () => {
            cancelled = true
        }
    }, [attachment.id, attachment.messageId, conversationId, isImage, token])

    async function open() {
        const response = await conversationApi.downloadAttachment(
            token,
            conversationId,
            attachment.messageId,
            attachment.id,
        )
        window.open(response.getUrl, "_blank", "noopener,noreferrer")
    }

    if (isImage) {
        return (
            <button
                type="button"
                onClick={open}
                className="aspect-square overflow-hidden rounded-md border-0 bg-[#0d1026] p-0"
                aria-label={`Open ${attachment.originalFilename}`}
            >
                {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={imageUrl}
                        alt={attachment.originalFilename}
                        className="size-full object-cover"
                    />
                ) : (
                    <span className="grid size-full place-items-center text-[10px] text-[#a6adcb]">
                        …
                    </span>
                )}
            </button>
        )
    }

    return (
        <button
            type="button"
            onClick={open}
            className="flex w-full items-center gap-2 rounded-lg border border-[#2d3560] bg-[#0d1026] px-2.5 py-2 text-left text-xs text-[#f7f8ff]"
            aria-label={`Download ${attachment.originalFilename}`}
        >
            <FileText size={14} className="shrink-0 text-[#a6adcb]"/>
            <span className="min-w-0 flex-1 truncate">{attachment.originalFilename}</span>
            <Download size={12} className="shrink-0 opacity-80"/>
        </button>
    )
}

function AttachmentKindPanel({
    conversationId,
    token,
    kind,
    enabled,
}: {
    conversationId: number
    token: string
    kind: Extract<AttachmentKind, "media" | "files">
    enabled: boolean
}) {
    const query = useInfiniteQuery({
        queryKey: ["conversation-attachments", token, conversationId, kind],
        enabled,
        initialPageParam: null as string | null,
        queryFn: ({pageParam}) =>
            conversationApi.listAttachments(token, conversationId, {
                kind,
                cursor: pageParam,
                limit: 30,
            }),
        getNextPageParam: lastPage => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    })

    if (!enabled) {
        return null
    }

    const items = query.data?.pages.flatMap(page => page.items) ?? []

    if (query.isLoading || query.isPending) {
        return <p className="px-1 py-3 text-center text-xs text-[#a6adcb]">Loading…</p>
    }

    if (query.isError) {
        return (
            <p className="px-1 py-3 text-center text-xs text-[#ffb5a7]">
                Could not load {kind === "media" ? "media" : "files"}.
            </p>
        )
    }

    if (!items.length) {
        return (
            <p className="px-1 py-3 text-center text-xs text-[#a6adcb]">
                {kind === "media" ? "No shared media yet." : "No shared files yet."}
            </p>
        )
    }

    return (
        <div className="space-y-2 pb-3">
            {kind === "media" ? (
                <div className="grid grid-cols-3 gap-1.5">
                    {items.map(item => (
                        <AttachmentThumb
                            key={item.id}
                            token={token}
                            conversationId={conversationId}
                            attachment={item}
                        />
                    ))}
                </div>
            ) : (
                <ul className="space-y-1.5">
                    {items.map(item => (
                        <li key={item.id}>
                            <AttachmentThumb
                                token={token}
                                conversationId={conversationId}
                                attachment={item}
                            />
                        </li>
                    ))}
                </ul>
            )}
            {query.hasNextPage ? (
                <button
                    type="button"
                    disabled={query.isFetchingNextPage}
                    onClick={() => void query.fetchNextPage()}
                    className="w-full rounded-lg border border-[#2d3560] bg-transparent px-2 py-1.5 text-xs text-[#a6adcb] disabled:opacity-60"
                >
                    {query.isFetchingNextPage ? "Loading…" : "Load more"}
                </button>
            ) : null}
        </div>
    )
}

export function MediaFilesSection({conversationId, token}: MediaFilesSectionProps) {
    const [open, setOpen] = useState(false)
    const [kind, setKind] = useState<Extract<AttachmentKind, "media" | "files">>("media")

    return (
        <details
            className="border-t border-[#2d3560] px-4"
            open={open}
            onToggle={event => setOpen(event.currentTarget.open)}
        >
            <summary className="flex cursor-pointer list-none justify-between py-4 text-sm font-semibold">
                Media and files <ChevronRight size={16}/>
            </summary>
            <div className="pb-1">
                <div className="mb-2 flex gap-1">
                    <button
                        type="button"
                        onClick={() => setKind("media")}
                        className={`rounded-md border px-2.5 py-1 text-xs ${
                            kind === "media"
                                ? "border-[#6572ff] bg-[#1e2752] text-white"
                                : "border-[#2d3560] bg-transparent text-[#a6adcb]"
                        }`}
                    >
                        Media
                    </button>
                    <button
                        type="button"
                        onClick={() => setKind("files")}
                        className={`rounded-md border px-2.5 py-1 text-xs ${
                            kind === "files"
                                ? "border-[#6572ff] bg-[#1e2752] text-white"
                                : "border-[#2d3560] bg-transparent text-[#a6adcb]"
                        }`}
                    >
                        Files
                    </button>
                </div>
                <AttachmentKindPanel
                    conversationId={conversationId}
                    token={token}
                    kind="media"
                    enabled={open && kind === "media"}
                />
                <AttachmentKindPanel
                    conversationId={conversationId}
                    token={token}
                    kind="files"
                    enabled={open && kind === "files"}
                />
            </div>
        </details>
    )
}
