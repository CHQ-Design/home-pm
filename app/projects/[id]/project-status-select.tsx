"use client"

import { updateProject } from "../actions"

export default function ProjectStatusSelect({
  projectId,
  status,
}: {
  projectId: number
  status: string
}) {
  return (
    <select
      value={status}
      onChange={async e => {
        await updateProject(projectId, { status: e.target.value })
      }}
      className="text-xs bg-[#EDE6D8] border border-[#D4C9B5] rounded-full px-2 py-0.5 text-[#6B5E52] outline-none focus:border-accent cursor-pointer"
    >
      <option value="active">Active</option>
      <option value="paused">Paused</option>
      <option value="done">Done</option>
    </select>
  )
}
