"use client"

import { useEffect, useRef, useState } from "react"
import type { Person, Project, Prisma } from "@prisma/client"
import { updateTask, deleteTask } from "./actions"
import DatePicker from "./date-picker"
import TimePicker from "./time-picker"
import CustomSelect from "./custom-select"
import { inputClass } from "@/lib/styles"

type Task = Prisma.TaskGetPayload<{ include: { assignee: true; project: true } }>

const labelClass = "block text-xs font-medium text-text-secondary mb-1"

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
  const notesRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = notesRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [form.notes])

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
        className="bg-surface-raised border border-border-card rounded-xl w-full max-w-md overflow-hidden my-auto shadow-lift"
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
            <label htmlFor="task-notes" className={labelClass}>Notes</label>
            <textarea
              ref={notesRef}
              id="task-notes"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Optional"
              className={`${inputClass} resize-y min-h-[72px] max-h-[320px] overflow-y-auto`}
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
              <TimePicker
                value={form.time}
                onChange={time => setForm(f => ({ ...f, time }))}
              />
            </div>
            <div>
              <label className={labelClass}>Priority</label>
              <CustomSelect
                value={form.priority}
                onChange={priority => setForm(f => ({ ...f, priority }))}
                options={[{ label: "High", value: "high" }, { label: "Medium", value: "medium" }, { label: "Low", value: "low" }]}
                aria-label="Priority"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className={labelClass}>Assignee</label>
              <CustomSelect
                value={form.assigneeId}
                onChange={assigneeId => setForm(f => ({
                  ...f,
                  assigneeId,
                  ...(assigneeId === "" ? { reminderMinutesBefore: "" } : {}),
                }))}
                options={[{ label: "Unassigned", value: "" }, ...people.map(p => ({ label: p.name, value: String(p.id) }))]}
                aria-label="Assignee"
              />
            </div>
          </div>

          {projects.length > 0 && (
            <div>
              <label className={labelClass}>Project</label>
              <CustomSelect
                value={form.projectId}
                onChange={projectId => setForm(f => ({ ...f, projectId }))}
                options={[{ label: "No project", value: "" }, ...projects.map(p => ({ label: p.name, value: String(p.id) }))]}
                aria-label="Project"
              />
            </div>
          )}

          {form.dueDate && form.assigneeId && (
            <div className="col-span-2 sm:col-span-3">
              <label className={labelClass}>Remind me</label>
              <CustomSelect
                value={form.reminderMinutesBefore}
                onChange={reminderMinutesBefore => setForm(f => ({ ...f, reminderMinutesBefore }))}
                options={[
                  { label: "No reminder", value: "" },
                  { label: "At the time", value: "0" },
                  { label: "30 minutes before", value: "30" },
                  { label: "1 hour before", value: "60" },
                  { label: "1 day before", value: "1440" },
                ]}
                aria-label="Reminder"
              />
            </div>
          )}
        </div>

        {saveError && (
          <p className="px-5 pb-2 text-sm text-red-600">{saveError}</p>
        )}

        <div className="flex items-center justify-between px-5 py-3 border-t border-border-card">
          {confirmDelete ? (
            <>
              <span className="text-sm text-foreground">Delete this task?</span>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-sm px-4 py-1.5 text-text-secondary hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="text-sm px-4 py-1.5 bg-danger text-white font-medium rounded-md hover:bg-danger-hover"
                >
                  Delete
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-sm text-danger hover:text-danger-hover min-h-[44px] inline-flex items-center"
              >
                Delete task
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="text-sm px-4 py-1.5 text-text-secondary hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-sm px-4 py-1.5 bg-accent text-white font-medium rounded-md hover:bg-accent-hover disabled:opacity-50"
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
