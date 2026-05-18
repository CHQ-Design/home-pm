"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import type { Person, Project, Prisma } from "@prisma/client"
import { IconBell, IconBellOff, IconFeather, IconFlame, IconPencilMinus } from "@tabler/icons-react"
import { toggleTask, toggleReminder, updateTask } from "./actions"
import TaskEditModal from "./task-edit-modal"
import { todayLocal, utcDateStr, formatTime } from "@/lib/dates"
import { getPersonColor } from "@/lib/person-colors"
import { playCompletionTone } from "@/lib/sounds"

type Task = Prisma.TaskGetPayload<{ include: { assignee: true; project: true } }>
type Priority = "high" | "medium" | "low"

const PRIORITY_STYLES: Record<Priority, string> = {
  high: "bg-[#C8922A]/20 text-[#8A6E4B]",
  medium: "",
  low: "bg-[#EDE6D8] text-[#8C7D6A] border border-[#C8BFAD]",
}

const PARTICLE_ANGLES = [0, 60, 120, 180, 240, 300]

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })
}

function relativeDateLabel(date: Date): string {
  const today = todayLocal()
  const dateStr = utcDateStr(date)
  const diff = Math.round((new Date(dateStr).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return "Overdue"
  if (diff === 0) return "Today"
  if (diff === 1) return "Tomorrow"
  return `In ${diff} days`
}

export default function TaskItem({ task, people, projects, isAdmin, sessionPersonId }: { task: Task; people: Person[]; projects: Project[]; isAdmin: boolean; sessionPersonId: number | null }) {
  const canToggle = isAdmin || task.assigneeId === sessionPersonId
  const personColor = task.assigneeId != null
    ? getPersonColor(people, task.assigneeId)
    : null
  const [isInlineEditing, setIsInlineEditing] = useState(false)
  const [inlineTitle, setInlineTitle] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showParticles, setShowParticles] = useState(false)
  const [justCompleted, setJustCompleted] = useState(false)
  const [bellRinging, setBellRinging] = useState(false)
  const [announcement, setAnnouncement] = useState("")
  const prevCompleted = useRef(task.completed)

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

  async function handleBell() {
    if (!task.reminderSet) {
      setBellRinging(true)
      setTimeout(() => setBellRinging(false), 400)
    }
    await toggleReminder(task.id)
  }

  return (
    <li className="group">
      <span className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</span>
      <div
        className="relative rounded-md hover:bg-[#F0E9DC] active:bg-[rgba(200,146,42,0.07)] border-l-[3px] transition-colors"
        style={{ borderLeftColor: personColor?.border ?? "transparent" }}
      >
        {/* Title row */}
        <div className="flex items-center gap-2 min-h-[44px]">
          {/* Checkbox with 44px touch target */}
          <label className={`shrink-0 flex items-center justify-center min-h-[44px] min-w-[44px] relative ${canToggle ? "cursor-pointer" : "cursor-default"}`}>
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
                  playCompletionTone(personIndex)
                }
                toggleTask(task.id)
              }}
              disabled={!canToggle}
              aria-label={task.title}
              className="peer sr-only"
            />
            <span
              className={`
                h-4 w-4 rounded border flex items-center justify-center shrink-0
                transition-all duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]
                ${task.completed
                  ? "bg-[#6B7A5A] border-[#6B7A5A] scale-110"
                  : "bg-transparent border-[#C8BFAD] scale-100 peer-focus-visible:border-accent"
                }
              `}
            >
              {task.completed && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>

            {/* Particle burst + star pop */}
            {showParticles && (
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
                {PARTICLE_ANGLES.map(angle => (
                  <span
                    key={angle}
                    className="absolute h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor: personColor?.border ?? "#6B7A5A",
                      ["--angle" as string]: `${angle}deg`,
                      animation: "particle-burst 550ms cubic-bezier(0.22,1,0.36,1) forwards",
                    }}
                  />
                ))}
                <span
                  className="absolute text-base font-bold select-none"
                  style={{
                    color: personColor?.border ?? "#6B7A5A",
                    animation: "star-pop 700ms ease-out forwards",
                  }}
                >
                  ★
                </span>
              </span>
            )}
          </label>

          {isInlineEditing ? (
            <input
              value={inlineTitle}
              onChange={e => setInlineTitle(e.target.value)}
              onBlur={saveInline}
              onKeyDown={e => {
                if (e.key === "Enter") saveInline()
                if (e.key === "Escape") setIsInlineEditing(false)
              }}
              className="flex-1 text-base font-medium border-b border-accent outline-none bg-transparent py-0.5 text-[#3A3228]"
              autoFocus
            />
          ) : (
            <span
              onClick={openInline}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openInline() } }}
              role={isAdmin && !task.completed ? "button" : undefined}
              tabIndex={isAdmin && !task.completed ? 0 : -1}
              className={`relative flex-1 text-base font-medium ${
                task.completed
                  ? "text-[#A09080]"
                  : "cursor-pointer text-[#3A3228] hover:text-[#8A6E4B] focus-visible:outline-none focus-visible:text-[#8A6E4B]"
              }`}
            >
              {task.title}
              {task.completed && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1/2 h-px bg-[#C8BFAD] -translate-y-1/2"
                  style={justCompleted
                    ? { animation: "strikethrough 350ms ease-out 80ms both" }
                    : { width: "100%" }}
                />
              )}
            </span>
          )}

          {/* Bell and edit — admin only */}
          {isAdmin && <>
            <button
              onClick={handleBell}
              className={`flex items-center justify-center min-h-[44px] min-w-[44px] text-sm leading-none shrink-0 transition-colors ${
                task.reminderSet
                  ? "text-accent"
                  : "text-[#B5A898] group-hover:text-[#6B5E52]"
              }`}
              aria-label={task.reminderSet ? "Edit reminder" : "Add reminder"}
              style={bellRinging ? { animation: "bell-ring 300ms cubic-bezier(0.34,1.56,0.64,1) forwards" } : undefined}
            >
              {task.reminderSet ? <IconBell size={16} /> : <IconBellOff size={16} />}
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center min-h-[44px] min-w-[44px] text-[#B5A898] text-sm leading-none shrink-0 group-hover:text-[#6B5E52] transition-colors"
              aria-label="Edit thing"
            >
              <IconPencilMinus size={16} aria-hidden="true" />
            </button>
          </>}
        </div>

        {/* Metadata row — shown below title, indented to align with title text */}
        {(() => {
          const showAssigneeChip = task.assignee && (isAdmin || task.assigneeId !== sessionPersonId)
          const showPriority = isAdmin && task.priority !== "medium"
          const showProject = isAdmin && task.project
          if (isInlineEditing || (!showAssigneeChip && !task.dueDate && !showPriority && !showProject)) return null
          return (
            <div className="flex flex-wrap gap-1.5 pl-11 pb-2">
              {showProject && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                  {task.project!.name}
                </span>
              )}
              {showAssigneeChip && (
                <span
                  className="text-xs pl-1 pr-2 py-0.5 rounded-full border flex items-center gap-1"
                  style={personColor
                    ? { backgroundColor: personColor.bg, color: personColor.text, borderColor: personColor.border }
                    : { backgroundColor: "#EDE6D8", color: "#8C7D6A", borderColor: "#C8BFAD" }
                  }
                >
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold leading-none shrink-0"
                    style={{ backgroundColor: personColor?.border ?? "#C8BFAD", color: "white" }}
                  >
                    {task.assignee!.name[0]}
                  </span>
                  {task.assignee!.name}
                </span>
              )}
              {task.dueDate && (
                <span className="text-xs text-[#A09080]" suppressHydrationWarning>
                  {isAdmin ? formatDate(task.dueDate) : relativeDateLabel(task.dueDate)}
                </span>
              )}
              {task.time && (
                <span className="text-xs text-[#A09080]">{formatTime(task.time)}</span>
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
            </div>
          )
        })()}
      </div>

      {isModalOpen && createPortal(
        <TaskEditModal
          task={task}
          people={people}
          projects={projects}
          onClose={() => setIsModalOpen(false)}
        />,
        document.body
      )}
    </li>
  )
}
