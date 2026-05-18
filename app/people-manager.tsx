"use client"

import { useRef, useState } from "react"
import type { Person, Prisma } from "@prisma/client"
import { IconChevronDown, IconChevronRight, IconX } from "@tabler/icons-react"
import { addPerson, deletePerson, updatePerson } from "./actions"

type PersonWithCount = Prisma.PersonGetPayload<{
  include: { _count: { select: { tasks: { where: { completed: false } } } } }
}>

const inputClass =
  "bg-[#F2ECE2] border border-[#D4C9B5] rounded-md px-3 py-1.5 text-base text-[#3A3228] placeholder-[#A09080] outline-none focus:border-accent focus:ring-1 focus:ring-[#6B7A5A]/20"

export default function PeopleManager({ people }: { people: PersonWithCount[] }) {
  const [open, setOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [reassignToId, setReassignToId] = useState<string>("")
  const [editingEmailId, setEditingEmailId] = useState<number | null>(null)
  const [emailDraft, setEmailDraft] = useState("")
  const formRef = useRef<HTMLFormElement>(null)

  const deletingPerson = people.find(p => p.id === deletingId)
  const hasTasks = (deletingPerson?._count.tasks ?? 0) > 0
  const others = people.filter(p => p.id !== deletingId)

  async function handleAddPerson(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = (formData.get("name") as string).trim()
    if (!name) return
    await addPerson(formData)
    formRef.current?.reset()
  }

  async function confirmDelete() {
    if (!deletingId) return
    await deletePerson(deletingId, reassignToId ? Number(reassignToId) : undefined)
    setDeletingId(null)
    setReassignToId("")
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
    await updatePerson(editingEmailId, { email: emailDraft.trim().toLowerCase() || null })
    setEditingEmailId(null)
  }

  return (
    <div className="mt-10 border-t border-[#DDD5C5] pt-6">
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="text-sm text-[#A09080] hover:text-[#3A3228]"
      >
        <span className="inline-flex items-center gap-1">
          {open ? <IconChevronDown size={14} aria-hidden="true" /> : <IconChevronRight size={14} aria-hidden="true" />}
          Manage people
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {people.length === 0 && (
            <p className="text-sm text-[#A09080]">No people yet.</p>
          )}

          <ul className="space-y-1">
            {people.map(person => (
              <li key={person.id}>
                {deletingId === person.id ? (
                  <div className="p-3 bg-[#EDE6D8] rounded-lg border border-[#D4C9B5] space-y-2">
                    {hasTasks ? (
                      <>
                        <p className="text-sm text-[#4A3F34]">
                          <strong>{person.name}</strong> has {person._count.tasks} task
                          {person._count.tasks !== 1 ? "s" : ""}. Reassign them?
                        </p>
                        <select
                          value={reassignToId}
                          onChange={e => setReassignToId(e.target.value)}
                          className="text-sm bg-[#F2ECE2] border border-[#D4C9B5] rounded px-2 py-1.5 text-[#3A3228] outline-none focus:border-accent"
                        >
                          <option value="">Leave unassigned</option>
                          {others.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <p className="text-sm text-[#4A3F34]">
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
                        className="text-sm px-3 py-1 text-[#8C7D6A] hover:text-[#3A3228]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#4A3F34] flex items-center gap-3">
                        {person.name}
                        <span className="text-[#B5A898] text-xs">
                          {person._count.tasks} task{person._count.tasks !== 1 ? "s" : ""}
                        </span>
                        <label className="flex items-center gap-1 text-xs text-[#8C7D6A] cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={person.isKid}
                            onChange={() => updatePerson(person.id, { isKid: !person.isKid })}
                            className="accent-accent"
                          />
                          kid mode
                        </label>
                      </span>
                      <button
                        onClick={() => startDelete(person)}
                        aria-label={`Remove ${person.name}`}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#B5A898] hover:text-red-700"
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
                          className="flex-1 text-base bg-[#F2ECE2] border border-[#D4C9B5] rounded px-2 py-1 text-[#3A3228] outline-none focus:border-accent"
                          autoFocus
                        />
                        <button onClick={saveEmail} className="text-xs px-2 py-1 bg-accent text-white rounded hover:bg-[#556148]">Save</button>
                        <button onClick={() => setEditingEmailId(null)} className="text-xs px-2 py-1 text-[#8C7D6A] hover:text-[#3A3228]">Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditEmail(person)}
                        className="text-xs text-[#B5A898] hover:text-[#6B5E52] mt-0.5 block"
                      >
                        {person.email ?? "+ Set Google email"}
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>

          <form ref={formRef} onSubmit={handleAddPerson} className="flex gap-2 pt-1">
            <input
              name="name"
              placeholder="Add person…"
              className={`flex-1 ${inputClass}`}
              autoComplete="off"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-accent text-white font-medium text-sm rounded-lg hover:bg-[#556148]"
            >
              Add
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
