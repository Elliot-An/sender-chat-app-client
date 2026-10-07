"use client"

import {useState} from "react"
import {ArrowLeft, Users} from "lucide-react"
import type {UserSummary} from "@/lib/social/api"
import {Avatar} from "./avatar"

type FriendOption = UserSummary & { friendshipId: number }

type NewGroupViewProps = {
    onBack: () => void
    friends: FriendOption[]
    onCreate: (name: string, memberIds: number[]) => void
}

function formatUser(user: UserSummary) {
    return user.displayName || user.username
}

export function NewGroupView({onBack, friends, onCreate}: NewGroupViewProps) {
    const [name, setName] = useState("")
    const [selected, setSelected] = useState<number[]>([])

    function submit(event: React.FormEvent) {
        event.preventDefault()
        if (name.trim() && selected.length) onCreate(name.trim(), selected)
    }

    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <header className="flex min-h-[67px] items-center gap-2.5 border-b border-[#2d3560] bg-[#151b42] px-4 py-3">
                <button
                    className="grid size-9 place-items-center rounded-[10px] border-0 bg-transparent text-[#a6adcb]"
                    onClick={onBack}
                    aria-label="Back"
                >
                    <ArrowLeft size={20}/>
                </button>
                <b className="text-[15px]">New group</b>
            </header>

            <form
                className="w-full flex-1 overflow-auto px-[clamp(24px,6vw,72px)] pb-8 pt-2"
                onSubmit={submit}
            >
                <div className="py-5">
                    <div
                        className="grid size-[52px] rotate-[-7deg] place-items-center rounded-[10px] bg-[#2a3bff] text-[#f2fffb]">
                        <Users size={24}/>
                    </div>
                    <h2 className="my-4 max-w-[360px] text-[28px] font-semibold tracking-[-.05em]">
                        Create a group for your next conversation.
                    </h2>
                    <p className="max-w-[420px] leading-relaxed text-[#a6adcb]">
                        Add accepted friends to start a shared conversation.
                    </p>
                </div>

                <label className="my-4 grid gap-2 text-xs font-bold text-[#a6adcb]">
                    Group name
                    <input
                        required
                        maxLength={100}
                        className="rounded-lg border border-[#2d3560] bg-[#151b42] px-3 py-2 text-[#f7f8ff]"
                        value={name}
                        onChange={event => setName(event.target.value)}
                        placeholder="Name your group"
                    />
                </label>

                <h3 className="my-4 text-sm">Add members</h3>

                {friends.length ? (
                    friends.map(friend => (
                        <label
                            className="flex items-center gap-2.5 border-b border-[#2d3560] py-2.5 text-sm"
                            key={friend.id}
                        >
                            <input
                                className="accent-[#2a3bff]"
                                type="checkbox"
                                checked={selected.includes(friend.id)}
                                onChange={event =>
                                    setSelected(ids =>
                                        event.target.checked
                                            ? [...ids, friend.id]
                                            : ids.filter(id => id !== friend.id),
                                    )
                                }
                            />
                            <Avatar
                                name={formatUser(friend)}
                                color="#0f766e"
                                imageUrl={friend.avatarUrl}
                            />
                            <span>{formatUser(friend)}</span>
                        </label>
                    ))
                ) : (
                    <p className="p-4 text-center text-xs text-[#a6adcb]">
                        Add friends first to start a group.
                    </p>
                )}

                <button
                    disabled={!name.trim() || !selected.length}
                    className="mt-6 rounded-lg border-0 bg-[#2a3bff] px-4 py-2.5 font-bold text-white disabled:opacity-50"
                >
                    Create group
                </button>
            </form>
        </div>
    )
}
