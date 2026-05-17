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
      await updateProject(projectId, { status: value })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={e => handleChange(e.target.value)}
      className={`text-xs bg-[#EDE6D8] border border-[#D4C9B5] rounded-full px-2 py-0.5 text-[#6B5E52] outline-none focus:border-accent transition-opacity ${
        isPending ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <option value="active">Active</option>
      <option value="paused">Paused</option>
      <option value="done">Done</option>
    </select>
  )
}
