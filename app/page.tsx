export const dynamic = "force-dynamic"

import { prisma } from "@/lib/prisma"
import { getSessionUser, getSessionPersonId } from "@/lib/require-auth"
import AddTaskForm from "./add-task-form"
import TaskList from "./task-list"
import RecurringSection from "./recurring-section"
import LocalDate from "./local-date"
import WelcomeHeader from "./welcome-header"
import { getPersonColor } from "@/lib/person-colors"

export default async function Home() {
  const now = new Date()
  const in7Days = new Date(now)
  in7Days.setDate(in7Days.getDate() + 7)

  const [sessionUser, sessionPersonId] = await Promise.all([getSessionUser(), getSessionPersonId()])
  const isAdmin = sessionUser?.role === "admin"
  const householdId = sessionUser?.householdId ?? -1
  const assigneeFilter = isAdmin ? {} : { assigneeId: sessionPersonId ?? -1 }

  const [tasks, people, projects, recurringTasks] = await Promise.all([
    prisma.task.findMany({ where: { householdId, ...assigneeFilter }, include: { assignee: true, project: true }, orderBy: { createdAt: "asc" } }),
    prisma.person.findMany({ where: { householdId }, orderBy: { name: "asc" } }),
    prisma.project.findMany({ where: { householdId }, orderBy: { name: "asc" } }),
    prisma.recurringTask.findMany({
      where: { householdId, nextDue: { lte: in7Days }, ...assigneeFilter },
      include: { assignee: true },
      orderBy: { nextDue: "asc" },
    }),
  ])

  const memberPerson = !isAdmin && sessionPersonId
    ? people.find(p => p.id === sessionPersonId) ?? null
    : null
  const memberColor = memberPerson ? getPersonColor(people, memberPerson.id) : null

  return (
    <main className="w-full max-w-2xl mx-auto px-4 py-8">
      <LocalDate />
      {memberPerson && memberColor ? (
        <WelcomeHeader name={memberPerson.name} color={memberColor.text} streakCount={memberPerson.streakCount} />
      ) : (
        <h1 className="font-serif text-2xl font-bold mb-6">Things</h1>
      )}
      {(isAdmin || sessionPersonId !== null) && <AddTaskForm people={people} projects={projects} isAdmin={isAdmin} />}
      <TaskList tasks={tasks} people={people} projects={projects} isAdmin={isAdmin} sessionPersonId={sessionPersonId} />
      <RecurringSection tasks={recurringTasks} isAdmin={isAdmin} sessionPersonId={sessionPersonId} />
    </main>
  )
}
