export const dynamic = "force-dynamic"

import { prisma } from "@/lib/prisma"
import { getSessionUser, getSessionPersonId } from "@/lib/require-auth"
import AddRecurringForm from "./add-recurring-form"
import RecurringTaskList from "./recurring-task-list"

export default async function RecurringPage() {
  const [sessionUser, sessionPersonId] = await Promise.all([getSessionUser(), getSessionPersonId()])
  const isAdmin = sessionUser?.role === "admin"
  const householdId = sessionUser?.householdId ?? -1
  const assigneeFilter = isAdmin ? {} : { assigneeId: sessionPersonId ?? -1 }

  const [tasks, people, projects] = await Promise.all([
    prisma.recurringTask.findMany({
      where: { householdId, ...assigneeFilter },
      include: { assignee: true, project: true },
      orderBy: [{ nextDue: "asc" }, { time: { sort: "asc", nulls: "first" } }],
    }),
    prisma.person.findMany({ where: { householdId }, orderBy: { name: "asc" } }),
    prisma.project.findMany({ where: { householdId }, orderBy: { name: "asc" } }),
  ])

  return (
    <main className="w-full max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-serif text-2xl font-bold mb-6 text-[#3A3228]">Routines</h1>

      {(isAdmin || sessionPersonId !== null) && <AddRecurringForm people={people} projects={projects} isAdmin={isAdmin} />}

      <RecurringTaskList tasks={tasks} people={people} projects={projects} isAdmin={isAdmin} sessionPersonId={sessionPersonId} />
    </main>
  )
}
