"use client"

import { useState } from "react"
import type { Prisma, Person, Project } from "@prisma/client"
import { completeRecurringTask, updateRecurringTask, deleteRecurringTask } from "./actions"

type RecurringTask = Prisma.RecurringTaskGetPayload<{ include: { assignee: true; project: true } }>

const CADENCES = [
  { label: "Daily",          value: "1|day" },
  { label: "Weekly",         value: "1|week" },
  { label: "Every 2 weeks",  value: "2|week" },
  { label: "Monthly",        value: "1|month" },
  { label: "Every 3 months", value: "3|month" },
  { label: "Every 6 months", value: "6|month" },
  { label: "Yearly",         value: "1|year" },
]

function describeCadence(value: number, unit: string): string {
  if (value === 1) {
    if (unit === "day") return "Daily"
    if (unit === "week") return "Weekly"
    if (unit === "month") return "Monthly"
    if (unit === "year") return "Yearly"
  }
  return `Every ${value} ${unit}s`
}

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
}

function daysDiff(nextDue: Date | string): number {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const due = new Date(new Date(nextDue).toDateString()) // local midnight
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function dueDateClass(nextDue: Date | string): string {
  const diff = daysDiff(nextDue)
  if (diff < 0) return "text-red-600 font-medium"
  if (diff === 0) return "text-[#C8922A] font-medium"
  if (diff <= 7) return "text-[#8A6E4B]"
  return "text-[#A09080]"
}

function dueDateLabel(nextDue: Date | string): string {
  const diff = daysDiff(nextDue)
  if (diff < 0) return `Overdue · ${formatDate(nextDue)}`
  if (diff === 0) return "Due today"
  if (diff === 1) return "Due tomorrow"
  return `Due ${formatDate(nextDue)}`
}

function localDateString(d: Date | string): string {
  const date = new Date(d)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

const inputClass =
  "w-full bg-[#F2ECE2] border border-[#D4C9B5] rounded-md px-3 py-2 text-base text-[#3A3228] placeholder-[#A09080] outline-none focus:border-accent focus:ring-1 focus:ring-[#6B7A5A]/20"

export default function RecurringTaskItem({
  task,
  people,
  projects,
  isAdmin,
  sessionPersonId,
}: {
  task: RecurringTask
  people: Person[]
  projects: Project[]
  isAdmin: boolean
  sessionPersonId: number | null
}) {
  const canComplete = isAdmin || task.assigneeId === sessionPersonId
  const [editing, setEditing] = useState(false)
  const [showNotes, setShowNotes] = useState(!!task.notes)
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [form, setForm] = useState({
    title: task.title,
    notes: task.notes ?? "",
    cadence: `${task.intervalValue}|${task.intervalUnit}`,
    nextDue: localDateString(task.nextDue),
    assigneeId: task.assigneeId ? String(task.assigneeId) : "",
    projectId: task.projectId ? String(task.projectId) : "",
  })

  async function handleDone() {
    setPending(true)
    await completeRecurringTask(task.id)
    setPending(false)
  }

  async function handleSave() {
    const title = form.title.trim()
    if (!title) return
    const [ivStr, iu] = form.cadence.split("|")
    setPending(true)
    await updateRecurringTask(task.id, {
      title,
      notes: form.notes.trim() || null,
      intervalValue: Number(ivStr),
      intervalUnit: iu,
      nextDue: new Date(form.nextDue),
      assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
      projectId: form.projectId ? Number(form.projectId) : null,
    })
    setPending(false)
    setEditing(false)
  }

  async function handleDelete() {
    setPending(true)
    await deleteRecurringTask(task.id)
    setPending(false)
  }

  if (editing) {
    return (
      <div className="p-4 bg-[#EDE6D8] rounded-xl border border-[#D4C9B5] space-y-3 overflow-hidden">
        <input
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false) }}
          className={inputClass}
          autoFocus
        />
        <select
          value={form.cadence}
          onChange={e => setForm(f => ({ ...f, cadence: e.target.value }))}
          className={inputClass}
        >
          {CADENCES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <div className="flex gap-3 items-center">
          <label className="text-xs text-[#8C7D6A] shrink-0">Next due</label>
          <input
            type="date"
            value={form.nextDue}
            onChange={e => setForm(f => ({ ...f, nextDue: e.target.value }))}
            className={inputClass}
          />
        </div>
        {showNotes && (
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Notes (optional)"
            rows={2}
            className={`${inputClass} resize-none`}
          />
        )}
        {(people.length > 0 || projects.length > 0) && (
          <div className="grid grid-cols-2 gap-3">
            {people.length > 0 && (
              <select
                value={form.assigneeId}
                onChange={e => setForm(f => ({ ...f, assigneeId: e.target.value }))}
                className={inputClass}
              >
                <option value="">No assignee</option>
                {people.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
            {projects.length > 0 && (
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
            )}
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSave}
            disabled={pending}
            className="text-sm px-4 py-1.5 bg-accent text-white font-medium rounded-md hover:bg-[#556148] disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="text-sm px-4 py-1.5 text-[#8C7D6A] hover:text-[#3A3228]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => setShowNotes(v => !v)}
            className={`text-xs ${showNotes ? "text-accent" : "text-[#B5A898] hover:text-[#6B5E52]"}`}
          >
            {showNotes ? "− Notes" : "+ Notes"}
          </button>
          <button
            onClick={() => { setEditing(false); setConfirming(true) }}
            className="text-sm px-4 py-1.5 text-red-500 hover:text-red-700 ml-auto"
          >
            Delete
          </button>
        </div>
      </div>
    )
  }

  if (confirming) {
    return (
      <div className="p-4 bg-[#EDE6D8] rounded-xl border border-[#D4C9B5] space-y-3">
        <p className="text-sm text-[#4A3F34]">Delete <strong>{task.title}</strong>?</p>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={pending}
            className="text-sm px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? "Deleting…" : "Delete"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="text-sm px-3 py-1 text-[#8C7D6A] hover:text-[#3A3228]"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 p-4 bg-[#F2ECE2] rounded-xl border border-[#E4DDD0] group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#3A3228]">{task.title}</p>
        <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
          <span className="text-xs text-[#A09080]">{describeCadence(task.intervalValue, task.intervalUnit)}</span>
          <span className={`text-xs ${dueDateClass(task.nextDue)}`}>{dueDateLabel(task.nextDue)}</span>
          {task.assignee && (
            <span className="text-xs text-[#B5A898]">{task.assignee.name}</span>
          )}
          {task.project && (
            <span className="text-xs text-[#8C7D6A] bg-[#E8E0D0] rounded px-1.5 py-0.5">{task.project.name}</span>
          )}
        </div>
        {task.notes && (
          <p className="text-xs text-[#8C7D6A] mt-1">{task.notes}</p>
        )}
      </div>
      <div className="flex items-center shrink-0">
        {isAdmin && (
          <>
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-[#B5A898] hover:text-[#6B5E52] px-2 py-2"
              aria-label={`Edit ${task.title}`}
            >
              ✎
            </button>
            <button
              onClick={() => setConfirming(true)}
              className="text-sm text-[#B5A898] hover:text-red-600 px-2 py-2"
              aria-label={`Delete ${task.title}`}
            >
              ✕
            </button>
          </>
        )}
        {canComplete && (
          <button
            onClick={handleDone}
            disabled={pending}
            className="text-xs px-3 py-1 bg-accent text-white font-medium rounded-md hover:bg-[#556148] disabled:opacity-50 ml-3"
          >
            {pending ? "…" : "Done"}
          </button>
        )}
      </div>
    </div>
  )
}
