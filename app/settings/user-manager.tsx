"use client"

import { useRef, useState } from "react"
import type { User } from "@prisma/client"
import { IconX } from "@tabler/icons-react"
import { inviteUser, removeUser, updateUserRole } from "./actions"
import { inputClass, selectClass } from "@/lib/styles"

const labelClass = "block text-xs font-medium text-[#8C7D6A] mb-1"

export default function UserManager({ users, currentEmail }: { users: User[]; currentEmail: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setInviteError(null)
    const result = await inviteUser(new FormData(e.currentTarget))
    setSubmitting(false)
    if (result?.error) {
      setInviteError(result.error)
    } else {
      formRef.current?.reset()
    }
  }

  async function handleRemove(id: number) {
    const result = await removeUser(id)
    if (result?.error) {
      setInviteError(result.error)
    }
    setConfirmingId(null)
  }

  async function handleRoleChange(id: number, role: "admin" | "member") {
    const result = await updateUserRole(id, role)
    if (result?.error) setInviteError(result.error)
  }

  return (
    <div className="space-y-5">
      <h2 className="font-serif text-lg font-semibold text-[#3A3228]">Members</h2>

      <ul className="space-y-2">
        {users.map(user => {
          const isSelf = user.email === currentEmail
          return (
            <li key={user.id}>
              {confirmingId === user.id ? (
                <div className="p-3 bg-[#EDE6D8] rounded-lg border border-[#D4C9B5] space-y-2">
                  <p className="text-sm text-[#4A3F34]">Remove <strong>{user.email}</strong>?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRemove(user.id)}
                      className="text-sm px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => setConfirmingId(null)}
                      className="text-sm px-3 py-1 text-[#8C7D6A] hover:text-[#3A3228]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 min-h-[44px]">
                  <span className="flex-1 text-sm text-[#3A3228] truncate">
                    {user.email}
                    {isSelf && <span className="ml-1.5 text-xs text-[#B5A898]">(you)</span>}
                  </span>
                  <select
                    value={user.role}
                    onChange={e => handleRoleChange(user.id, e.target.value as "admin" | "member")}
                    disabled={isSelf}
                    className="text-xs bg-[#F2ECE2] border border-[#D4C9B5] rounded px-2 py-1 text-[#3A3228] outline-none focus:border-accent disabled:opacity-50 disabled:cursor-default"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  {!isSelf && (
                    <button
                      onClick={() => setConfirmingId(user.id)}
                      aria-label={`Remove ${user.email}`}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#B5A898] hover:text-red-700 shrink-0"
                    >
                      <IconX size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <form ref={formRef} onSubmit={handleInvite} className="pt-2 border-t border-[#DDD5C5] space-y-3">
        <p className="text-xs font-medium text-[#8C7D6A]">Invite someone</p>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className={labelClass}>Google account email</label>
            <input
              name="email"
              type="email"
              placeholder="name@gmail.com"
              autoComplete="off"
              className={inputClass}
            />
          </div>
          <div className="w-28 shrink-0">
            <label className={labelClass}>Role</label>
            <div className="relative">
              <select name="role" defaultValue="member" className={selectClass}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        </div>
        {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-[#556148] disabled:opacity-50"
        >
          {submitting ? "Adding…" : "Add member"}
        </button>
        <p className="text-xs text-[#A09080]">
          They can sign in with that Google account — no email needed.
        </p>
      </form>
    </div>
  )
}
