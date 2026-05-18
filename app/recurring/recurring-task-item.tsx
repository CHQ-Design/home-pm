"use client"

import { useEffect, useState } from "react"
import type { Prisma, Person, Project } from "@prisma/client"
import { IconPencilMinus, IconX } from "@tabler/icons-react"
import { completeRecurringTask, updateRecurringTask, deleteRecurringTask } from "./actions"
import { todayUTC, todayLocal, daysDiff, formatTime } from "@/lib/dates"
import { inputClass } from "@/lib/styles"
import DatePicker from "../date-picker"
import TimePicker from "../time-picker"
import CustomSelect from "../custom-select"

type RecurringTask = Prisma.RecurringTaskGetPayload<{ include: { assignee: true; project: true } }>

const CADENCES = [
  { label: "Mon–Fri",        value: "1|weekday" },
  { label: "Daily",          value: "1|day" },
  { label: "Weekly",         value: "1|week" },
  { label: "Every 2 weeks",  value: "2|week" },
  { label: "Monthly",        value: "1|month" },
  { label: "Every 3 months", value: "3|month" },
  { label: "Every 6 months", value: "6|month" },
  { label: "Yearly",         value: "1|year" },
]

function describeCadence(value: number, unit: string): string {
  if (unit === "weekday") return "Mon–Fri"
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

function dueDateClass(nextDue: Date | string, today: string): string {
  const diff = daysDiff(nextDue, today)
  if (diff < 0) return "text-red-600 font-medium"
  if (diff === 0) return "text-[#C8922A] font-medium"
  if (diff <= 7) return "text-[#8A6E4B]"
  return "text-[#A09080]"
}

function dueDateLabel(nextDue: Date | string, today: string): string {
  const diff = daysDiff(nextDue, today)
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

export default function RecurringTaskItem({
  task,
  people,
  projects,
  isAdmin,
  sessionPersonId,
  onEditStart,
  onEditEnd,
}: {
  task: RecurringTask
  people: Person[]
  projects: Project[]
  isAdmin: boolean
  sessionPersonId: number | null
  onEditStart?: () => void
  onEditEnd?: () => void
}) {
  const [today, setToday] = useState(todayUTC)
  useEffect(() => { setToday(todayLocal()) }, [])

  const canComplete = isAdmin || task.assigneeId === sessionPersonId
  const [editing, setEditing] = useState(false)
  const [showNotes, setShowNotes] = useState(!!task.notes)
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    title: task.title,
    notes: task.notes ?? "",
    cadence: `${task.intervalValue}|${task.intervalUnit}`,
    nextDue: localDateString(task.nextDue),
    time: task.time ?? "",
    assigneeId: task.assigneeId ? String(task.assigneeId) : "",
    projectId: task.projectId ? String(task.projectId) : "",
    reminderMinutesBefore: task.reminderMinutesBefore != null ? String(task.reminderMinutesBefore) : "",
  })

  async function handleDone() {
    setPending(true)
    await completeRecurringTask(task.id)
    setPending(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 800)
  }

  async function handleSave() {
    const title = form.title.trim()
    if (!title) return
    const [ivStr, iu] = form.cadence.split("|")
    setPending(true)
    await updateRecurringTask(task.id, {
      title,
      notes: form.notes.trim() || null,
      time: form.time || null,
      intervalValue: Number(ivStr),
      intervalUnit: iu,
      nextDue: new Date(form.nextDue),
      assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
      projectId: form.projectId ? Number(form.projectId) : null,
      reminderMinutesBefore: form.reminderMinutesBefore !== "" ? Number(form.reminderMinutesBefore) : null,
    })
    setPending(false)
    setEditing(false)
    onEditEnd?.()
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
          aria-label="Task title"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false) }}
          className={inputClass}
          autoFocus
        />
        <CustomSelect
          aria-label="Cadence"
          value={form.cadence}
          onChange={cadence => setForm(f => ({ ...f, cadence }))}
          options={CADENCES.map(c => ({ label: c.label, value: c.value }))}
        />
        <div className="flex gap-3 items-center">
          <label className="text-xs text-[#8C7D6A] shrink-0">Next due</label>
          <div className="flex-1">
            <DatePicker
              value={form.nextDue}
              onChange={nextDue => setForm(f => ({ ...f, nextDue }))}
            />
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <label className="text-xs text-[#8C7D6A] shrink-0">Time</label>
          <TimePicker
            value={form.time}
            onChange={time => setForm(f => ({ ...f, time }))}
          />
        </div>
        <div className="flex gap-3 items-center">
          <label className="text-xs text-[#8C7D6A] shrink-0">Remind me</label>
          <div className="flex-1">
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
              <CustomSelect
                value={form.assigneeId}
                onChange={assigneeId => setForm(f => ({ ...f, assigneeId }))}
                options={[{ label: "No assignee", value: "" }, ...people.map(p => ({ label: p.name, value: String(p.id) }))]}
                aria-label="Assignee"
              />
            )}
            {projects.length > 0 && (
              <CustomSelect
                value={form.projectId}
                onChange={projectId => setForm(f => ({ ...f, projectId }))}
                options={[{ label: "No project", value: "" }, ...projects.map(p => ({ label: p.name, value: String(p.id) }))]}
                aria-label="Project"
              />
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
            onClick={() => { setEditing(false); onEditEnd?.() }}
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
            onClick={() => { setEditing(false); onEditEnd?.(); setConfirming(true) }}
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
          {task.time && <span className="text-xs text-[#A09080]">{formatTime(task.time)}</span>}
          <span className={`text-xs ${dueDateClass(task.nextDue, today)}`}>{dueDateLabel(task.nextDue, today)}</span>
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
              onClick={() => { setEditing(true); onEditStart?.() }}
              className="flex items-center justify-center min-h-[44px] min-w-[44px] text-[#B5A898] hover:text-[#6B5E52]"
              aria-label={`Edit ${task.title}`}
            >
              <IconPencilMinus size={16} aria-hidden="true" />
            </button>
            <button
              onClick={() => setConfirming(true)}
              className="flex items-center justify-center min-h-[44px] min-w-[44px] text-[#B5A898] hover:text-red-600"
              aria-label={`Delete ${task.title}`}
            >
              <IconX size={16} aria-hidden="true" />
            </button>
          </>
        )}
        {canComplete && (
          <button
            onClick={handleDone}
            disabled={pending || success}
            className="min-h-[44px] px-4 text-sm flex items-center bg-accent text-white font-medium rounded-md hover:bg-[#556148] disabled:opacity-50 ml-3"
          >
            {pending ? "…" : success ? "✓" : "Done"}
          </button>
        )}
      </div>
    </div>
  )
}
