"use client"

import { useEffect, useState } from "react"
import type { Person, Project, Prisma } from "@prisma/client"
import { updateTask, deleteTask } from "./actions"
import DatePicker from "./date-picker"

type Task = Prisma.TaskGetPayload<{ include: { assignee: true; project: true } }>

const inputClass =
  "w-full text-sm bg-[#F2ECE2] border border-[#D4C9B5] rounded-md px-3 py-2 text-[#3A3228] placeholder-[#A09080] outline-none focus:border-accent focus:ring-1 focus:ring-[#6B7A5A]/20"

const labelClass = "block text-xs font-medium text-[#8C7D6A] mb-1"

export default function TaskEditModal({
  task,
  people,
  projects,
  onClose,
}: {
  task: Task
  people: Person[]
  projects: Project[]
  onClose: () => void
}) {
  const [form, setForm] = useState({
    title: task.title,
    notes: task.notes ?? "",
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "",
    priority: task.priority,
    assigneeId: task.assigneeId ? String(task.assigneeId) : "",
    projectId: task.projectId ? String(task.projectId) : "",
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
      priority: form.priority as "high" | "medium" | "low",
      assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
      projectId: form.projectId ? Number(form.projectId) : null,
    })
    onClose()
  }

  async function handleDelete() {
    await deleteTask(task.id)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overflow-x-hidden p-4 sm:items-center"
      style={{ backgroundColor: "rgba(44,35,22,0.45)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[#F4EEE3] border border-[#D4C9B5] rounded-xl w-full max-w-md shadow-2xl overflow-hidden my-auto">
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

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
            <div className="col-span-2 sm:col-span-1">
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

          {projects.length > 0 && (
            <div>
              <label className={labelClass}>Project</label>
              <select
                value={form.projectId}
                onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                className={inputClass}
              >
                <option value="">No project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-[#D4C9B5]">
          {confirmDelete ? (
            <>
              <span className="text-sm text-[#4A3F34]">Delete this task?</span>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-sm px-4 py-1.5 text-[#8C7D6A] hover:text-[#3A3228]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="text-sm px-4 py-1.5 bg-red-600 text-white font-medium rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-sm text-[#A09080] hover:text-red-700"
              >
                Delete task
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="text-sm px-4 py-1.5 text-[#8C7D6A] hover:text-[#3A3228]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="text-sm px-4 py-1.5 bg-accent text-white font-medium rounded-md hover:bg-[#556148]"
                >
                  Save
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
