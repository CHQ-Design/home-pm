"use client"

import { useRef, useState } from "react"
import { addTask } from "./actions"

export default function AddTaskForm() {
  const [showMore, setShowMore] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const title = (formData.get("title") as string).trim()
    if (!title) return
    await addTask(formData)
    formRef.current?.reset()
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mb-8 space-y-2">
      <div className="flex gap-2">
        <input
          name="title"
          placeholder="Add a task…"
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
          autoComplete="off"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          Add
        </button>
      </div>

      <button
        type="button"
        onClick={() => setShowMore(v => !v)}
        className="text-xs text-slate-400 hover:text-slate-600"
      >
        {showMore ? "▾ fewer options" : "▸ more options"}
      </button>

      {showMore && (
        <div className="space-y-2 pl-1">
          <textarea
            name="notes"
            placeholder="Notes (optional)"
            rows={2}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none"
          />
          <div className="flex gap-2">
            <input
              type="date"
              name="dueDate"
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
            <select
              name="priority"
              defaultValue="medium"
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
            >
              <option value="high">High priority</option>
              <option value="medium">Medium priority</option>
              <option value="low">Low priority</option>
            </select>
          </div>
        </div>
      )}
    </form>
  )
}
