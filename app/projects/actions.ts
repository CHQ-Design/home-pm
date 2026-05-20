"use server"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/require-auth"
import { revalidatePath } from "next/cache"

const VALID_STATUSES = ["active", "paused", "done"] as const
type Status = typeof VALID_STATUSES[number]

function parseStatus(raw: unknown): Status {
  return VALID_STATUSES.includes(raw as Status) ? (raw as Status) : "active"
}

export async function addProject(formData: FormData) {
  const sessionUser = await getSessionUser()
  if (sessionUser?.role !== "admin") throw new Error("Not authorized")
  const name = ((formData.get("name") as string) ?? "").trim()
  if (!name) return
  if (name.length > 100) return { error: "Name is too long" }
  const description = (formData.get("description") as string | null)?.trim() || null
  if (description && description.length > 500) return { error: "Description is too long" }
  await prisma.project.create({ data: { name, description, householdId: sessionUser.householdId } })
  revalidatePath("/", "layout")
}

export async function updateProject(
  id: number,
  data: { name?: string; description?: string | null; status?: Status }
) {
  const sessionUser = await getSessionUser()
  if (sessionUser?.role !== "admin") throw new Error("Not authorized")
  const update: { name?: string; description?: string | null; status?: string } = {}
  if (data.name !== undefined) {
    const name = data.name.trim()
    if (!name) return
    if (name.length > 100) return { error: "Name is too long" }
    update.name = name
  }
  if (data.description !== undefined) update.description = data.description?.trim() || null
  if (data.status !== undefined) update.status = parseStatus(data.status)
  await prisma.project.update({ where: { id, householdId: sessionUser.householdId }, data: update })
  revalidatePath("/", "layout")
}

export async function deleteProject(id: number) {
  const sessionUser = await getSessionUser()
  if (sessionUser?.role !== "admin") throw new Error("Not authorized")
  const { householdId } = sessionUser
  await prisma.$transaction([
    prisma.task.updateMany({ where: { projectId: id, householdId }, data: { projectId: null } }),
    prisma.note.updateMany({ where: { projectId: id, householdId }, data: { projectId: null } }),
    prisma.recurringTask.updateMany({ where: { projectId: id, householdId }, data: { projectId: null } }),
    prisma.project.delete({ where: { id, householdId } }),
  ])
  revalidatePath("/", "layout")
}
