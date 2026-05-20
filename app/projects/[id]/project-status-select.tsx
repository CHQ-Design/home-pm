"use client"

import { useState } from "react"
import { updateProject } from "../actions"
import CustomSelect from "../../custom-select"

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "done", label: "Done" },
]

export default function ProjectStatusSelect({
  projectId,
  status,
}: {
  projectId: number
  status: string
}) {
  const [isPending, setIsPending] = useState(false)

  async function handleChange(value: string) {
    setIsPending(true)
    try {
      await updateProject(projectId, { status: value as "active" | "paused" | "done" })
    } catch (err) {
      console.error("Failed to update project status", err)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className={`w-28 ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
      <CustomSelect
        value={status}
        onChange={handleChange}
        options={STATUS_OPTIONS}
        aria-label="Project status"
      />
    </div>
  )
}
