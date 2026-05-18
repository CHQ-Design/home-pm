export const dynamic = "force-dynamic"

import { prisma } from "@/lib/prisma"
import { getSessionRole, getSessionPersonId } from "@/lib/require-auth"
import AddTaskForm from "./add-task-form"
import TaskList from "./task-list"
import RecurringSection from "./recurring-section"
import LocalDate from "./local-date"

export default async function Home() {
  const now = new Date()
  const in7Days = new Date(now)
  in7Days.setDate(in7Days.getDate() + 7)

  const [tasks, people, projects, recurringTasks, role, sessionPersonId] = await Promise.all([
    prisma.task.findMany({ include: { assignee: true, project: true }, orderBy: { createdAt: "asc" } }),
    prisma.person.findMany({ orderBy: { name: "asc" } }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
    prisma.recurringTask.findMany({
      where: { nextDue: { lte: in7Days } },
      include: { assignee: true },
      orderBy: { nextDue: "asc" },
    }),
    getSessionRole(),
    getSessionPersonId(),
  ])

  const isAdmin = role === "admin"
  const visibleTasks = isAdmin
    ? tasks
    : tasks.filter(t => t.assigneeId === sessionPersonId)
  const visibleRecurringTasks = isAdmin
    ? recurringTasks
    : recurringTasks.filter(t => t.assigneeId === sessionPersonId)

  const memberPerson = !isAdmin && sessionPersonId
    ? people.find(p => p.id === sessionPersonId)
    : null

  return (
    <main className="w-full max-w-2xl mx-auto px-4 py-8">
      <LocalDate />
      <h1 className="font-serif text-2xl font-bold mb-6">
        {memberPerson ? `${memberPerson.name}'s Things` : "Things"}
      </h1>
      {(isAdmin || sessionPersonId !== null) && <AddTaskForm people={people} projects={projects} isAdmin={isAdmin} />}
      <TaskList tasks={visibleTasks} people={people} projects={projects} isAdmin={isAdmin} sessionPersonId={sessionPersonId} />
      <RecurringSection tasks={visibleRecurringTasks} isAdmin={isAdmin} sessionPersonId={sessionPersonId} />
    </main>
  )
}
