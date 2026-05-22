"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import type { Prisma } from "@prisma/client"
import { IconCheck, IconRepeat } from "@tabler/icons-react"
import { completeRecurringTask } from "./recurring/actions"
import { todayUTC, todayLocal, daysDiff, formatTime } from "@/lib/dates"

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

function DoneButton({ taskId, taskTitle }: { taskId: number; taskTitle: string }) {
  const [pending, setPending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [announcement, setAnnouncement] = useState("")

  async function handleClick() {
    setPending(true)
    await completeRecurringTask(taskId)
    setPending(false)
    setSuccess(true)
    setAnnouncement(`Done — ${taskTitle}`)
    setTimeout(() => setSuccess(false), 800)
    setTimeout(() => setAnnouncement(""), 1500)
  }

  return (
    <>
      <span className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</span>
      <button
        onClick={handleClick}
        disabled={pending || success}
        aria-label={`Mark ${taskTitle} as done`}
        className="min-h-[44px] px-3 text-sm inline-flex items-center gap-1.5 text-accent-hover hover:text-foreground hover:bg-surface-warm rounded-md disabled:opacity-50 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
      >
        {pending ? "…" : success ? (
          <><IconCheck size={14} aria-hidden="true" />Done</>
        ) : (
          <><IconCheck size={14} aria-hidden="true" />Mark done</>
        )}
      </button>
    </>
  )
}

export default function RecurringSection({ tasks, isAdmin, sessionPersonId, isKid = false, filterPersonId = null }: { tasks: RecurringTask[]; isAdmin: boolean; sessionPersonId: number | null; isKid?: boolean; filterPersonId?: number | null }) {
  const [today, setToday] = useState(todayUTC)
  useEffect(() => { setToday(todayLocal()) }, [])

  // After hydration, filter to local today/overdue only (server query uses UTC midnight,
  // which can include "tomorrow" for US timezone users between midnight UTC and local midnight)
  const visibleTasks = tasks.filter(t => {
    if (daysDiff(t.nextDue, today) > 0) return false
    if (filterPersonId !== null && t.assigneeId !== filterPersonId && t.assigneeId !== null) return false
    return true
  })

  if (visibleTasks.length === 0) return null

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
          const metaParts = [
            task.time && !isKid ? formatTime(task.time) : null,
            isKid ? (dueDateLabel(task.nextDue, today) === "Today" ? "Today" : null) : dueDateLabel(task.nextDue, today),
            task.assignee && !isKid ? task.assignee.name : null,
          ].filter(Boolean)
          return (
            <li
              key={task.id}
              className="flex items-center gap-3 py-2.5 px-3"
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
              {(isAdmin || task.assigneeId === sessionPersonId) && <DoneButton taskId={task.id} taskTitle={task.title} />}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
