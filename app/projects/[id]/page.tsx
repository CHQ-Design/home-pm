export const dynamic = "force-dynamic"

import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getSessionUser, getSessionPersonId } from "@/lib/require-auth"
import AddTaskForm from "@/app/add-task-form"
import TaskList from "@/app/task-list"
import RecurringSection from "@/app/recurring-section"
import ProjectHeader from "./project-header"

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const projectId = Number(id)
  if (isNaN(projectId)) notFound()

  const [sessionUser, sessionPersonId] = await Promise.all([getSessionUser(), getSessionPersonId()])
  const isAdmin = sessionUser?.role === "admin"
  const householdId = sessionUser?.householdId ?? -1
  const assigneeFilter = isAdmin ? {} : { assigneeId: sessionPersonId ?? -1 }

  const [project, recurringTasks, people, projects, household] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId, householdId },
      include: { tasks: { where: assigneeFilter, include: { assignee: true, project: true }, orderBy: { createdAt: "asc" } } },
    }),
    prisma.recurringTask.findMany({
      where: { projectId, householdId, ...assigneeFilter },
      include: { assignee: true },
      orderBy: { nextDue: "asc" },
    }),
    prisma.person.findMany({ where: { householdId }, orderBy: { name: "asc" } }),
    prisma.project.findMany({ where: { householdId }, orderBy: { name: "asc" } }),
    prisma.household.findUnique({ where: { id: householdId }, select: { soundEnabled: true } }),
  ])
  const soundEnabled = household?.soundEnabled ?? true

  if (!project) notFound()

  const total = project?.tasks.length ?? 0
  const done  = project?.tasks.filter(t => t.completed).length ?? 0

  return (
    <main className="w-full max-w-2xl mx-auto px-4 pt-8 pb-28 sm:pb-8">
      <Link
        href="/projects"
        className="text-sm text-text-secondary hover:text-foreground mb-6 inline-block"
      >
        ← Projects
      </Link>

      <ProjectHeader
        projectId={project.id}
        name={project.name}
        description={project.description}
        status={project.status}
        progress={total > 0 ? { done, total } : null}
      />

      {isAdmin && <AddTaskForm people={people} projectId={project.id} isAdmin={true} householdId={householdId} sessionPersonId={sessionPersonId} />}
      <TaskList tasks={project?.tasks ?? []} people={people} projects={projects} isAdmin={isAdmin} sessionPersonId={sessionPersonId} isKid={false} currentProjectId={project.id} soundEnabled={soundEnabled} />
      <RecurringSection tasks={recurringTasks} isAdmin={isAdmin} sessionPersonId={sessionPersonId} isKid={false} />
    </main>
  )
}
