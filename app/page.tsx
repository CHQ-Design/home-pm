export const dynamic = "force-dynamic"

import type { Metadata } from "next"
export const metadata: Metadata = { title: "Things — Toft" }

import { prisma } from "@/lib/prisma"
import { getSessionUser, getSessionPersonId } from "@/lib/require-auth"
import AddTaskForm from "./add-task-form"
import ThingsView from "./things-view"
import LocalDate from "./local-date"
import WelcomeHeader from "./welcome-header"
import { getPersonColor } from "@/lib/person-colors"
import { redirect } from "next/navigation"

export default async function Home() {
  const now = new Date()
  const startOfTomorrow = new Date(now)
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)
  startOfTomorrow.setHours(0, 0, 0, 0)

  const [sessionUser, sessionPersonId] = await Promise.all([getSessionUser(), getSessionPersonId()])
  if (!sessionUser) redirect("/login")
  const isAdmin = sessionUser.role === "admin"
  const householdId = sessionUser.householdId
  const assigneeFilter = isAdmin ? {} : { assigneeId: sessionPersonId ?? -1 }

  const [tasks, people, projects, recurringTasks] = await Promise.all([
    prisma.task.findMany({ where: { householdId, ...assigneeFilter }, include: { assignee: true, project: true }, orderBy: { createdAt: "asc" } }),
    prisma.person.findMany({ where: { householdId }, orderBy: { name: "asc" } }),
    prisma.project.findMany({ where: { householdId }, orderBy: { name: "asc" } }),
    prisma.recurringTask.findMany({
      where: { householdId, nextDue: { lt: startOfTomorrow }, ...assigneeFilter },
      include: { assignee: true },
      orderBy: [{ nextDue: "asc" }, { time: { sort: "asc", nulls: "first" } }],
    }),
  ])

  const memberPerson = !isAdmin && sessionPersonId
    ? people.find(p => p.id === sessionPersonId) ?? null
    : null
  const memberColor = memberPerson ? getPersonColor(people, memberPerson.id) : null
  const isKid = memberPerson?.isKid ?? false

  const showAddForm = isAdmin || (sessionPersonId !== null && !isKid)

  return (
    <>
      <main id="main-content" className={`w-full max-w-2xl mx-auto px-4 pt-8 ${showAddForm ? "pb-52 sm:pb-8" : "pb-28 sm:pb-8"}`}>
        <LocalDate />
        {memberPerson && memberColor ? (
          <WelcomeHeader name={memberPerson.name} color={memberColor.text} streakCount={memberPerson.streakCount} isKid={isKid} />
        ) : (
          <h1 className="font-serif text-3xl font-bold mb-6">Things</h1>
        )}
        <ThingsView tasks={tasks} recurringTasks={recurringTasks} people={people} projects={projects} isAdmin={isAdmin} sessionPersonId={sessionPersonId} isKid={isKid} />
      </main>
      {showAddForm && (
        <div className="fixed bottom-[calc(56px+env(safe-area-inset-bottom))] sm:bottom-0 left-0 right-0 z-30 bg-background border-t border-border">
          <div className="max-w-2xl mx-auto px-4 pt-3 pb-3 sm:pb-[max(env(safe-area-inset-bottom),_12px)]">
            <AddTaskForm people={people} projects={projects} isAdmin={isAdmin} sticky />
          </div>
        </div>
      )}
    </>
  )
}
