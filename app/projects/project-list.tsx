"use client"

import { useState } from "react"
import Link from "next/link"
import { IconChevronRight, IconChevronDown } from "@tabler/icons-react"

type Project = {
  id: number
  name: string
  description: string | null
  status: string
  tasks: { completed: boolean }[]
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-accent/10 text-accent",
  paused: "bg-surface text-text-secondary",
  done:   "bg-surface text-text-muted",
}

function ProjectCard({ project }: { project: Project }) {
  const total = project.tasks.length
  const done  = project.tasks.filter(t => t.completed).length
  const isComplete = done === total && total > 0

  return (
    <li>
      <Link
        href={`/projects/${project.id}`}
        className="block p-4 rounded-xl border border-border-card bg-surface-raised hover:border-accent/40 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{project.name}</p>
            {project.description && (
              <p className="text-sm text-text-secondary mt-0.5 line-clamp-2">{project.description}</p>
            )}
          </div>
          {isComplete ? (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0 bg-warm/15 text-text-hover">
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
            <div className="flex items-center justify-between text-xs text-text-muted mb-1">
              <span>{done} of {total} done</span>
              <span>{Math.round((done / total) * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-border-subtle overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(done / total) * 100}%`, backgroundColor: isComplete ? "var(--color-warm)" : "var(--color-accent)" }}
              />
            </div>
          </div>
        )}

        {total === 0 && (
          <p className="mt-2 font-serif text-sm text-text-faint flex items-center gap-1.5"><span aria-hidden="true">✦</span>No tasks yet</p>
        )}
      </Link>
    </li>
  )
}

export default function ProjectList({ projects }: { projects: Project[] }) {
  const [showArchived, setShowArchived] = useState(false)

  const active   = projects.filter(p => p.status !== "done")
  const archived = projects.filter(p => p.status === "done")

  return (
    <>
      {active.length === 0 && archived.length === 0 && (
        <p className="text-text-muted text-sm py-4">Nothing on the board yet. Add a project above.</p>
      )}

      {active.length > 0 && (
        <ul className="space-y-3">
          {active.map(p => <ProjectCard key={p.id} project={p} />)}
        </ul>
      )}

      {archived.length > 0 && (
        <div className="mt-8 border-t border-border-card pt-5">
          <button
            onClick={() => setShowArchived(v => !v)}
            className="min-h-[44px] inline-flex items-center gap-1 text-sm text-text-secondary hover:text-foreground"
          >
            {showArchived ? <IconChevronDown size={14} aria-hidden="true" /> : <IconChevronRight size={14} aria-hidden="true" />}
            {archived.length} archived
          </button>
          {showArchived && (
            <ul className="mt-3 space-y-3 opacity-75">
              {archived.map(p => <ProjectCard key={p.id} project={p} />)}
            </ul>
          )}
        </div>
      )}
    </>
  )
}
