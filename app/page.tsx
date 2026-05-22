export const dynamic = "force-dynamic"

import type { Metadata } from "next"
export const metadata: Metadata = { title: "Things — Otium" }

import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import { getSessionUser, getSessionPersonId } from "@/lib/require-auth"
import AddTaskForm from "./add-task-form"
import ThingsView from "./things-view"
import LocalDate from "./local-date"
import GreetingMast from "./greeting-mast"
import PageMast from "./page-mast"
import { getPersonColor } from "@/lib/person-colors"
import { redirect } from "next/navigation"

export default async function Home() {
  const [sessionUser, sessionPersonId] = await Promise.all([getSessionUser(), getSessionPersonId()])
  if (!sessionUser) redirect("/login")
  const isAdmin = sessionUser.role === "admin"
  const householdId = sessionUser.householdId
  const assigneeFilter = isAdmin ? {} : { assigneeId: sessionPersonId ?? -1 }

  const [tasks, people, projects, recurringTasks, household] = await Promise.all([
    prisma.task.findMany({ where: { householdId, ...assigneeFilter }, include: { assignee: true, project: true }, orderBy: { createdAt: "asc" } }),
    prisma.person.findMany({ where: { householdId }, orderBy: { name: "asc" } }),
    prisma.project.findMany({ where: { householdId }, orderBy: { name: "asc" } }),
    prisma.recurringTask.findMany({
      where: { householdId, ...assigneeFilter },
      include: { assignee: true },
      orderBy: [{ nextDue: "asc" }, { time: { sort: "asc", nulls: "first" } }],
    }),
    prisma.household.findUnique({ where: { id: householdId }, select: { soundEnabled: true, custodyModeEnabled: true } }),
  ])
  const soundEnabled = household?.soundEnabled ?? true
  const custodyModeEnabled = household?.custodyModeEnabled ?? false
  const raw = sessionUser.custodyMode
  const initialCustodyMode: import("./custody-mode-chip").CustodyMode | null =
    raw === "with_kids" || raw === "without_kids" ? raw : null

  const memberPerson = !isAdmin && sessionPersonId
    ? people.find(p => p.id === sessionPersonId) ?? null
    : null
  const memberColor = memberPerson ? getPersonColor(people, memberPerson.id) : null
  const isKid = memberPerson?.isKid ?? false

  const showAddForm = isAdmin || (sessionPersonId !== null && !isKid)

  return (
    <>
      <main id="main-content" className={`w-full max-w-2xl mx-auto px-4 pt-8 ${showAddForm ? "pb-52 sm:pb-28" : "pb-28 sm:pb-8"}`}>
        <LocalDate />
        {memberPerson && memberColor ? (
          <GreetingMast name={memberPerson.name} accentColor={memberColor.text} streakCount={memberPerson.streakCount} isKid={isKid} />
        ) : (
          <PageMast title="Things" />
        )}
        <Suspense>
          <ThingsView tasks={tasks} recurringTasks={recurringTasks} people={people} projects={projects} isAdmin={isAdmin} sessionPersonId={sessionPersonId} isKid={isKid} soundEnabled={soundEnabled} timezone={sessionUser.timezone} custodyModeEnabled={custodyModeEnabled} initialCustodyMode={initialCustodyMode} />
        </Suspense>
      </main>
      {showAddForm && (
        <div className="fixed bottom-[calc(56px+env(safe-area-inset-bottom))] sm:bottom-0 left-0 right-0 z-30 bg-surface-warm border-t border-border shadow-input-tray">
          <div className="max-w-2xl mx-auto px-4 pt-3 pb-3 sm:pb-[max(env(safe-area-inset-bottom),_12px)]">
            <AddTaskForm people={people} projects={projects} isAdmin={isAdmin} sticky householdId={householdId} sessionPersonId={sessionPersonId} />
          </div>
        </div>
      )}
    </>
  )
}
