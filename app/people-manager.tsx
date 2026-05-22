"use client"

import { useRef, useState } from "react"
import type { Person, Prisma } from "@prisma/client"
import { IconChevronDown, IconChevronRight, IconX } from "@tabler/icons-react"
import { addPerson, deletePerson, updatePerson } from "./actions"
import CustomSelect from "./custom-select"

type PersonWithCount = Prisma.PersonGetPayload<{
  include: { _count: { select: { tasks: { where: { completed: false } } } } }
}>

// py-1.5 and no w-full intentional — compact inline input within a flex row
const inputClass =
  "bg-surface-warm border border-border-card rounded-md px-3 py-1.5 text-base text-foreground placeholder-text-muted outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"

export default function PeopleManager({ people }: { people: PersonWithCount[] }) {
  const [open, setOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [reassignToId, setReassignToId] = useState<string>("")
  const [editingEmailId, setEditingEmailId] = useState<number | null>(null)
  const [emailDraft, setEmailDraft] = useState("")
  const [actionError, setActionError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const deletingPerson = people.find(p => p.id === deletingId)
  const hasTasks = (deletingPerson?._count.tasks ?? 0) > 0
  const others = people.filter(p => p.id !== deletingId)

  async function handleAddPerson(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = (formData.get("name") as string).trim()
    if (!name) return
    try {
      await addPerson(formData)
      formRef.current?.reset()
      setActionError(null)
    } catch {
      setActionError("Couldn't add person — try again")
    }
  }

  async function confirmDelete() {
    if (!deletingId) return
    try {
      await deletePerson(deletingId, reassignToId ? Number(reassignToId) : undefined)
      setDeletingId(null)
      setReassignToId("")
      setActionError(null)
    } catch {
      setActionError("Couldn't delete — try again")
    }
  }

  function startDelete(person: PersonWithCount) {
    setDeletingId(person.id)
    setReassignToId("")
  }

  function cancelDelete() {
    setDeletingId(null)
    setReassignToId("")
  }

  function startEditEmail(person: PersonWithCount) {
    setEditingEmailId(person.id)
    setEmailDraft(person.email ?? "")
  }

  async function saveEmail() {
    if (!editingEmailId) return
    try {
      await updatePerson(editingEmailId, { email: emailDraft.trim().toLowerCase() || null })
      setEditingEmailId(null)
      setActionError(null)
    } catch {
      setActionError("Couldn't save — try again")
    }
  }

  return (
    <div className="mt-10 border-t border-border pt-6">
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="text-sm text-text-muted hover:text-foreground"
      >
        <span className="inline-flex items-center gap-1">
          {open ? <IconChevronDown size={14} aria-hidden="true" /> : <IconChevronRight size={14} aria-hidden="true" />}
          Manage people
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {people.length === 0 && (
            <p className="text-sm text-text-muted">No people yet.</p>
          )}

          <ul className="space-y-1">
            {people.map(person => (
              <li key={person.id}>
                {deletingId === person.id ? (
                  <div className="p-3 bg-surface rounded-lg border border-border-card space-y-2">
                    {hasTasks ? (
                      <>
                        <p className="text-sm text-foreground">
                          <strong>{person.name}</strong> has {person._count.tasks} task
                          {person._count.tasks !== 1 ? "s" : ""}. Reassign them?
                        </p>
                        <CustomSelect
                          value={reassignToId}
                          onChange={setReassignToId}
                          options={[
                            { value: "", label: "Leave unassigned" },
                            ...others.map(p => ({ value: String(p.id), label: p.name })),
                          ]}
                          aria-label="Reassign tasks to"
                        />
                      </>
                    ) : (
                      <p className="text-sm text-foreground">
                        Remove <strong>{person.name}</strong>?
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={confirmDelete}
                        className="text-sm px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                      <button
                        onClick={cancelDelete}
                        className="text-sm px-3 py-1 text-text-secondary hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground flex items-center gap-3">
                        {person.name}
                        <span className="text-text-secondary text-xs">
                          {person._count.tasks} task{person._count.tasks !== 1 ? "s" : ""}
                        </span>
                        <label className="flex items-center gap-1 text-xs text-text-secondary cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={person.isKid}
                            onChange={async () => {
                            try {
                              await updatePerson(person.id, { isKid: !person.isKid })
                              setActionError(null)
                            } catch {
                              setActionError("Couldn't save — try again")
                            }
                          }}
                            className="accent-accent"
                          />
                          kid mode
                        </label>
                      </span>
                      <button
                        onClick={() => startDelete(person)}
                        aria-label={`Remove ${person.name}`}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center text-text-faint hover:text-red-700"
                      >
                        <IconX size={14} aria-hidden="true" />
                      </button>
                    </div>
                    {editingEmailId === person.id ? (
                      <div className="flex gap-2 mt-1">
                        <input
                          type="email"
                          value={emailDraft}
                          onChange={e => setEmailDraft(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") saveEmail(); if (e.key === "Escape") setEditingEmailId(null) }}
                          placeholder="email@example.com"
                          className="flex-1 text-base bg-surface-warm border border-border-card rounded px-2 py-1 text-foreground outline-none focus:border-accent"
                          autoFocus
                        />
                        <button onClick={saveEmail} className="text-xs px-2 py-1 bg-accent text-white rounded hover:bg-accent-hover">Save</button>
                        <button onClick={() => setEditingEmailId(null)} className="text-xs px-2 py-1 text-text-secondary hover:text-foreground">Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditEmail(person)}
                        className="text-xs text-text-secondary hover:text-foreground mt-0.5 block"
                      >
                        {person.email ?? "+ Set Google email"}
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>

          {actionError && <p className="text-sm text-danger">{actionError}</p>}

          <form ref={formRef} onSubmit={handleAddPerson} className="flex gap-2 pt-1">
            <input
              name="name"
              placeholder="Add person…"
              className={`flex-1 ${inputClass}`}
              autoComplete="off"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-accent text-white font-medium text-sm rounded-lg hover:bg-accent-hover"
            >
              Add
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
