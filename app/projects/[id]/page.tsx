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

  const [project, recurringTasks, people, projects] = await Promise.all([
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
  ])

  if (!project) notFound()

  const total = project?.tasks.length ?? 0
  const done  = project?.tasks.filter(t => t.completed).length ?? 0

  return (
    <main className="w-full max-w-2xl mx-auto px-4 py-8">
      <Link
        href="/projects"
        className="text-sm text-[#8C7D6A] hover:text-[#3A3228] mb-6 inline-block"
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

      {isAdmin && <AddTaskForm people={people} projectId={project.id} isAdmin={true} />}
      <TaskList tasks={project?.tasks ?? []} people={people} projects={projects} isAdmin={isAdmin} sessionPersonId={sessionPersonId} isKid={false} />
      <RecurringSection tasks={recurringTasks} isAdmin={isAdmin} sessionPersonId={sessionPersonId} isKid={false} />
    </main>
  )
}
