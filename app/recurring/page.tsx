export const dynamic = "force-dynamic"

import type { Metadata } from "next"
export const metadata: Metadata = { title: "Routines — Otium" }

import { prisma } from "@/lib/prisma"
import { getSessionUser, getSessionPersonId } from "@/lib/require-auth"
import AddRecurringForm from "./add-recurring-form"
import RecurringTaskList from "./recurring-task-list"
import PageMast from "@/app/page-mast"
import { redirect } from "next/navigation"

export default async function RecurringPage() {
  const [sessionUser, sessionPersonId] = await Promise.all([getSessionUser(), getSessionPersonId()])
  if (!sessionUser) redirect("/login")
  const isAdmin = sessionUser.role === "admin"
  const householdId = sessionUser.householdId
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

  const isKid = sessionPersonId != null ? (people.find(p => p.id === sessionPersonId)?.isKid ?? false) : false
  const showAddForm = isAdmin || (sessionPersonId !== null && !isKid)

  return (
    <main className="w-full max-w-2xl mx-auto px-4 pt-8 pb-28 sm:pb-8">
      <PageMast title="Routines" />

      {showAddForm && <AddRecurringForm people={people} projects={projects} isAdmin={isAdmin} />}

      <RecurringTaskList tasks={tasks} people={people} projects={projects} isAdmin={isAdmin} sessionPersonId={sessionPersonId} />
    </main>
  )
}
