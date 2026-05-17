export const dynamic = "force-dynamic"

import { prisma } from "@/lib/prisma"
import { getSessionRole, getSessionPersonId } from "@/lib/require-auth"
import AddRecurringForm from "./add-recurring-form"
import RecurringTaskItem from "./recurring-task-item"

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

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const in7Days = new Date(todayStart)
  in7Days.setDate(in7Days.getDate() + 7)

  const overdue      = visibleTasks.filter(t => new Date(t.nextDue) < todayStart)
  const dueThisWeek  = visibleTasks.filter(t => { const d = new Date(t.nextDue); return d >= todayStart && d <= in7Days })
  const upcoming     = visibleTasks.filter(t => new Date(t.nextDue) > in7Days)

  return (
    <main className="w-full max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-serif text-2xl font-bold mb-6 text-[#3A3228]">Routines</h1>

      {isAdmin && <AddRecurringForm people={people} projects={projects} />}

      {visibleTasks.length === 0 && (
        <p className="text-sm text-[#A09080]">No recurring tasks yet. Add one above.</p>
      )}

      {overdue.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-red-600 mb-2">Overdue</h2>
          <div className="space-y-2">
            {overdue.map(t => <RecurringTaskItem key={t.id} task={t} people={people} projects={projects} isAdmin={isAdmin} sessionPersonId={sessionPersonId} />)}
          </div>
        </section>
      )}

      {dueThisWeek.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[#8C7D6A] mb-2">Due this week</h2>
          <div className="space-y-2">
            {dueThisWeek.map(t => <RecurringTaskItem key={t.id} task={t} people={people} projects={projects} isAdmin={isAdmin} sessionPersonId={sessionPersonId} />)}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[#8C7D6A] mb-2">Upcoming</h2>
          <div className="space-y-2">
            {upcoming.map(t => <RecurringTaskItem key={t.id} task={t} people={people} projects={projects} isAdmin={isAdmin} sessionPersonId={sessionPersonId} />)}
          </div>
        </section>
      )}
    </main>
  )
}
