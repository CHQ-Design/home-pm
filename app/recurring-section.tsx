"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import type { Prisma } from "@prisma/client"
import { IconDots, IconRepeat } from "@tabler/icons-react"
import { completeRecurringTask, snoozeRoutine, skipRoutine, moveRoutineToTodayAction, undoRoutineAction } from "./recurring/actions"
import type { ActionSnapshot } from "./recurring/actions"
import type { RoutineVerb } from "./routine-action-sheet"
import RoutineActionSheet from "./routine-action-sheet"
import UndoToast from "./undo-toast"
import { todayUTC, todayLocal, daysDiff, formatTime, formatToastDate } from "@/lib/dates"

type RecurringTask = Prisma.RecurringTaskGetPayload<{ include: { assignee: true } }>

function dueDateLabel(nextDue: Date | string, today: string): string {
  const diff = daysDiff(nextDue, today)
  if (diff < 0) return "Overdue"
  if (diff === 0) return "Today"
  if (diff === 1) return "Tomorrow"
  return `In ${diff} days`
}

function dueDateClass(nextDue: Date | string, today: string): string {
  const diff = daysDiff(nextDue, today)
  if (diff < 0) return "text-red-600"
  if (diff === 0) return "text-warm-text"
  return "text-text-muted"
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

type FlashState = { taskId: number; verb: RoutineVerb } | null
type ToastState = { message: string; taskId: number; snapshot: ActionSnapshot } | null

export default function RecurringSection({ tasks, isAdmin, sessionPersonId, isKid = false, filterPersonId = null }: {
  tasks: RecurringTask[]
  isAdmin: boolean
  sessionPersonId: number | null
  isKid?: boolean
  filterPersonId?: number | null
}) {
  const [today, setToday] = useState(todayUTC)
  useEffect(() => { setToday(todayLocal()) }, [])

  const [sheetTask, setSheetTask] = useState<RecurringTask | null>(null)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const [flash, setFlash] = useState<FlashState>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const buttonRefs = useRef<Map<number, HTMLButtonElement>>(new Map())

  // After hydration, filter to local today/overdue only
  const visibleTasks = tasks.filter(t => {
    if (daysDiff(t.nextDue, today) > 0) return false
    if (filterPersonId !== null && t.assigneeId !== filterPersonId && t.assigneeId !== null) return false
    return true
  })

  if (visibleTasks.length === 0) return null

  function openSheet(task: RecurringTask, rect: DOMRect) {
    setSheetTask(task)
    setAnchorRect(rect)
  }

  function closeSheet() {
    if (sheetTask) buttonRefs.current.get(sheetTask.id)?.focus()
    setSheetTask(null)
    setAnchorRect(null)
  }

  async function handleAction(verb: RoutineVerb) {
    if (!sheetTask) return
    const task = sheetTask
    closeSheet()

    let result: { nextDue: string; snapshot: ActionSnapshot }
    if (verb === "done")          result = await completeRecurringTask(task.id)
    else if (verb === "snooze")   result = await snoozeRoutine(task.id)
    else if (verb === "skip")     result = await skipRoutine(task.id)
    else                          result = await moveRoutineToTodayAction(task.id)

    setFlash({ taskId: task.id, verb })
    setTimeout(() => setFlash(null), 200)

    setToast({
      message: toastMessage(verb, result.nextDue),
      taskId: task.id,
      snapshot: result.snapshot,
    })
  }

  async function handleUndo() {
    if (!toast) return
    const { taskId, snapshot } = toast
    setToast(null)
    await undoRoutineAction(taskId, snapshot)
  }

  return (
    <section className="mb-8" aria-labelledby="heading-routines">
      <div className="flex items-center justify-between mb-3">
        <h2 id="heading-routines" className="flex items-center gap-1.5 font-serif text-xl text-warm-text">
          <IconRepeat size={18} aria-hidden="true" />
          Routines
        </h2>
        {isAdmin && (
          <Link href="/recurring" className="min-h-[44px] inline-flex items-center text-xs text-text-secondary hover:text-foreground">
            Manage →
          </Link>
        )}
      </div>
      <ul className="rounded-xl border border-border-subtle divide-y divide-border-subtle overflow-hidden">
        {visibleTasks.map(task => {
          const canAct = isAdmin || task.assigneeId === sessionPersonId
          const metaParts = [
            task.time && !isKid ? formatTime(task.time) : null,
            isKid ? (dueDateLabel(task.nextDue, today) === "Today" ? "Today" : null) : dueDateLabel(task.nextDue, today),
            task.assignee && !isKid ? task.assignee.name : null,
          ].filter(Boolean)

          const flashCls = flash?.taskId === task.id
            ? `row-flash-${flash.verb === "move-to-today" ? "move" : flash.verb}`
            : ""

          return (
            <li
              key={task.id}
              className={`flex items-center gap-3 py-2.5 px-3 ${flashCls}`}
            >
              <div className="flex-1 min-w-0">
                <span className={`${isKid ? "text-xl" : "text-sm"} text-foreground`}>{task.title}</span>
                {metaParts.length > 0 && (
                  <span className="sr-only">{metaParts.join(" · ")}</span>
                )}
                {task.time && !isKid && (
                  <span aria-hidden="true" className="ml-2 text-xs text-text-muted">{formatTime(task.time)}</span>
                )}
                {isKid ? (
                  dueDateLabel(task.nextDue, today) === "Today" && (
                    <span aria-hidden="true" className="ml-2 text-xs text-warm-text">Today</span>
                  )
                ) : (
                  <span aria-hidden="true" className={`ml-2 text-xs ${dueDateClass(task.nextDue, today)}`}>
                    {dueDateLabel(task.nextDue, today)}
                  </span>
                )}
                {task.assignee && !isKid && (
                  <span aria-hidden="true" className="ml-2 text-xs text-text-faint">{task.assignee.name}</span>
                )}
              </div>
              {canAct && (
                <button
                  ref={el => { if (el) buttonRefs.current.set(task.id, el); else buttonRefs.current.delete(task.id) }}
                  onClick={e => openSheet(task, e.currentTarget.getBoundingClientRect())}
                  aria-label={`More options for ${task.title}`}
                  className="flex items-center justify-center min-h-[44px] min-w-[44px] text-text-faint hover:text-foreground hover:bg-surface-hover rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 shrink-0"
                >
                  <IconDots size={18} aria-hidden="true" />
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {sheetTask && (
        <RoutineActionSheet
          taskTitle={sheetTask.title}
          nextDue={sheetTask.nextDue}
          today={today}
          anchorRect={anchorRect}
          onAction={handleAction}
          onClose={closeSheet}
        />
      )}

      {toast && (
        <UndoToast
          message={toast.message}
          onUndo={handleUndo}
          onDismiss={() => setToast(null)}
        />
      )}
    </section>
  )
}
