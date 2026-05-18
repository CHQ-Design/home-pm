export const dynamic = "force-dynamic"

import { prisma } from "@/lib/prisma"
import { getSessionRole, getSessionPersonId } from "@/lib/require-auth"
import AddRecurringForm from "./add-recurring-form"
import RecurringTaskList from "./recurring-task-list"

export default async function RecurringPage() {
  const [tasks, people, projects, role, sessionPersonId] = await Promise.all([
    prisma.recurringTask.findMany({
      include: { assignee: true, project: true },
      orderBy: { nextDue: "asc" },
    }),
    prisma.person.findMany({ orderBy: { name: "asc" } }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
    getSessionRole(),
    getSessionPersonId(),
  ])
  const isAdmin = role === "admin"
  const visibleTasks = isAdmin
    ? tasks
    : tasks.filter(t => t.assigneeId === sessionPersonId)

  return (
    <main className="w-full max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-serif text-2xl font-bold mb-6 text-[#3A3228]">Routines</h1>

      {(isAdmin || sessionPersonId !== null) && <AddRecurringForm people={people} projects={projects} isAdmin={isAdmin} />}

      <RecurringTaskList tasks={visibleTasks} people={people} projects={projects} isAdmin={isAdmin} sessionPersonId={sessionPersonId} />
    </main>
  )
}
