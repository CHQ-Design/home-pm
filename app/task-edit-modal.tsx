"use client"

import { useEffect, useRef, useState } from "react"
import type { Person, Project, Prisma } from "@prisma/client"
import { updateTask, deleteTask } from "./actions"
import DatePicker from "./date-picker"
import { inputClass } from "@/lib/styles"

type Task = Prisma.TaskGetPayload<{ include: { assignee: true; project: true } }>

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
    time: task.time ?? "",
    priority: task.priority,
    assigneeId: task.assigneeId ? String(task.assigneeId) : "",
    projectId: task.projectId ? String(task.projectId) : "",
    reminderMinutesBefore: task.reminderMinutesBefore != null ? String(task.reminderMinutesBefore) : "",
  })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Restore focus to the element that opened the modal when it closes
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    return () => { prev?.focus() }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return }
      if (e.key !== "Tab" || !modalRef.current) return
      const focusable = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex=\"-1\"])"
        )
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      await updateTask(task.id, {
        title: form.title.trim() || task.title,
        notes: form.notes.trim() || null,
        dueDate: form.dueDate ? new Date(form.dueDate) : null,
        time: form.time || null,
        priority: form.priority as "high" | "medium" | "low",
        assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
        projectId: form.projectId ? Number(form.projectId) : null,
        reminderMinutesBefore: form.reminderMinutesBefore !== "" ? Number(form.reminderMinutesBefore) : null,
      })
      onClose()
    } catch {
      setSaveError("Couldn't save — please try again.")
      setSaving(false)
    }
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
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-edit-title"
        className="bg-[#F4EEE3] border border-[#D4C9B5] rounded-xl w-full max-w-md shadow-2xl overflow-hidden my-auto"
      >
        <h2 id="task-edit-title" className="sr-only">Edit task</h2>
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
              <label className={labelClass}>Time</label>
              <input
                type="time"
                value={form.time}
                onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                className={`${inputClass} [color-scheme:light]`}
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

          {form.dueDate && (
            <div className="col-span-2 sm:col-span-3">
              <label className={labelClass}>Remind me</label>
              <select
                value={form.reminderMinutesBefore}
                onChange={e => setForm(f => ({ ...f, reminderMinutesBefore: e.target.value }))}
                className={inputClass}
              >
                <option value="">No reminder</option>
                <option value="0">At the time</option>
                <option value="30">30 minutes before</option>
                <option value="60">1 hour before</option>
                <option value="1440">1 day before</option>
              </select>
            </div>
          )}
        </div>

        {saveError && (
          <p className="px-5 pb-2 text-sm text-red-600">{saveError}</p>
        )}

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
                className="text-sm text-[#A09080] hover:text-red-700 min-h-[44px] inline-flex items-center"
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
                  disabled={saving}
                  className="text-sm px-4 py-1.5 bg-accent text-white font-medium rounded-md hover:bg-[#556148] disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
