"use client"

import { useRef, useState } from "react"
import type { User } from "@prisma/client"
import { IconX } from "@tabler/icons-react"
import { inviteUser, removeUser, updateUserRole } from "./actions"
import { inputClass } from "@/lib/styles"
import CustomSelect from "../custom-select"

const labelClass = "block text-xs font-medium text-text-secondary mb-1"

export default function UserManager({ users, currentEmail }: { users: User[]; currentEmail: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [inviteRole, setInviteRole] = useState("member")

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
      setInviteRole("member")
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
      <h2 className="font-serif text-lg font-semibold text-foreground">Members</h2>

      <ul className="space-y-2">
        {users.map(user => {
          const isSelf = user.email === currentEmail
          return (
            <li key={user.id}>
              {confirmingId === user.id ? (
                <div className="p-3 bg-surface rounded-lg border border-border-card space-y-2">
                  <p className="text-sm text-foreground">Remove <strong>{user.email}</strong>?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRemove(user.id)}
                      className="text-sm px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => setConfirmingId(null)}
                      className="text-sm px-3 py-1 text-text-secondary hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 min-h-[44px]">
                  <span className="flex-1 text-sm text-foreground truncate">
                    {user.email}
                    {isSelf && <span className="ml-1.5 text-xs text-text-secondary">(you)</span>}
                  </span>
                  {isSelf ? (
                    <span className="text-xs text-text-secondary capitalize px-2 py-1">{user.role}</span>
                  ) : (
                    <div className="w-24">
                      <CustomSelect
                        value={user.role}
                        onChange={v => handleRoleChange(user.id, v as "admin" | "member")}
                        options={[{ value: "member", label: "Member" }, { value: "admin", label: "Admin" }]}
                        aria-label={`Role for ${user.email}`}
                      />
                    </div>
                  )}
                  {!isSelf && (
                    <button
                      onClick={() => setConfirmingId(user.id)}
                      aria-label={`Remove ${user.email}`}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-text-faint hover:text-red-700 shrink-0"
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

      <form ref={formRef} onSubmit={handleInvite} className="pt-2 border-t border-border space-y-3">
        <p className="text-xs font-medium text-text-secondary">Invite someone</p>
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
            <label className={labelClass} id="invite-role-label">Role</label>
            <CustomSelect
              name="role"
              value={inviteRole}
              onChange={setInviteRole}
              options={[{ value: "member", label: "Member" }, { value: "admin", label: "Admin" }]}
              aria-label="Invite role"
            />
          </div>
        </div>
        {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50"
        >
          {submitting ? "Adding…" : "Add member"}
        </button>
        <p className="text-xs text-text-muted">
          They can sign in with that Google account — no email needed.
        </p>
      </form>
    </div>
  )
}
