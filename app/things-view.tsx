"use client"

import { useEffect, useMemo, useState } from "react"
import type { Person, Project, Prisma } from "@prisma/client"
import TaskList from "./task-list"
import RecurringSection from "./recurring-section"
import { todayUTC, todayLocal, daysDiff } from "@/lib/dates"

type Task = Prisma.TaskGetPayload<{ include: { assignee: true; project: true } }>
type RecurringTask = Prisma.RecurringTaskGetPayload<{ include: { assignee: true } }>

type Props = {
  tasks: Task[]
  recurringTasks: RecurringTask[]
  people: Person[]
  projects: Project[]
  isAdmin: boolean
  sessionPersonId: number | null
  isKid: boolean
  soundEnabled: boolean
}

export default function ThingsView({
  tasks, recurringTasks, people, projects, isAdmin, sessionPersonId, isKid, soundEnabled,
}: Props) {
  const [filterPersonId, setFilterPersonId] = useState<number | null>(
    isAdmin ? null : sessionPersonId
  )

  const [today, setToday] = useState(todayUTC)
  useEffect(() => { setToday(todayLocal()) }, [])

  const hasRoutinesForActive = useMemo(() => {
    if (filterPersonId === null) return recurringTasks.length > 0
    return recurringTasks.some(t => {
      if (daysDiff(t.nextDue, today) > 0) return false
      return t.assigneeId === filterPersonId || t.assigneeId === null
    })
  }, [recurringTasks, filterPersonId, today])

  return (
    <>
      <RecurringSection
        tasks={recurringTasks}
        isAdmin={isAdmin}
        sessionPersonId={sessionPersonId}
        isKid={isKid}
        filterPersonId={filterPersonId}
      />
      <TaskList
        tasks={tasks}
        people={people}
        projects={projects}
        isAdmin={isAdmin}
        sessionPersonId={sessionPersonId}
        isKid={isKid}
        filterPersonId={filterPersonId}
        onFilterChange={setFilterPersonId}
        hasRoutinesForActive={hasRoutinesForActive}
        soundEnabled={soundEnabled}
      />
    </>
  )
}
