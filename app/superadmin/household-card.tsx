"use client"

import { useRef, useState } from "react"
import type { User } from "@prisma/client"
import { IconChevronDown, IconChevronRight, IconX } from "@tabler/icons-react"
import { addHouseholdUser, removeHouseholdUser } from "./actions"
import { inputClass, selectClass } from "@/lib/styles"

export default function HouseholdCard({
  household,
}: {
  household: { id: number; name: string; users: User[] }
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(false)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const result = await addHouseholdUser(new FormData(e.currentTarget))
    setSubmitting(false)
    if (result?.error) {
      setError(result.error)
    } else {
      formRef.current?.reset()
    }
  }

  async function handleRemove(id: number) {
    const result = await removeHouseholdUser(id)
    if (result?.error) setError(result.error)
    setConfirmingId(null)
  }

  const admins = household.users.filter(u => u.role === "admin")

  return (
    <div className="border border-border-card rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-label={`${household.name} — ${open ? "collapse" : "expand"}`}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-raised hover:bg-surface transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
      >
        <div>
          <span className="font-medium text-foreground">{household.name}</span>
          <span className="ml-2 text-xs text-text-muted">{household.users.length} member{household.users.length !== 1 ? "s" : ""}</span>
        </div>
        {open
          ? <IconChevronDown size={16} className="text-text-secondary shrink-0" aria-hidden="true" />
          : <IconChevronRight size={16} className="text-text-secondary shrink-0" aria-hidden="true" />
        }
      </button>

      {open && (
        <div className="px-4 pb-4 pt-3 bg-background space-y-4">
          <ul className="space-y-1">
            {household.users.map(user => (
              <li key={user.id}>
                {confirmingId === user.id ? (
                  <div className="p-2 bg-surface rounded-lg border border-border-card space-y-2">
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
                  <div className="flex items-center gap-2 min-h-[40px]">
                    <span className="flex-1 text-sm text-foreground truncate">{user.email}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
                      user.role === "admin"
                        ? "bg-accent/10 text-accent"
                        : "bg-surface text-text-secondary"
                    }`}>
                      {user.role}
                    </span>
                    <button
                      onClick={() => {
                        setError(null)
                        if (user.role === "admin" && admins.length <= 1) {
                          setError("Can't remove the last admin")
                          return
                        }
                        setConfirmingId(user.id)
                      }}
                      aria-label={`Remove ${user.email}`}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center text-text-faint hover:text-red-700 shrink-0"
                    >
                      <IconX size={13} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <form ref={formRef} onSubmit={handleAdd} className="flex gap-2 pt-1 border-t border-border">
            <input type="hidden" name="householdId" value={household.id} />
            <input
              name="email"
              type="email"
              placeholder="Add member email…"
              autoComplete="off"
              className={`flex-1 min-w-0 ${inputClass}`}
            />
            <div className="relative shrink-0 w-28">
              <select name="role" defaultValue="member" aria-label="Member role" className={selectClass}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-3 py-1.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 shrink-0"
            >
              Add
            </button>
          </form>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  )
}
