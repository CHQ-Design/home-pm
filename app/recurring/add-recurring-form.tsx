"use client"

import { useRef, useState } from "react"
import type { Person, Project } from "@prisma/client"
import { addRecurringTask } from "./actions"

const CADENCES = [
  { label: "Daily",          value: "1|day" },
  { label: "Weekly",         value: "1|week" },
  { label: "Every 2 weeks",  value: "2|week" },
  { label: "Monthly",        value: "1|month" },
  { label: "Every 3 months", value: "3|month" },
  { label: "Every 6 months", value: "6|month" },
  { label: "Yearly",         value: "1|year" },
]

const inputClass =
  "w-full bg-[#F2ECE2] border border-[#D4C9B5] rounded-md px-3 py-2 text-base text-[#3A3228] placeholder-[#A09080] outline-none focus:border-accent focus:ring-1 focus:ring-[#6B7A5A]/20"

function todayString() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export default function AddRecurringForm({ people, projects }: { people: Person[]; projects: Project[] }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [showNotes, setShowNotes] = useState(false)
  const [showAssignee, setShowAssignee] = useState(false)
  const [showProject, setShowProject] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    await addRecurringTask(formData)
    formRef.current?.reset()
    setShowNotes(false)
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[#8C7D6A] mb-1">Cadence</label>
          <select name="cadence" defaultValue="1|week" className={inputClass}>
            {CADENCES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#8C7D6A] mb-1">First due</label>
          <input
            type="date"
            name="nextDue"
            defaultValue={todayString()}
            className={inputClass}
            required
          />
        </div>
      </div>

      {showNotes && (
        <textarea
          name="notes"
          placeholder="Notes (optional)"
          rows={2}
          className={`${inputClass} resize-none`}
        />
      )}

      {showAssignee && people.length > 0 && (
        <select name="assigneeId" className={inputClass}>
          <option value="">No assignee</option>
          {people.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      )}

      {showProject && projects.length > 0 && (
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
          {people.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAssignee(v => !v)}
              className={`text-xs ${showAssignee ? "text-accent" : "text-[#B5A898] hover:text-[#6B5E52]"}`}
            >
              {showAssignee ? "− Assignee" : "+ Assignee"}
            </button>
          )}
          {projects.length > 0 && (
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
