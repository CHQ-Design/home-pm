"use client"

import { useRef, useState } from "react"
import type { Person, Prisma } from "@prisma/client"
import { addPerson, deletePerson } from "./actions"

type PersonWithCount = Prisma.PersonGetPayload<{
  include: { _count: { select: { tasks: true } } }
}>

const inputClass =
  "bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-sm text-stone-100 placeholder-stone-500 outline-none focus:border-accent"

export default function PeopleManager({ people }: { people: PersonWithCount[] }) {
  const [open, setOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [reassignToId, setReassignToId] = useState<string>("")
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

  return (
    <div className="mt-10 border-t border-stone-800 pt-6">
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="text-sm text-stone-500 hover:text-stone-300"
      >
        {open ? "▾" : "▸"} Manage people
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {people.length === 0 && (
            <p className="text-sm text-stone-600">No people yet.</p>
          )}

          <ul className="space-y-1">
            {people.map(person => (
              <li key={person.id}>
                {deletingId === person.id ? (
                  <div className="p-3 bg-stone-900 rounded-lg border border-stone-700 space-y-2">
                    {hasTasks ? (
                      <>
                        <p className="text-sm text-stone-300">
                          <strong>{person.name}</strong> has {person._count.tasks} task
                          {person._count.tasks !== 1 ? "s" : ""}. Reassign them?
                        </p>
                        <select
                          value={reassignToId}
                          onChange={e => setReassignToId(e.target.value)}
                          className="text-sm bg-stone-800 border border-stone-700 rounded px-2 py-1.5 text-stone-200 outline-none focus:border-accent"
                        >
                          <option value="">Leave unassigned</option>
                          {others.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <p className="text-sm text-stone-300">
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
                        className="text-sm px-3 py-1 text-stone-400 hover:text-stone-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between group">
                    <span className="text-sm text-stone-300">
                      {person.name}
                      <span className="text-stone-600 ml-1.5 text-xs">
                        {person._count.tasks} task{person._count.tasks !== 1 ? "s" : ""}
                      </span>
                    </span>
                    <button
                      onClick={() => startDelete(person)}
                      className="text-xs text-stone-600 hover:text-red-400 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
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
              className="px-3 py-1.5 bg-accent text-stone-900 font-medium text-sm rounded-lg hover:bg-[#B07820]"
            >
              Add
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
