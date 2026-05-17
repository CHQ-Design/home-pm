"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

const VALID_STATUSES = ["active", "paused", "done"] as const
type Status = typeof VALID_STATUSES[number]

function parseStatus(raw: unknown): Status {
  return VALID_STATUSES.includes(raw as Status) ? (raw as Status) : "active"
}

export async function addProject(formData: FormData) {
  const name = (formData.get("name") as string).trim()
  if (!name) return
  const description = (formData.get("description") as string | null)?.trim() || null
  await prisma.project.create({ data: { name, description } })
  revalidatePath("/projects")
}

export async function updateProject(
  id: number,
  data: { name?: string; description?: string | null; status?: string }
) {
  const update = { ...data }
  if (update.status !== undefined) update.status = parseStatus(update.status)
  await prisma.project.update({ where: { id }, data: update })
  revalidatePath("/", "layout")
}

export async function deleteProject(id: number) {
  await prisma.$transaction([
    prisma.task.updateMany({ where: { projectId: id }, data: { projectId: null } }),
    prisma.project.delete({ where: { id } }),
  ])
  revalidatePath("/", "layout")
}
