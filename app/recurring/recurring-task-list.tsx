"use client"

import { useEffect, useState } from "react"
import type { Prisma, Person, Project } from "@prisma/client"
import RecurringTaskItem from "./recurring-task-item"
import { todayUTC, todayLocal, utcDateStr } from "@/lib/dates"

type RecurringTask = Prisma.RecurringTaskGetPayload<{ include: { assignee: true; project: true } }>

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export default function RecurringTaskList({ tasks, people, projects, isAdmin, sessionPersonId }: {
  tasks: RecurringTask[]
  people: Person[]
  projects: Project[]
  isAdmin: boolean
  sessionPersonId: number | null
}) {
  const [today, setToday] = useState(todayUTC)
  useEffect(() => { setToday(todayLocal()) }, [])
  const [editingId, setEditingId] = useState<number | null>(null)

  const in7Days = addDays(today, 7)

  const overdue     = tasks.filter(t => utcDateStr(t.nextDue) < today)
  const dueThisWeek = tasks.filter(t => { const d = utcDateStr(t.nextDue); return d >= today && d <= in7Days })
  const upcoming    = tasks.filter(t => utcDateStr(t.nextDue) > in7Days)

  if (tasks.length === 0) {
    return <p className="text-sm text-[#A09080]">No routines yet. Add one above.</p>
  }

  function item(t: RecurringTask) {
    const dimmed = editingId !== null && editingId !== t.id
    return (
      <div key={t.id} className={dimmed ? "opacity-40 pointer-events-none transition-opacity" : "transition-opacity"}>
        <RecurringTaskItem
          task={t}
          people={people}
          projects={projects}
          isAdmin={isAdmin}
          sessionPersonId={sessionPersonId}
          onEditStart={() => setEditingId(t.id)}
          onEditEnd={() => setEditingId(null)}
        />
      </div>
    )
  }

  return (
    <>
      {overdue.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-medium text-red-600 mb-2">Overdue</h2>
          <div className="space-y-2">{overdue.map(item)}</div>
        </section>
      )}

      {dueThisWeek.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-medium text-[#8C7D6A] mb-2">Due this week</h2>
          <div className="space-y-2">{dueThisWeek.map(item)}</div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-medium text-[#8C7D6A] mb-2">Upcoming</h2>
          <div className="space-y-2">{upcoming.map(item)}</div>
        </section>
      )}
    </>
  )
}
