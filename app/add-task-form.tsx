"use client"

import { useEffect, useRef, useState } from "react"
import type { Person, Project } from "@prisma/client"
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react"
import { addTask } from "./actions"
import { inputClass } from "@/lib/styles"
import DatePicker from "./date-picker"
import TimePicker from "./time-picker"
import CustomSelect from "./custom-select"

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
  const [time, setTime] = useState("")
  const [priority, setPriority] = useState("medium")
  const [assigneeId, setAssigneeId] = useState("")
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState("")
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
    setTime("")
    setPriority("medium")
    setAssigneeId("")
    setSelectedProjectId("")
    setReminderMinutesBefore("")
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
            <div className="flex-1">
              <input type="hidden" name="dueDate" value={dueDate} />
              <DatePicker value={dueDate} onChange={setDueDate} />
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <label className="text-xs text-[#8C7D6A] shrink-0">Time</label>
            <TimePicker value={time} onChange={setTime} name="time" />
          </div>
          {dueDate && (
            <div className="flex gap-3 items-center">
              <label className="text-xs text-[#8C7D6A] shrink-0">Remind me</label>
              <div className="flex-1">
                <CustomSelect
                  name="reminderMinutesBefore"
                  value={reminderMinutesBefore}
                  onChange={setReminderMinutesBefore}
                  options={[
                    { label: "No reminder", value: "" },
                    { label: "At the time", value: "0" },
                    { label: "30 minutes before", value: "30" },
                    { label: "1 hour before", value: "60" },
                    { label: "1 day before", value: "1440" },
                  ]}
                  aria-label="Reminder"
                />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-[#8C7D6A] mb-1">Priority</label>
              <CustomSelect
                name="priority"
                value={priority}
                onChange={setPriority}
                options={[{ label: "High", value: "high" }, { label: "Medium", value: "medium" }, { label: "Low", value: "low" }]}
                aria-label="Priority"
              />
            </div>
            {isAdmin && people.length > 0 && (
              <div>
                <label className="block text-xs text-[#8C7D6A] mb-1">Assignee</label>
                <CustomSelect
                  name="assigneeId"
                  value={assigneeId}
                  onChange={setAssigneeId}
                  options={[{ label: "Unassigned", value: "" }, ...people.map(p => ({ label: p.name, value: String(p.id) }))]}
                  aria-label="Assignee"
                />
              </div>
            )}
            {isAdmin && !projectId && projects && projects.length > 0 && (
              <div>
                <label className="block text-xs text-[#8C7D6A] mb-1">Project</label>
                <CustomSelect
                  name="projectId"
                  value={selectedProjectId}
                  onChange={setSelectedProjectId}
                  options={[{ label: "No project", value: "" }, ...projects.map(p => ({ label: p.name, value: String(p.id) }))]}
                  aria-label="Project"
                />
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
