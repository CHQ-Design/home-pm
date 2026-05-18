"use client"

import Link from "next/link"
import { useState } from "react"
import type { Prisma } from "@prisma/client"
import { completeRecurringTask } from "./recurring/actions"

type RecurringTask = Prisma.RecurringTaskGetPayload<{ include: { assignee: true } }>

function daysDiff(nextDue: Date | string): number {
  const todayMs = new Date(new Date().toISOString().slice(0, 10)).getTime()
  const dueMs = new Date(new Date(nextDue).toISOString().slice(0, 10)).getTime()
  return Math.round((dueMs - todayMs) / (1000 * 60 * 60 * 24))
}

function dueDateLabel(nextDue: Date | string): string {
  const diff = daysDiff(nextDue)
  if (diff < 0) return "Overdue"
  if (diff === 0) return "Today"
  if (diff === 1) return "Tomorrow"
  return `In ${diff} days`
}

function dueDateClass(nextDue: Date | string): string {
  const diff = daysDiff(nextDue)
  if (diff < 0) return "text-red-600"
  if (diff === 0) return "text-[#C8922A]"
  return "text-[#A09080]"
}

function DoneButton({ taskId }: { taskId: number }) {
  const [pending, setPending] = useState(false)

  async function handleClick() {
    setPending(true)
    await completeRecurringTask(taskId)
    setPending(false)
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="text-xs px-2.5 py-1 bg-accent text-white font-medium rounded-md hover:bg-[#556148] disabled:opacity-50 shrink-0"
    >
      {pending ? "…" : "Done"}
    </button>
  )
}

export default function RecurringSection({ tasks, isAdmin, sessionPersonId }: { tasks: RecurringTask[]; isAdmin: boolean; sessionPersonId: number | null }) {
  if (tasks.length === 0) return null

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[#8C7D6A]">Routines</h2>
        {isAdmin && (
          <Link href="/recurring" className="text-xs text-[#B5A898] hover:text-[#6B5E52]">
            Manage →
          </Link>
        )}
      </div>
      <div className="space-y-1.5">
        {tasks.map(task => (
          <div
            key={task.id}
            className="flex items-center gap-3 py-2 px-3 bg-[#F2ECE2] rounded-lg border border-[#E4DDD0]"
          >
            <div className="flex-1 min-w-0">
              <span className="text-sm text-[#3A3228]">{task.title}</span>
              <span className={`ml-2 text-xs ${dueDateClass(task.nextDue)}`}>
                {dueDateLabel(task.nextDue)}
              </span>
              {task.assignee && (
                <span className="ml-2 text-xs text-[#B5A898]">{task.assignee.name}</span>
              )}
            </div>
            {(isAdmin || task.assigneeId === sessionPersonId) && <DoneButton taskId={task.id} />}
          </div>
        ))}
      </div>
    </section>
  )
}
