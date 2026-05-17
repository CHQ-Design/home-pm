"use client"

import { useEffect, useState } from "react"
import type { Person, Prisma } from "@prisma/client"
import { updateTask, deleteTask } from "./actions"
import DatePicker from "./date-picker"

type Task = Prisma.TaskGetPayload<{ include: { assignee: true } }>

const inputClass =
  "w-full text-sm bg-zinc-800 border border-zinc-600 rounded-md px-3 py-2 text-white placeholder-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"

const labelClass = "block text-xs font-medium text-zinc-400 mb-1"

export default function TaskEditModal({
  task,
  people,
  onClose,
}: {
  task: Task
  people: Person[]
  onClose: () => void
}) {
  const [form, setForm] = useState({
    title: task.title,
    notes: task.notes ?? "",
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "",
    priority: task.priority,
    assigneeId: task.assigneeId ? String(task.assigneeId) : "",
  })
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  async function handleSave() {
    await updateTask(task.id, {
      title: form.title.trim() || task.title,
      notes: form.notes.trim() || null,
      dueDate: form.dueDate ? new Date(form.dueDate) : null,
      priority: form.priority,
      assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
    })
    onClose()
  }

  async function handleDelete() {
    await deleteTask(task.id)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md shadow-2xl">
        <div className="p-5 space-y-4">
          <div>
            <label className={labelClass}>Title</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              onKeyDown={e => { if (e.key === "Enter") handleSave() }}
              className={inputClass}
              autoFocus
            />
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Optional"
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Due date</label>
              <DatePicker
                value={form.dueDate}
                onChange={dueDate => setForm(f => ({ ...f, dueDate }))}
              />
            </div>
            <div>
              <label className={labelClass}>Priority</label>
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className={inputClass}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Assignee</label>
              <select
                value={form.assigneeId}
                onChange={e => setForm(f => ({ ...f, assigneeId: e.target.value }))}
                className={inputClass}
              >
                <option value="">Unassigned</option>
                {people.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800">
          {confirmDelete ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-400">Delete this task?</span>
              <button
                onClick={handleDelete}
                className="text-sm px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-sm text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-sm text-zinc-500 hover:text-red-400"
            >
              Delete task
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-sm px-4 py-1.5 text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="text-sm px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
