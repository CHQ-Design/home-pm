"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import ReactMarkdown from "react-markdown"
import type { Person, Project, Prisma } from "@prisma/client"
import { IconBell, IconFeather, IconFlame, IconNote, IconPencilMinus } from "@tabler/icons-react"
import { toggleTask, updateTask } from "./actions"
import TaskEditModal from "./task-edit-modal"
import { todayLocal, utcDateStr, formatTime, formatShortDate } from "@/lib/dates"
import { getPersonColor } from "@/lib/person-colors"
import { playCompletionTone } from "@/lib/sounds"

type Task = Prisma.TaskGetPayload<{ include: { assignee: true; project: true } }>
type Priority = "high" | "medium" | "low"

const PRIORITY_STYLES: Record<Priority, string> = {
  high: "bg-warm/20 text-text-hover",
  medium: "",
  low: "bg-surface text-text-secondary border border-border-chip",
}

const PARTICLE_ANGLES = [0, 60, 120, 180, 240, 300]
const KID_PARTICLE_ANGLES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]


function relativeDateLabel(date: Date): string {
  const today = todayLocal()
  const dateStr = utcDateStr(date)
  const diff = Math.round((new Date(dateStr).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return "Overdue"
  if (diff === 0) return "Today"
  if (diff === 1) return "Tomorrow"
  return `In ${diff} days`
}

export default function TaskItem({ task, people, projects, isAdmin, sessionPersonId, isKid = false, currentProjectId, soundEnabled = true, filterPersonId = null }: { task: Task; people: Person[]; projects: Project[]; isAdmin: boolean; sessionPersonId: number | null; isKid?: boolean; currentProjectId?: number; soundEnabled?: boolean; filterPersonId?: number | null }) {
  const canToggle = isAdmin || task.assigneeId === sessionPersonId
  const personColor = task.assigneeId != null
    ? getPersonColor(people, task.assigneeId)
    : null
  const showLeadingMonogram =
    isAdmin && filterPersonId == null && task.assigneeId != null && !!task.assignee
  const hasNote = !!(task.notes?.trim())
  const [isExpanded, setIsExpanded] = useState(false)
  const [isInlineEditing, setIsInlineEditing] = useState(false)
  const [inlineTitle, setInlineTitle] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showParticles, setShowParticles] = useState(false)
  const [justCompleted, setJustCompleted] = useState(false)
  const [announcement, setAnnouncement] = useState("")
  const prevCompleted = useRef(task.completed)
  const openTriggerRef = useRef<HTMLButtonElement | null>(null)
  const editTriggerRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!prevCompleted.current && task.completed) {
      setShowParticles(true)
      setJustCompleted(true)
      setAnnouncement(`${task.title} done!`)
      const t = setTimeout(() => setShowParticles(false), 750)
      const a = setTimeout(() => setAnnouncement(""), 1500)
      return () => { clearTimeout(t); clearTimeout(a) }
    }
    if (!task.completed) setJustCompleted(false)
    prevCompleted.current = task.completed
  }, [task.completed])

  function openInline() {
    if (task.completed || !isAdmin) return
    setInlineTitle(task.title)
    setIsInlineEditing(true)
  }

  async function saveInline() {
    setIsInlineEditing(false)
    const trimmed = inlineTitle.trim()
    if (trimmed && trimmed !== task.title) {
      await updateTask(task.id, { title: trimmed })
    }
  }

  return (
    <li className="group">
      <span className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</span>
      <div
        onClick={hasNote ? () => setIsExpanded(v => !v) : undefined}
        className={`relative rounded-lg border border-border-subtle border-l-[3px] transition-all ${hasNote ? "cursor-pointer" : ""} ${
          isKid && task.completed
            ? ""
            : task.completed
              ? "bg-background opacity-60"
              : "bg-background hover:bg-hover hover:shadow-card active:bg-[rgba(200,146,42,0.07)]"
        }`}
        style={{
          borderLeftColor: personColor?.border ?? "transparent",
          ...(isKid && task.completed ? { backgroundColor: personColor?.bg ?? "var(--color-kid-done)" } : {}),
        }}
      >
        {/* Title row */}
        <div className={`flex items-center gap-2 ${isKid ? "min-h-[56px]" : "min-h-[44px]"}`}>
          {/* Checkbox with 44px touch target */}
          <label onClick={e => e.stopPropagation()} className={`shrink-0 flex items-center justify-center min-h-[44px] min-w-[44px] relative ${canToggle ? "cursor-pointer" : "cursor-default"}`}>
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => {
                if (!canToggle) return
                if (!task.completed) {
                  const sorted = [...people].sort((a, b) => a.id - b.id)
                  const personIndex = task.assigneeId != null
                    ? sorted.findIndex(p => p.id === task.assigneeId)
                    : null
                  if (soundEnabled) playCompletionTone(personIndex)
                }
                toggleTask(task.id)
              }}
              disabled={!canToggle}
              aria-label={`Mark ${task.title} as ${task.completed ? "incomplete" : "complete"}`}
              className="peer sr-only"
            />
            <span
              className={`
                ${isKid ? "h-7 w-7 rounded-lg border-2" : "h-4 w-4 rounded border"} flex items-center justify-center shrink-0
                transition-all duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]
                ${task.completed
                  ? isKid
                    ? "bg-warm border-warm scale-125"
                    : "bg-accent border-accent scale-110"
                  : "bg-transparent border-text-muted scale-100 peer-focus-visible:border-accent"
                }
              `}
            >
              {task.completed && (
                isKid
                  ? <svg width="16" height="12" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  : <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
            </span>

            {/* Particle burst + star pop */}
            {showParticles && (
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
                {(isKid ? KID_PARTICLE_ANGLES : PARTICLE_ANGLES).map(angle => (
                  <span
                    key={angle}
                    className={`absolute rounded-full ${isKid ? "h-2 w-2" : "h-1.5 w-1.5"}`}
                    style={{
                      backgroundColor: personColor?.border ?? "var(--color-accent)",
                      ["--angle" as string]: `${angle}deg`,
                      animation: `${isKid ? "particle-burst-kid 950ms" : "particle-burst 550ms"} cubic-bezier(0.22,1,0.36,1) forwards`,
                    }}
                  />
                ))}
                <span
                  className={`absolute ${isKid ? "text-3xl" : "text-base"} font-bold select-none`}
                  style={{
                    color: personColor?.border ?? "var(--color-accent)",
                    animation: "star-pop 700ms ease-out forwards",
                  }}
                >
                  ★
                </span>
              </span>
            )}
          </label>

          {showLeadingMonogram && personColor && (
            <span
              aria-hidden="true"
              className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold leading-none"
              style={{ backgroundColor: personColor.border, color: "white" }}
            >
              {task.assignee!.name[0]}
            </span>
          )}

          {isInlineEditing ? (
            <input
              id={`task-panel-${task.id}`}
              aria-label="Task title"
              value={inlineTitle}
              onChange={e => setInlineTitle(e.target.value)}
              onBlur={saveInline}
              onKeyDown={e => {
                if (e.key === "Enter") saveInline()
                if (e.key === "Escape") {
                  setIsInlineEditing(false)
                  requestAnimationFrame(() => openTriggerRef.current?.focus())
                }
              }}
              className="flex-1 text-base font-medium border-b border-accent outline-none bg-transparent py-0.5 text-foreground"
              autoFocus
            />
          ) : isAdmin && !task.completed ? (
            <button
              ref={openTriggerRef}
              type="button"
              onClick={e => { e.stopPropagation(); openInline() }}
              aria-label={`Open ${task.title}`}
              aria-expanded={isInlineEditing}
              aria-controls={`task-panel-${task.id}`}
              className={`relative flex-1 text-left ${isKid ? "text-xl" : "text-base"} font-medium cursor-pointer text-foreground hover:text-text-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded`}
            >
              {task.title}
            </button>
          ) : (
            <span
              className={`relative flex-1 ${isKid ? "text-xl" : "text-base"} font-medium ${
                task.completed ? "text-text-muted" : "text-foreground"
              }`}
            >
              {task.title}
              {task.completed && !isKid && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1/2 h-px bg-border-chip -translate-y-1/2"
                  style={justCompleted
                    ? { animation: "strikethrough 350ms ease-out 80ms both" }
                    : { width: "100%" }}
                />
              )}
            </span>
          )}

          {/* Note expand — shown to all users when a note exists */}
          {hasNote && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setIsExpanded(v => !v) }}
              aria-label={isExpanded ? "Collapse note" : "Expand note"}
              aria-expanded={isExpanded}
              className={`flex items-center justify-center min-h-[44px] min-w-[44px] shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm focus-visible:ring-offset-1 rounded ${
                isExpanded ? "text-accent" : "text-text-faint group-hover:text-text-hover"
              }`}
            >
              <IconNote size={16} aria-hidden="true" />
            </button>
          )}
          {/* Edit — admin only */}
          {isAdmin && (
            <button
              ref={editTriggerRef}
              type="button"
              onClick={e => { e.stopPropagation(); setIsModalOpen(true) }}
              className="flex items-center justify-center min-h-[44px] min-w-[44px] text-text-faint text-sm leading-none shrink-0 group-hover:text-text-hover transition-colors"
              aria-label={`Edit ${task.title}`}
            >
              <IconPencilMinus size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Metadata row — shown below title, indented to align with title text */}
        {(() => {
          const showAssigneeChip = task.assignee && (isAdmin || task.assigneeId !== sessionPersonId) && !showLeadingMonogram
          const showPriority = isAdmin && task.priority !== "medium"
          const showProject = isAdmin && task.project && task.project.id !== currentProjectId
          const showBell = isAdmin && task.reminderMinutesBefore != null
          if (isInlineEditing || (!showAssigneeChip && !task.dueDate && !showPriority && !showProject && !showBell)) return null
          return (
            <div className="flex flex-wrap gap-1.5 pl-11 pb-2">
              {showProject && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent-hover">
                  {task.project!.name}
                </span>
              )}
              {showAssigneeChip && (
                <span
                  className="text-xs pl-1 pr-2 py-0.5 rounded-full border flex items-center gap-1"
                  style={personColor
                    ? { backgroundColor: personColor.bg, color: personColor.text, borderColor: personColor.border }
                    : { backgroundColor: "var(--color-surface)", color: "var(--color-text-faint)", borderColor: "var(--color-border-chip)" }
                  }
                >
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold leading-none shrink-0"
                    style={{ backgroundColor: personColor?.border ?? "var(--color-border-chip)", color: "white" }}
                  >
                    {task.assignee!.name[0]}
                  </span>
                  {task.assignee!.name}
                </span>
              )}
              {task.dueDate && !isKid && (
                <span className="text-xs text-text-muted" suppressHydrationWarning>
                  {isAdmin ? formatShortDate(task.dueDate) : relativeDateLabel(task.dueDate)}
                </span>
              )}
              {task.dueDate && isKid && relativeDateLabel(task.dueDate) === "Today" && (
                <span className="text-xs text-warm-text" suppressHydrationWarning>Today</span>
              )}
              {task.time && (
                <span className="text-xs text-text-muted">{formatTime(task.time)}</span>
              )}
              {showPriority && (
                <span
                  className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded font-medium ${
                    PRIORITY_STYLES[task.priority as Priority] ?? PRIORITY_STYLES.low
                  }`}
                >
                  {task.priority === "high" && <IconFlame size={10} />}
                  {task.priority === "low" && <IconFeather size={10} />}
                  {task.priority}
                </span>
              )}
              {showBell && (
                <span className="inline-flex items-center text-accent-hover">
                  <IconBell size={12} aria-hidden="true" />
                  <span className="sr-only">Reminder set</span>
                </span>
              )}
            </div>
          )
        })()}

        {/* Expanded note */}
        {hasNote && isExpanded && (
          <div className="pl-11 pr-4 pb-3 text-sm text-text-secondary leading-relaxed">
            <ReactMarkdown
              components={{
                p:          ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                strong:     ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                em:         ({ children }) => <em>{children}</em>,
                a:          ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2 hover:text-accent-hover">{children}</a>,
                ul:         ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
                ol:         ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
                li:         ({ children }) => <li>{children}</li>,
                code:       ({ children }) => <code className="bg-surface px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                h1:         ({ children }) => <h1 className="font-serif text-base font-bold text-foreground mb-1">{children}</h1>,
                h2:         ({ children }) => <h2 className="font-serif text-sm font-bold text-foreground mb-1">{children}</h2>,
                h3:         ({ children }) => <h3 className="text-sm font-semibold text-foreground mb-1">{children}</h3>,
                h4:         ({ children }) => <h4 className="text-sm font-medium text-foreground mb-0.5">{children}</h4>,
                h5:         ({ children }) => <h5 className="text-sm font-medium text-text-secondary mb-0.5">{children}</h5>,
                h6:         ({ children }) => <h6 className="text-sm text-text-secondary mb-0.5">{children}</h6>,
                blockquote: ({ children }) => <blockquote className="border-l-2 border-border-card pl-3 italic text-text-muted my-1.5">{children}</blockquote>,
                hr:         () => <hr className="my-2 border-border-subtle" />,
              }}
            >
              {task.notes!}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {isModalOpen && createPortal(
        <TaskEditModal
          task={task}
          people={people}
          projects={projects}
          onClose={() => {
            setIsModalOpen(false)
            requestAnimationFrame(() => editTriggerRef.current?.focus())
          }}
        />,
        document.body
      )}
    </li>
  )
}
