"use client"

import { useEffect, useRef, useState } from "react"
import type { Prisma, Person, Project } from "@prisma/client"
import { IconDots, IconPencilMinus, IconX } from "@tabler/icons-react"
import { completeRecurringTask, snoozeRoutine, skipRoutine, moveRoutineToTodayAction, undoRoutineAction, updateRecurringTask, deleteRecurringTask } from "./actions"
import type { ActionSnapshot } from "./actions"
import type { RoutineVerb } from "../routine-action-sheet"
import RoutineActionSheet from "../routine-action-sheet"
import { todayUTC, todayLocal, daysDiff, formatTime, formatDate, formatToastDate } from "@/lib/dates"
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

function dueDateClass(nextDue: Date | string, today: string): string {
  const diff = daysDiff(nextDue, today)
  if (diff < 0) return "text-red-600 font-medium"
  if (diff === 0) return "text-warm-text font-medium"
  if (diff <= 7) return "text-text-hover"
  return "text-text-muted"
}

function dueDateLabel(nextDue: Date | string, today: string): string {
  const diff = daysDiff(nextDue, today)
  if (diff < 0) return `Overdue · ${formatDate(nextDue)}`
  if (diff === 0) return "Due today"
  if (diff === 1) return "Due tomorrow"
  return `Due ${formatDate(nextDue)}`
}

function toastMessage(verb: RoutineVerb, nextDue: string): string {
  const date = formatToastDate(nextDue)
  switch (verb) {
    case "done":          return `Marked done. Next due ${date}.`
    case "snooze":        return `Snoozed until ${date}.`
    case "skip":          return `Skipped this cycle. Next due ${date}.`
    case "move-to-today": return "Moved to today."
  }
}

export default function RecurringTaskItem({
  task,
  people,
  projects,
  isAdmin,
  sessionPersonId,
  custodyModeEnabled = false,
  onEditStart,
  onEditEnd,
  onShowToast,
}: {
  task: RecurringTask
  people: Person[]
  projects: Project[]
  isAdmin: boolean
  sessionPersonId: number | null
  custodyModeEnabled?: boolean
  onEditStart?: () => void
  onEditEnd?: () => void
  onShowToast: (message: string, undoFn: () => Promise<void>) => void
}) {
  const [today, setToday] = useState(todayUTC)
  useEffect(() => { setToday(todayLocal()) }, [])

  const canAct = isAdmin || task.assigneeId === sessionPersonId
  const [editing, setEditing] = useState(false)
  const [showNotes, setShowNotes] = useState(!!task.notes)
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const [flash, setFlash] = useState<RoutineVerb | null>(null)
  const dotsRef = useRef<HTMLButtonElement>(null)

  const [form, setForm] = useState({
    title: task.title,
    notes: task.notes ?? "",
    cadence: `${task.intervalValue}|${task.intervalUnit}`,
    nextDue: new Date(task.nextDue).toISOString().slice(0, 10),
    time: task.time ?? "",
    assigneeId: task.assigneeId ? String(task.assigneeId) : "",
    projectId: task.projectId ? String(task.projectId) : "",
    reminderMinutesBefore: task.reminderMinutesBefore != null ? String(task.reminderMinutesBefore) : "",
    custodyMode: task.custodyMode ?? "",
  })

  function openSheet(e: React.MouseEvent<HTMLButtonElement>) {
    setAnchorRect(e.currentTarget.getBoundingClientRect())
    setSheetOpen(true)
  }

  function closeSheet() {
    setSheetOpen(false)
    setAnchorRect(null)
    dotsRef.current?.focus()
  }

  async function handleAction(verb: RoutineVerb) {
    closeSheet()

    let result: { nextDue: string; snapshot: ActionSnapshot }
    if (verb === "done")          result = await completeRecurringTask(task.id)
    else if (verb === "snooze")   result = await snoozeRoutine(task.id)
    else if (verb === "skip")     result = await skipRoutine(task.id)
    else                          result = await moveRoutineToTodayAction(task.id)

    setFlash(verb)
    setTimeout(() => setFlash(null), 200)

    onShowToast(toastMessage(verb, result.nextDue), () => undoRoutineAction(task.id, result.snapshot))
  }

  async function handleSave() {
    const title = form.title.trim()
    if (!title) return
    const [ivStr, iu] = form.cadence.split("|")
    setPending(true)
    setSaveError(null)
    try {
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
        custodyMode: form.custodyMode || null,
      })
      setEditing(false)
      onEditEnd?.()
    } catch {
      setSaveError("Couldn't save — please try again.")
    } finally {
      setPending(false)
    }
  }

  async function handleDelete() {
    setPending(true)
    try {
      await deleteRecurringTask(task.id)
    } catch {
      setSaveError("Couldn't delete — please try again.")
      setPending(false)
    }
  }

  if (editing) {
    return (
      <div className="p-4 bg-surface rounded-xl border border-border-card space-y-3 overflow-hidden">
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
          <label className="text-xs text-text-secondary shrink-0">Next due</label>
          <div className="flex-1">
            <DatePicker
              value={form.nextDue}
              onChange={nextDue => setForm(f => ({ ...f, nextDue }))}
            />
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <label className="text-xs text-text-secondary shrink-0">Time</label>
          <TimePicker
            value={form.time}
            onChange={time => setForm(f => ({ ...f, time }))}
          />
        </div>
        {form.assigneeId && (
          <div className="flex gap-3 items-center">
            <label className="text-xs text-text-secondary shrink-0">Remind me</label>
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
        )}
        {custodyModeEnabled && (
          <div className="flex gap-3 items-center">
            <label className="text-xs text-text-secondary shrink-0">Day mode</label>
            <div className="flex-1">
              <CustomSelect
                value={form.custodyMode}
                onChange={custodyMode => setForm(f => ({ ...f, custodyMode }))}
                options={[
                  { label: "Always show", value: "" },
                  { label: "With kids only", value: "with_kids" },
                  { label: "Without kids only", value: "without_kids" },
                ]}
                aria-label="Day mode"
              />
            </div>
          </div>
        )}
        {showNotes && (
          <textarea
            aria-label="Notes"
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
                onChange={assigneeId => setForm(f => ({
                  ...f,
                  assigneeId,
                  ...(assigneeId === "" ? { reminderMinutesBefore: "" } : {}),
                }))}
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
        {saveError && <p className="text-sm text-red-600">{saveError}</p>}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSave}
            disabled={pending}
            className="text-sm px-4 py-1.5 bg-accent text-white font-medium rounded-md hover:bg-accent-hover disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => { setEditing(false); onEditEnd?.() }}
            className="text-sm px-4 py-1.5 text-text-secondary hover:text-foreground rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => setShowNotes(v => !v)}
            className={`text-xs rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${showNotes ? "text-accent" : "text-text-secondary hover:text-foreground"}`}
          >
            {showNotes ? "− Notes" : "+ Notes"}
          </button>
          <button
            onClick={() => { setEditing(false); onEditEnd?.(); setConfirming(true) }}
            className="text-sm px-4 py-1.5 text-red-500 hover:text-red-700 ml-auto rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-1"
          >
            Delete
          </button>
        </div>
      </div>
    )
  }

  if (confirming) {
    return (
      <div className="p-4 bg-surface rounded-xl border border-border-card space-y-3">
        <p className="text-sm text-foreground">Delete <strong>{task.title}</strong>?</p>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={pending}
            className="text-sm px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-1"
          >
            {pending ? "Deleting…" : "Delete"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="text-sm px-3 py-1 text-text-secondary hover:text-foreground rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  const flashCls = flash ? `row-flash-${flash === "move-to-today" ? "move" : flash}` : ""

  return (
    <>
      <div className={`flex items-center gap-3 p-4 bg-surface-warm rounded-xl border border-border-subtle group ${flashCls}`}>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{task.title}</p>
          <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
            <span className="text-xs text-text-muted">{describeCadence(task.intervalValue, task.intervalUnit)}</span>
            {task.time && <span className="text-xs text-text-muted">{formatTime(task.time)}</span>}
            <span className={`text-xs ${dueDateClass(task.nextDue, today)}`}>{dueDateLabel(task.nextDue, today)}</span>
            {task.assignee && (
              <span className="text-xs text-text-secondary">{task.assignee.name}</span>
            )}
            {task.project && (
              <span className="text-xs text-text-secondary bg-surface rounded px-1.5 py-0.5">{task.project.name}</span>
            )}
          </div>
          {task.notes && (
            <p className="text-xs text-text-secondary mt-1">{task.notes}</p>
          )}
        </div>
        <div className="flex items-center shrink-0">
          {isAdmin && (
            <>
              <button
                onClick={() => { setEditing(true); onEditStart?.() }}
                className="flex items-center justify-center min-h-[44px] min-w-[44px] text-text-faint hover:text-text-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 rounded"
                aria-label={`Edit ${task.title}`}
              >
                <IconPencilMinus size={16} aria-hidden="true" />
              </button>
              <button
                onClick={() => setConfirming(true)}
                className="flex items-center justify-center min-h-[44px] min-w-[44px] text-text-faint hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-1 rounded"
                aria-label={`Delete ${task.title}`}
              >
                <IconX size={16} aria-hidden="true" />
              </button>
            </>
          )}
          {canAct && (
            <button
              ref={dotsRef}
              onClick={openSheet}
              aria-label={`More options for ${task.title}`}
              className="flex items-center justify-center min-h-[44px] min-w-[44px] text-text-faint hover:text-foreground hover:bg-surface-hover rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ml-1"
            >
              <IconDots size={18} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {sheetOpen && (
        <RoutineActionSheet
          taskTitle={task.title}
          nextDue={task.nextDue}
          today={today}
          anchorRect={anchorRect}
          onAction={handleAction}
          onClose={closeSheet}
        />
      )}

    </>
  )
}
