"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { Person, Project } from "@prisma/client"
import { addRecurringTask } from "./actions"
import { inputClass } from "@/lib/styles"
import DatePicker from "../date-picker"
import TimePicker from "../time-picker"
import CustomSelect from "../custom-select"

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

export default function AddRecurringForm({ people, projects, isAdmin, custodyModeEnabled = false }: { people: Person[]; projects: Project[]; isAdmin: boolean; custodyModeEnabled?: boolean }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [nextDue, setNextDue] = useState(todayString())
  const [time, setTime] = useState("")
  const [cadence, setCadence] = useState("1|week")
  const [assigneeId, setAssigneeId] = useState("")
  const [projectId, setProjectId] = useState("")
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState("")
  const [custodyMode, setCustodyMode] = useState("")
  const [showNotes, setShowNotes] = useState(false)
  const [showTime, setShowTime] = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  const [showAssignee, setShowAssignee] = useState(false)
  const [showProject, setShowProject] = useState(false)
  const [showDayMode, setShowDayMode] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitError(null)
    const formData = new FormData(e.currentTarget)
    const result = await addRecurringTask(formData)
    if (result && "error" in result) {
      setSubmitError(result.error)
      return
    }
    router.refresh()
    formRef.current?.reset()
    setNextDue(todayString())
    setTime("")
    setCadence("1|week")
    setAssigneeId("")
    setProjectId("")
    setReminderMinutesBefore("")
    setCustodyMode("")
    setShowNotes(false)
    setShowTime(false)
    setShowReminder(false)
    setShowAssignee(false)
    setShowProject(false)
    setShowDayMode(false)
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
      <div className="flex gap-4 items-center">
        <label className="text-xs text-text-secondary shrink-0">Cadence</label>
        <div className="flex-1">
          <CustomSelect
            name="cadence"
            value={cadence}
            onChange={setCadence}
            options={CADENCES.map(c => ({ label: c.label, value: c.value }))}
            aria-label="Cadence"
          />
        </div>
      </div>
      <div className="flex gap-4 items-center">
        <label className="text-xs text-text-secondary shrink-0">First due</label>
        <div className="flex-1">
          <input type="hidden" name="nextDue" value={nextDue} />
          <DatePicker value={nextDue} onChange={setNextDue} />
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

      {showTime && (
        <div className="flex gap-4 items-center">
          <label className="text-xs text-text-secondary shrink-0">Time</label>
          <TimePicker value={time} onChange={setTime} name="time" />
        </div>
      )}

      {showReminder && (
        <div className="flex gap-4 items-center">
          <label className="text-xs text-text-secondary shrink-0">Remind me</label>
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

      {isAdmin && showAssignee && people.length > 0 && (
        <CustomSelect
          name="assigneeId"
          value={assigneeId}
          onChange={setAssigneeId}
          options={[{ label: "No assignee", value: "" }, ...people.map(p => ({ label: p.name, value: String(p.id) }))]}
          aria-label="Assignee"
        />
      )}

      {isAdmin && showProject && projects.length > 0 && (
        <CustomSelect
          name="projectId"
          value={projectId}
          onChange={setProjectId}
          options={[{ label: "No project", value: "" }, ...projects.map(p => ({ label: p.name, value: String(p.id) }))]}
          aria-label="Project"
        />
      )}

      {custodyModeEnabled && showDayMode && (
        <div className="flex gap-4 items-center">
          <label className="text-xs text-text-secondary shrink-0">Day mode</label>
          <div className="flex-1">
            <CustomSelect
              name="custodyMode"
              value={custodyMode}
              onChange={setCustodyMode}
              options={[
                { label: "Always show", value: "" },
                { label: "With kids only", value: "with_kids" },
                { label: "Without kids only", value: "without_kids" },
              ]}
              aria-label="Day mode"
            />
          </div>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => setShowNotes(v => !v)}
          className={`text-xs rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${showNotes ? "text-accent" : "text-text-secondary hover:text-foreground"}`}
        >
          {showNotes ? "− Notes" : "+ Notes"}
        </button>
        <button
          type="button"
          onClick={() => setShowTime(v => !v)}
          className={`text-xs rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${showTime ? "text-accent" : "text-text-secondary hover:text-foreground"}`}
        >
          {showTime ? "− Time" : "+ Time"}
        </button>
        <button
          type="button"
          onClick={() => setShowReminder(v => !v)}
          className={`text-xs rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${showReminder ? "text-accent" : "text-text-secondary hover:text-foreground"}`}
        >
          {showReminder ? "− Reminder" : "+ Reminder"}
        </button>
        {isAdmin && people.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAssignee(v => !v)}
            className={`text-xs rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${showAssignee ? "text-accent" : "text-text-secondary hover:text-foreground"}`}
          >
            {showAssignee ? "− Assignee" : "+ Assignee"}
          </button>
        )}
        {isAdmin && projects.length > 0 && (
          <button
            type="button"
            onClick={() => setShowProject(v => !v)}
            className={`text-xs rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${showProject ? "text-accent" : "text-text-secondary hover:text-foreground"}`}
          >
            {showProject ? "− Project" : "+ Project"}
          </button>
        )}
        {custodyModeEnabled && (
          <button
            type="button"
            onClick={() => setShowDayMode(v => !v)}
            className={`text-xs rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${showDayMode ? "text-accent" : "text-text-secondary hover:text-foreground"}`}
          >
            {showDayMode ? "− Day mode" : "+ Day mode"}
          </button>
        )}
      </div>
      {submitError && (
        <p className="text-sm text-red-600">{submitError}</p>
      )}
      <button
        type="submit"
        className="w-full py-2 bg-accent text-white text-sm font-medium rounded-md hover:bg-accent-hover"
      >
        Add routine
      </button>
    </form>
  )
}
