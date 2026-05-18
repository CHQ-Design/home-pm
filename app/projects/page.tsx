export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getSessionRole } from "@/lib/require-auth"
import AddProjectForm from "./add-project-form"

const STATUS_STYLES: Record<string, string> = {
  active:  "bg-accent/10 text-accent",
  paused:  "bg-[#EDE6D8] text-[#8C7D6A]",
  done:    "bg-[#EDE6D8] text-[#A09080]",
}

export default async function ProjectsPage() {
  const role = await getSessionRole()
  if (role !== "admin") redirect("/")

  const projects = await prisma.project.findMany({
    include: { tasks: { select: { completed: true } } },
    orderBy: { createdAt: "desc" },
  })

  return (
    <main className="w-full max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-serif text-2xl font-bold mb-6">Projects</h1>
      <AddProjectForm />

      {projects.length === 0 && (
        <p className="text-[#A09080] text-sm py-4">Nothing on the board yet. Add a project above.</p>
      )}

      <ul className="space-y-3">
        {projects.map(project => {
          const total = project.tasks.length
          const done  = project.tasks.filter(t => t.completed).length
          const isComplete = done === total && total > 0
          return (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}`}
                className="block p-4 rounded-xl border border-[#D4C9B5] bg-[#F4EEE3] hover:border-accent/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-[#3A3228] truncate">{project.name}</p>
                    {project.description && (
                      <p className="text-sm text-[#8C7D6A] mt-0.5 line-clamp-2">{project.description}</p>
                    )}
                  </div>
                  {isComplete ? (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0 bg-[#C8922A]/15 text-[#8A6E4B]">
                      Complete ✦
                    </span>
                  ) : (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 capitalize ${STATUS_STYLES[project.status] ?? STATUS_STYLES.active}`}>
                      {project.status}
                    </span>
                  )}
                </div>

                {total > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-[#A09080] mb-1">
                      <span>{done} of {total} done</span>
                      <span>{Math.round((done / total) * 100)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#E4DDD0] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(done / total) * 100}%`, backgroundColor: isComplete ? "#C8922A" : "#6B7A5A" }}
                      />
                    </div>
                  </div>
                )}

                {total === 0 && (
                  <p className="mt-2 text-xs text-[#A09080]">No tasks yet</p>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
