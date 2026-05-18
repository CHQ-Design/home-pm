"use client"

import { useRef, useState } from "react"
import type { Person, Project } from "@prisma/client"
import { addRecurringTask } from "./actions"
import { inputClass } from "@/lib/styles"

const CADENCES = [
  { label: "Mon–Fri",        value: "1|weekday" },
  { label: "Daily",          value: "1|day" },
  { label: "Weekly",         value: "1|week" },
  { label: "Every 2 weeks",  value: "2|week" },
  { label: "Monthly",        value: "1|month" },
  { label: "Every 3 months", value: "3|month" },
  { label: "Every 6 months", value: "6|month" },
  { label: "Yearly",         value: "1|year" },
]

function todayString() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export default function AddRecurringForm({ people, projects, isAdmin }: { people: Person[]; projects: Project[]; isAdmin: boolean }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [showNotes, setShowNotes] = useState(false)
  const [showTime, setShowTime] = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  const [showAssignee, setShowAssignee] = useState(false)
  const [showProject, setShowProject] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    await addRecurringTask(formData)
    formRef.current?.reset()
    setShowNotes(false)
    setShowTime(false)
    setShowReminder(false)
    setShowAssignee(false)
    setShowProject(false)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mb-8 space-y-3">
      <input
        name="title"
        placeholder="What recurs? (e.g. Pay electricity bill)"
        className={inputClass}
        autoComplete="off"
        required
      />
      <div className="flex gap-4">
        <label className="text-xs text-[#8C7D6A] shrink-0 mt-3">Cadence</label>
        <select name="cadence" defaultValue="1|week" className={inputClass}>
          {CADENCES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-4">
        <label className="text-xs text-[#8C7D6A] shrink-0 mt-3">First due</label>
        <input
          type="date"
          name="nextDue"
          defaultValue={todayString()}
          className={inputClass}
          required
        />
      </div>

      {showNotes && (
        <textarea
          name="notes"
          placeholder="Notes (optional)"
          rows={2}
          className={`${inputClass} resize-none`}
        />
      )}

      {showTime && (
        <div className="flex gap-4 items-center">
          <label className="text-xs text-[#8C7D6A] shrink-0 mt-2">Time</label>
          <input
            type="time"
            name="time"
            className={`${inputClass} [color-scheme:light]`}
          />
        </div>
      )}

      {showReminder && (
        <div className="flex gap-4 items-center">
          <label className="text-xs text-[#8C7D6A] shrink-0 mt-2">Remind me</label>
          <select name="reminderMinutesBefore" defaultValue="" className={inputClass}>
            <option value="">No reminder</option>
            <option value="0">At the time</option>
            <option value="30">30 minutes before</option>
            <option value="60">1 hour before</option>
            <option value="1440">1 day before</option>
          </select>
        </div>
      )}

      {isAdmin && showAssignee && people.length > 0 && (
        <select name="assigneeId" className={inputClass}>
          <option value="">No assignee</option>
          {people.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      )}

      {isAdmin && showProject && projects.length > 0 && (
        <select name="projectId" className={inputClass}>
          <option value="">No project</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowNotes(v => !v)}
            className={`text-xs ${showNotes ? "text-accent" : "text-[#B5A898] hover:text-[#6B5E52]"}`}
          >
            {showNotes ? "− Notes" : "+ Notes"}
          </button>
          <button
            type="button"
            onClick={() => setShowTime(v => !v)}
            className={`text-xs ${showTime ? "text-accent" : "text-[#B5A898] hover:text-[#6B5E52]"}`}
          >
            {showTime ? "− Time" : "+ Time"}
          </button>
          <button
            type="button"
            onClick={() => setShowReminder(v => !v)}
            className={`text-xs ${showReminder ? "text-accent" : "text-[#B5A898] hover:text-[#6B5E52]"}`}
          >
            {showReminder ? "− Reminder" : "+ Reminder"}
          </button>
          {isAdmin && people.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAssignee(v => !v)}
              className={`text-xs ${showAssignee ? "text-accent" : "text-[#B5A898] hover:text-[#6B5E52]"}`}
            >
              {showAssignee ? "− Assignee" : "+ Assignee"}
            </button>
          )}
          {isAdmin && projects.length > 0 && (
            <button
              type="button"
              onClick={() => setShowProject(v => !v)}
              className={`text-xs ${showProject ? "text-accent" : "text-[#B5A898] hover:text-[#6B5E52]"}`}
            >
              {showProject ? "− Project" : "+ Project"}
            </button>
          )}
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-md hover:bg-[#556148]"
        >
          Add routine
        </button>
      </div>
    </form>
  )
}
