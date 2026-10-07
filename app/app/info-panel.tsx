"use client"

import {useEffect, useMemo, useRef, useState} from "react"
import {Check, ChevronRight, Search, UserMinus, Users, X} from "lucide-react"
import {conversationApi, type ConversationMember} from "@/lib/conversation/api"
import {userApi} from "@/lib/user/api"
import {prepareAvatarFile} from "@/lib/user/prepare-avatar"
import {Avatar} from "./avatar"
import {MediaFilesSection} from "./media-files-section"
import {AVATAR_COLORS, type Conversation} from "./types"

const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

type FriendOption = {
    id: number
    username: string
    displayName: string
    avatarUrl: string | null
    online?: boolean
}

type InfoPanelProps = {
    conversation: Conversation
    members: ConversationMember[]
    currentUserId: number | null
    token: string
    friends: FriendOption[]
    onClose: () => void
    onSearch: () => void
    onConversationUpdated: (conversationId: number) => void
    onLeftConversation: (conversationId: number) => void
}

function conversationStatus(conversation: Conversation, memberCount: number) {
    if (conversation.group) {
        return `${memberCount} members`
    }
    return conversation.online ? "Active now" : "Offline"
}

export function InfoPanel({
    conversation,
    members,
    currentUserId,
    token,
    friends,
    onClose,
    onSearch,
    onConversationUpdated,
    onLeftConversation,
}: InfoPanelProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [name, setName] = useState(conversation.name)
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")
    const [adding, setAdding] = useState(false)
    const [busyMemberId, setBusyMemberId] = useState<number | null>(null)
    const [confirmLeave, setConfirmLeave] = useState(false)

    useEffect(() => {
        setName(conversation.name)
        setFile(null)
        setPreview(null)
        setError("")
        setConfirmLeave(false)
    }, [conversation.id, conversation.name, conversation.avatarUrl])

    useEffect(() => {
        if (!file) {
            setPreview(null)
            return
        }
        const url = URL.createObjectURL(file)
        setPreview(url)
        return () => URL.revokeObjectURL(url)
    }, [file])

    const memberIds = useMemo(() => new Set(members.map(member => member.userId)), [members])
    const addableFriends = useMemo(
        () => friends.filter(friend => !memberIds.has(friend.id)),
        [friends, memberIds],
    )

    async function onAvatarChosen(event: React.ChangeEvent<HTMLInputElement>) {
        const next = event.target.files?.[0]
        if (!next) return
        setError("")
        if (!ALLOWED_TYPES.includes(next.type)) {
            setError("Avatar must be a JPEG, PNG, or WebP image")
            return
        }
        if (next.size > MAX_BYTES) {
            setError("Avatar must be 2MB or smaller")
            return
        }
        try {
            const prepared = await prepareAvatarFile(next)
            if (prepared.size > MAX_BYTES) {
                setError("Avatar must be 2MB or smaller")
                setFile(null)
                return
            }
            setFile(prepared)
        } catch {
            setError("Could not process avatar image")
            setFile(null)
        } finally {
            if (inputRef.current) inputRef.current.value = ""
        }
    }

    async function saveGroup(event: React.FormEvent) {
        event.preventDefault()
        if (!conversation.group) return
        const trimmed = name.trim()
        if (!trimmed || trimmed.length > 100) {
            setError("Group name must be 1 to 100 characters")
            return
        }
        setSaving(true)
        setError("")
        try {
            let avatarObjectKey: string | undefined
            if (file) {
                const contentType = file.type.split(";")[0].trim().toLowerCase()
                const upload = await conversationApi.createGroupAvatarUpload(token, conversation.id, {
                    contentType,
                    contentLength: file.size,
                })
                const put = await userApi.uploadAvatar(file, upload.putUrl, contentType)
                if (!put.ok) {
                    setError(put.message)
                    return
                }
                avatarObjectKey = upload.objectKey
            }
            const nameChanged = trimmed !== conversation.name
            if (nameChanged || avatarObjectKey) {
                await conversationApi.updateGroup(token, conversation.id, {
                    ...(nameChanged ? {name: trimmed} : {}),
                    ...(avatarObjectKey ? {avatarObjectKey} : {}),
                })
            }
            setFile(null)
            onConversationUpdated(conversation.id)
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Could not update group")
        } finally {
            setSaving(false)
        }
    }

    async function addFriend(userId: number) {
        setBusyMemberId(userId)
        setError("")
        try {
            await conversationApi.addMember(token, conversation.id, userId)
            setAdding(false)
            onConversationUpdated(conversation.id)
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Could not add member")
        } finally {
            setBusyMemberId(null)
        }
    }

    async function removeFriend(userId: number) {
        setBusyMemberId(userId)
        setError("")
        try {
            await conversationApi.removeMember(token, conversation.id, userId)
            onConversationUpdated(conversation.id)
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Could not remove member")
        } finally {
            setBusyMemberId(null)
        }
    }

    async function leaveGroup() {
        if (!currentUserId) return
        setSaving(true)
        setError("")
        try {
            await conversationApi.removeMember(token, conversation.id, currentUserId)
            onLeftConversation(conversation.id)
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Could not leave group")
            setConfirmLeave(false)
        } finally {
            setSaving(false)
        }
    }

    return (
        <aside
            className="absolute inset-0 z-20 w-full overflow-auto border-l border-[#2d3560] bg-[#151b42] md:relative md:w-[300px]">

            <div className="flex items-center justify-end px-4 pt-4">
                <button
                    type="button"
                    onClick={onClose}
                    className="grid size-8 place-items-center rounded-lg border-0 bg-transparent text-[#a6adcb] hover:text-white"
                    aria-label="Close info"
                >
                    <X size={18}/>
                </button>
            </div>

            <div className="px-6 pb-6 text-center">
                {conversation.group ? (
                    <form onSubmit={saveGroup} className="space-y-3">
                        <input
                            ref={inputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={onAvatarChosen}
                        />
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            className="mx-auto block border-0 bg-transparent p-0"
                            aria-label="Change group avatar"
                        >
                            <Avatar
                                name={name || conversation.name}
                                color={conversation.color}
                                size="lg"
                                imageUrl={preview ?? conversation.avatarUrl}
                            />
                        </button>
                        <input
                            value={name}
                            onChange={event => setName(event.target.value)}
                            maxLength={100}
                            className="w-full rounded-lg border border-[#2d3560] bg-[#0d1026] px-3 py-2 text-center text-base text-white outline-none focus:border-[#6572ff]"
                            aria-label="Group name"
                        />
                        <p className="my-1 text-xs text-[#a6adcb]">
                            {conversationStatus(conversation, members.length)}
                        </p>
                        {(name.trim() !== conversation.name || file) && (
                            <button
                                type="submit"
                                disabled={saving}
                                className="inline-flex items-center gap-1 rounded-lg border-0 bg-[#2a3bff] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                            >
                                <Check size={14}/>
                                {saving ? "Saving…" : "Save"}
                            </button>
                        )}
                    </form>
                ) : (
                    <>
                        <Avatar
                            name={conversation.name}
                            color={conversation.color}
                            online={conversation.online}
                            size="lg"
                            imageUrl={conversation.avatarUrl}
                        />
                        <h3 className="mt-3 text-base">{conversation.name}</h3>
                        <p className="my-1 text-xs text-[#a6adcb]">
                            {conversationStatus(conversation, members.length)}
                        </p>
                    </>
                )}

                <div className="mt-4 flex justify-center gap-4">
                    <button
                        onClick={onSearch}
                        type="button"
                        className="flex flex-col items-center gap-1.5 border-0 bg-transparent text-[11px] text-[#a6adcb]"
                    >
                        <Search
                            size={34}
                            className="rounded-full bg-[#1e2752] p-2 text-[#2a3bff]"
                        />
                        <span>Search</span>
                    </button>
                    {conversation.group && (
                        <button
                            type="button"
                            onClick={() => setAdding(open => !open)}
                            className="flex flex-col items-center gap-1.5 border-0 bg-transparent text-[11px] text-[#a6adcb]"
                        >
                            <Users
                                size={34}
                                className="rounded-full bg-[#1e2752] p-2 text-[#2a3bff]"
                            />
                            <span>Add people</span>
                        </button>
                    )}
                </div>
                {error ? <p className="mt-3 text-xs text-[#ffb5a7]">{error}</p> : null}
            </div>

            {conversation.group && adding && (
                <div className="border-t border-[#2d3560] px-4 py-3">
                    <p className="mb-2 text-xs font-semibold text-[#a6adcb]">Add a friend</p>
                    {addableFriends.length ? (
                        <ul className="space-y-1">
                            {addableFriends.map(friend => (
                                <li key={friend.id}>
                                    <button
                                        type="button"
                                        disabled={busyMemberId === friend.id}
                                        onClick={() => addFriend(friend.id)}
                                        className="flex w-full items-center gap-2 rounded-lg border-0 bg-transparent px-2 py-2 text-left text-sm hover:bg-[#1e2752] disabled:opacity-60"
                                    >
                                        <Avatar
                                            name={friend.displayName || friend.username}
                                            color={AVATAR_COLORS[friend.id % AVATAR_COLORS.length]}
                                            size="sm"
                                            online={Boolean(friend.online)}
                                            imageUrl={friend.avatarUrl}
                                        />
                                        <span className="truncate">
                                            {friend.displayName || friend.username}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-xs text-[#a6adcb]">No friends left to add.</p>
                    )}
                </div>
            )}

            {conversation.group && (
                <details className="border-t border-[#2d3560] px-4" open>
                    <summary className="flex cursor-pointer list-none justify-between py-4 text-sm font-semibold">
                        Members <ChevronRight size={16}/>
                    </summary>
                    <ul className="space-y-1 pb-4">
                        {members.map(member => {
                            const label = member.displayName || member.username
                            const isSelf = member.userId === currentUserId
                            const friend = friends.find(item => item.id === member.userId)
                            return (
                                <li
                                    key={member.userId}
                                    className="flex items-center gap-2 rounded-lg px-2 py-2"
                                >
                                    <Avatar
                                        name={label}
                                        color={AVATAR_COLORS[member.userId % AVATAR_COLORS.length]}
                                        size="sm"
                                        online={Boolean(friend?.online)}
                                        imageUrl={member.avatarUrl}
                                    />
                                    <span className="min-w-0 flex-1 truncate text-sm">
                                        {label}
                                        {isSelf ? (
                                            <span className="text-[#a6adcb]"> (you)</span>
                                        ) : null}
                                    </span>
                                    {!isSelf && (
                                        <button
                                            type="button"
                                            disabled={busyMemberId === member.userId}
                                            onClick={() => removeFriend(member.userId)}
                                            className="grid size-8 place-items-center rounded-lg border-0 bg-transparent text-[#ffb5a7] hover:bg-[#2a1f3d] disabled:opacity-60"
                                            aria-label={`Remove ${label}`}
                                        >
                                            <UserMinus size={16}/>
                                        </button>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                </details>
            )}

            <MediaFilesSection conversationId={conversation.id} token={token}/>

            {conversation.group && (
                <div className="border-t border-[#2d3560] px-4 py-4">
                    {confirmLeave ? (
                        <div className="space-y-2">
                            <p className="text-xs text-[#a6adcb]">
                                {members.length <= 1
                                    ? "You are the last member. Leaving will delete this group and its messages."
                                    : "Leave this group? You will lose access to the conversation."}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={leaveGroup}
                                    className="rounded-lg border-0 bg-[#7f1d1d] px-3 py-2 text-sm text-white disabled:opacity-60"
                                >
                                    {saving ? "Leaving…" : "Confirm leave"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfirmLeave(false)}
                                    className="rounded-lg border border-[#2d3560] bg-transparent px-3 py-2 text-sm text-[#a6adcb]"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setConfirmLeave(true)}
                            className="border-0 bg-transparent text-sm text-[#ffb5a7]"
                        >
                            Leave group
                        </button>
                    )}
                </div>
            )}
        </aside>
    )
}
