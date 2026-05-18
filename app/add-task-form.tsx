"use client"

import { useEffect, useRef, useState } from "react"
import type { Person, Project } from "@prisma/client"
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react"
import { addTask } from "./actions"
import { inputClass, selectClass } from "@/lib/styles"

type Props = { people: Person[]; projects?: Project[]; projectId?: number; isAdmin: boolean }

const PLACEHOLDERS = [
  "Add a thing…",
  "What needs doing around here?",
  "Something for Hudson to do?",
  "Quinn's turn to help?",
  "What would make tomorrow easier?",
]

export default function AddTaskForm({ people, projects, projectId, isAdmin }: Props) {
  const [showMore, setShowMore] = useState(false)

  useEffect(() => {
    setShowMore(sessionStorage.getItem("addTaskShowMore") === "true")
  }, [])
  const [submitting, setSubmitting] = useState(false)
  const [titleError, setTitleError] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [titleValue, setTitleValue] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [placeholderVisible, setPlaceholderVisible] = useState(true)
  const [focused, setFocused] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (focused) return
    intervalRef.current = setInterval(() => {
      setPlaceholderVisible(false)
      setTimeout(() => {
        setPlaceholderIndex(i => (i + 1) % PLACEHOLDERS.length)
        setPlaceholderVisible(true)
      }, 400)
    }, 3000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [focused])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const title = (formData.get("title") as string).trim()
    if (!title) {
      setTitleError(true)
      setTimeout(() => setTitleError(false), 800)
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    const result = await addTask(formData)
    if (result?.error) {
      setSubmitError(result.error)
      setSubmitting(false)
      return
    }
    formRef.current?.reset()
    setTitleValue("")
    setDueDate("")
    setSubmitting(false)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mb-8 space-y-2">
      {projectId && <input type="hidden" name="projectId" value={projectId} />}
      <div className="flex gap-2 relative">
        <div className="relative flex-1 min-w-0">
          <input
            name="title"
            aria-label="Task title"
            value={titleValue}
            onChange={e => { setTitleValue(e.target.value); if (titleError) setTitleError(false) }}
            className={`${inputClass} bg-transparent transition-colors${titleError ? " !border-red-400" : ""}`}
            style={titleError ? { animation: "shake 0.4s ease-in-out" } : undefined}
            autoComplete="off"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          {/* Animated placeholder — only visible when input is empty and unfocused */}
          {!focused && !titleValue && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center px-3 text-sm text-[#A09080] transition-opacity duration-300"
              style={{ opacity: placeholderVisible ? 1 : 0 }}
            >
              {PLACEHOLDERS[placeholderIndex]}
            </span>
          )}
        </div>
        {!showMore && (
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-accent text-white font-medium text-sm rounded-lg hover:bg-[#556148] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Adding…" : "Add"}
          </button>
        )}
      </div>

      {submitError && (
        <p className="text-sm text-red-600 px-1">{submitError}</p>
      )}

      <button
        type="button"
        onClick={() => setShowMore(v => {
          const next = !v
          sessionStorage.setItem("addTaskShowMore", String(next))
          return next
        })}
        aria-expanded={showMore}
        className="text-sm text-[#8C7D6A] hover:text-[#3A3228] min-h-[44px] inline-flex items-center"
      >
        <span className="inline-flex items-center gap-1">
          {showMore ? <IconChevronDown size={14} aria-hidden="true" /> : <IconChevronRight size={14} aria-hidden="true" />}
          {showMore ? "fewer options" : "more options"}
        </span>
      </button>

      {showMore && (
        <div className="space-y-2 pl-1">
          <textarea
            name="notes"
            placeholder="Notes (optional)"
            rows={2}
            className={`${inputClass} resize-none`}
          />
          <div className="flex gap-3 items-center">
            <label className="text-xs text-[#8C7D6A] shrink-0">Due date</label>
            <input
              type="date"
              name="dueDate"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className={`${inputClass} [color-scheme:light]`}
            />
          </div>
          <div className="flex gap-3 items-center">
            <label className="text-xs text-[#8C7D6A] shrink-0">Time</label>
            <input
              type="time"
              name="time"
              className={`${inputClass} [color-scheme:light]`}
            />
          </div>
          {dueDate && (
            <div className="flex gap-3 items-center">
              <label className="text-xs text-[#8C7D6A] shrink-0">Remind me</label>
              <select name="reminderMinutesBefore" defaultValue="" className={`${inputClass} appearance-none`}>
                <option value="">No reminder</option>
                <option value="0">At the time</option>
                <option value="30">30 minutes before</option>
                <option value="60">1 hour before</option>
                <option value="1440">1 day before</option>
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <label className="block text-xs text-[#8C7D6A] mb-1">Priority</label>
              <select name="priority" defaultValue="medium" className={selectClass}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <IconChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute right-2.5 bottom-2.5 text-[#8C7D6A]" />
            </div>
            {isAdmin && people.length > 0 && (
              <div className="relative">
                <label className="block text-xs text-[#8C7D6A] mb-1">Assignee</label>
                <select name="assigneeId" defaultValue="" className={selectClass}>
                  <option value="">Unassigned</option>
                  {people.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <IconChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute right-2.5 bottom-2.5 text-[#8C7D6A]" />
              </div>
            )}
            {isAdmin && !projectId && projects && projects.length > 0 && (
              <div className="relative">
                <label className="block text-xs text-[#8C7D6A] mb-1">Project</label>
                <select name="projectId" defaultValue="" className={selectClass}>
                  <option value="">No project</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <IconChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute right-2.5 bottom-2.5 text-[#8C7D6A]" />
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 bg-accent text-white font-medium text-sm rounded-lg hover:bg-[#556148] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Adding…" : "Add"}
          </button>
        </div>
      )}
    </form>
  )
}
