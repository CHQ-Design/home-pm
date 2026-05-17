export const dynamic = "force-dynamic"

import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getSessionRole, getSessionPersonId } from "@/lib/require-auth"
import AddTaskForm from "@/app/add-task-form"
import TaskList from "@/app/task-list"
import ProjectHeader from "./project-header"

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const projectId = Number(id)
  if (isNaN(projectId)) notFound()

  const [project, people, projects, role, sessionPersonId] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      include: { tasks: { include: { assignee: true, project: true }, orderBy: { createdAt: "asc" } } },
    }),
    prisma.person.findMany({ orderBy: { name: "asc" } }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
    getSessionRole(),
    getSessionPersonId(),
  ])

  const isAdmin = role === "admin"

  if (!project) notFound()

  const total = project.tasks.length
  const done  = project.tasks.filter(t => t.completed).length

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

      {isAdmin && <AddTaskForm people={people} projectId={project.id} />}
      <TaskList tasks={project.tasks} people={people} projects={projects} isAdmin={isAdmin} sessionPersonId={sessionPersonId} />
    </main>
  )
}
