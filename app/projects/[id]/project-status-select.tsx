"use client"

import { useState } from "react"
import { updateProject } from "../actions"

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
    <select
      value={status}
      disabled={isPending}
      onChange={e => handleChange(e.target.value)}
      className={`text-xs bg-surface border border-border-card rounded-full px-2 py-0.5 text-text-hover outline-none focus:border-accent transition-opacity ${
        isPending ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <option value="active">Active</option>
      <option value="paused">Paused</option>
      <option value="done">Done</option>
    </select>
  )
}
