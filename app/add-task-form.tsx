"use client"

import { useEffect, useRef, useState } from "react"
import type { Person, Project } from "@prisma/client"
import { addTask } from "./actions"

type Props = { people: Person[]; projects?: Project[]; projectId?: number }

const PLACEHOLDERS = [
  "Add a thing…",
  "What's your thing for today?",
  "Something for Hudson or Quinn?",
  "What are you putting off?",
  "What would make tomorrow easier?",
]

const inputClass =
  "bg-[#F2ECE2] border border-[#D4C9B5] rounded-lg px-3 py-2 text-sm text-[#3A3228] placeholder-[#A09080] outline-none focus:border-accent focus:ring-1 focus:ring-[#6B7A5A]/20"

export default function AddTaskForm({ people, projects, projectId }: Props) {
  const [showMore, setShowMore] = useState(false)

  useEffect(() => {
    setShowMore(sessionStorage.getItem("addTaskShowMore") === "true")
  }, [])
  const [submitting, setSubmitting] = useState(false)
  const [titleValue, setTitleValue] = useState("")
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
    if (!title) return
    setSubmitting(true)
    await addTask(formData)
    formRef.current?.reset()
    setTitleValue("")
    setSubmitting(false)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mb-8 space-y-2">
      {projectId && <input type="hidden" name="projectId" value={projectId} />}
      <div className="flex gap-2 relative">
        <div className="relative flex-1">
          <input
            name="title"
            value={titleValue}
            onChange={e => setTitleValue(e.target.value)}
            className={`w-full ${inputClass} bg-transparent`}
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
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-accent text-white font-medium text-sm rounded-lg hover:bg-[#556148] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Adding…" : "Add"}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setShowMore(v => {
          const next = !v
          sessionStorage.setItem("addTaskShowMore", String(next))
          return next
        })}
        aria-expanded={showMore}
        className="text-xs text-[#8C7D6A] hover:text-[#3A3228] min-h-[44px] inline-flex items-center"
      >
        {showMore ? "▾ fewer options" : "▸ more options"}
      </button>

      {showMore && (
        <div className="space-y-2 pl-1">
          <textarea
            name="notes"
            placeholder="Notes (optional)"
            rows={2}
            className={`w-full ${inputClass} resize-none`}
          />
          <div className="flex gap-2 flex-wrap">
            <input
              type="date"
              name="dueDate"
              className={`${inputClass} [color-scheme:light]`}
            />
            <select
              name="priority"
              defaultValue="medium"
              className={inputClass}
            >
              <option value="high">High priority</option>
              <option value="medium">Medium priority</option>
              <option value="low">Low priority</option>
            </select>
            {people.length > 0 && (
              <select
                name="assigneeId"
                defaultValue=""
                className={inputClass}
              >
                <option value="">Unassigned</option>
                {people.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
            {!projectId && projects && projects.length > 0 && (
              <select
                name="projectId"
                defaultValue=""
                className={inputClass}
              >
                <option value="">No project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}
    </form>
  )
}
