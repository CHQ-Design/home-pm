"use client"

import { useRef, useState } from "react"
import type { Person } from "@prisma/client"
import { addTask } from "./actions"

type Props = { people: Person[] }

const inputClass =
  "bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 placeholder-stone-500 outline-none focus:border-accent"

export default function AddTaskForm({ people }: Props) {
  const [showMore, setShowMore] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const title = (formData.get("title") as string).trim()
    if (!title) return
    setSubmitting(true)
    await addTask(formData)
    formRef.current?.reset()
    setSubmitting(false)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mb-8 space-y-2">
      <div className="flex gap-2">
        <input
          name="title"
          placeholder="Add a task…"
          className={`flex-1 ${inputClass}`}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-accent text-stone-900 font-medium text-sm rounded-lg hover:bg-[#B07820] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Adding…" : "Add"}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setShowMore(v => !v)}
        aria-expanded={showMore}
        className="text-xs text-stone-400 hover:text-stone-200 min-h-[44px] inline-flex items-center"
      >
        {showMore ? "▾ fewer options" : "▸ more options"}
      </button>

      {showMore && (
        <div className="space-y-2 pl-1">
          <textarea
            name="notes"
            placeholder="Notes (optional)"
            rows={2}
            className={`w-full ${inputClass} resize-none`}
          />
          <div className="flex gap-2 flex-wrap">
            <input
              type="date"
              name="dueDate"
              className={`${inputClass} [color-scheme:dark]`}
            />
            <select
              name="priority"
              defaultValue="medium"
              className={inputClass}
            >
              <option value="high">High priority</option>
              <option value="medium">Medium priority</option>
              <option value="low">Low priority</option>
            </select>
            {people.length > 0 && (
              <select
                name="assigneeId"
                defaultValue=""
                className={inputClass}
              >
                <option value="">Unassigned</option>
                {people.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}
    </form>
  )
}
