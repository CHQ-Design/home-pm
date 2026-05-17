import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import AddTaskForm from "@/app/add-task-form"
import TaskList from "@/app/task-list"
import ProjectStatusSelect from "./project-status-select"

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const projectId = Number(id)
  if (isNaN(projectId)) notFound()

  const [project, people, projects] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      include: { tasks: { include: { assignee: true, project: true }, orderBy: { createdAt: "asc" } } },
    }),
    prisma.person.findMany({ orderBy: { name: "asc" } }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
  ])

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

      <div className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-serif text-2xl font-bold text-[#3A3228]">{project.name}</h1>
          <ProjectStatusSelect projectId={project.id} status={project.status} />
        </div>

        {project.description && (
          <p className="text-sm text-[#8C7D6A] mt-1">{project.description}</p>
        )}

        {total > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-[#A09080] mb-1">
              <span>{done} of {total} task{total !== 1 ? "s" : ""} done</span>
              <span>{Math.round((done / total) * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#E4DDD0] overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${(done / total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <AddTaskForm people={people} projectId={project.id} />
      <TaskList tasks={project.tasks} people={people} projects={projects} />
    </main>
  )
}
