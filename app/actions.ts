"use server"

import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/require-auth"
import { revalidatePath } from "next/cache"

const VALID_PRIORITIES = ["high", "medium", "low"] as const
type Priority = typeof VALID_PRIORITIES[number]

function parsePriority(raw: unknown): Priority {
  return VALID_PRIORITIES.includes(raw as Priority) ? (raw as Priority) : "medium"
}

function parseDate(raw: string | null): Date | null {
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

function parseId(raw: string | null): number | null {
  if (!raw) return null
  const n = parseInt(raw, 10)
  return isNaN(n) || n <= 0 ? null : n
}

export async function addTask(formData: FormData) {
  await requireRole("admin")
  const title = ((formData.get("title") as string) ?? "").trim()
  if (!title) return
  const notes = (formData.get("notes") as string | null)?.trim() || null
  const priority = parsePriority(formData.get("priority"))

  await prisma.task.create({
    data: {
      title,
      notes,
      dueDate: parseDate(formData.get("dueDate") as string),
      priority,
      assigneeId: parseId(formData.get("assigneeId") as string),
      projectId: parseId(formData.get("projectId") as string),
    },
  })
  revalidatePath("/", "layout")
}

// Members can toggle task completion — intentionally no requireRole here
export async function toggleTask(id: number) {
  const task = await prisma.task.findUniqueOrThrow({ where: { id } })
  await prisma.task.update({
    where: { id },
    data: {
      completed: !task.completed,
      completedAt: !task.completed ? new Date() : null,
    },
  })
  revalidatePath("/", "layout")
}

export async function deleteTask(id: number) {
  await requireRole("admin")
  await prisma.task.delete({ where: { id } })
  revalidatePath("/", "layout")
}

export async function updateTask(
  id: number,
  data: {
    title?: string
    notes?: string | null
    dueDate?: Date | null
    priority?: Priority
    assigneeId?: number | null
    projectId?: number | null
    reminderSet?: boolean
  }
) {
  await requireRole("admin")
  if (data.priority !== undefined) {
    data.priority = parsePriority(data.priority)
  }
  await prisma.task.update({ where: { id }, data })
  revalidatePath("/", "layout")
}

export async function toggleReminder(id: number) {
  await requireRole("admin")
  const task = await prisma.task.findUniqueOrThrow({ where: { id } })
  await prisma.task.update({ where: { id }, data: { reminderSet: !task.reminderSet } })
  revalidatePath("/", "layout")
}

export async function addPerson(formData: FormData) {
  await requireRole("admin")
  const name = ((formData.get("name") as string) ?? "").trim()
  if (!name) return
  await prisma.person.create({ data: { name } })
  revalidatePath("/", "layout")
}

export async function deletePerson(id: number, reassignToId?: number) {
  await requireRole("admin")
  await prisma.$transaction([
    prisma.task.updateMany({
      where: { assigneeId: id },
      data: { assigneeId: reassignToId ?? null },
    }),
    prisma.person.delete({ where: { id } }),
  ])
  revalidatePath("/", "layout")
}
