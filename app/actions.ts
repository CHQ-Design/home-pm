"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

const VALID_PRIORITIES = ["high", "medium", "low"] as const
type Priority = typeof VALID_PRIORITIES[number]

function parsePriority(raw: unknown): Priority {
  return VALID_PRIORITIES.includes(raw as Priority) ? (raw as Priority) : "medium"
}

export async function addTask(formData: FormData) {
  const title = (formData.get("title") as string).trim()
  if (!title) return
  const notes = (formData.get("notes") as string | null)?.trim() || null
  const dueDateStr = formData.get("dueDate") as string
  const priority = parsePriority(formData.get("priority"))
  const assigneeIdStr = formData.get("assigneeId") as string

  await prisma.task.create({
    data: {
      title,
      notes,
      dueDate: dueDateStr ? new Date(dueDateStr) : null,
      priority,
      assigneeId: assigneeIdStr ? Number(assigneeIdStr) : null,
    },
  })
  revalidatePath("/")
}

export async function toggleTask(id: number) {
  const task = await prisma.task.findUniqueOrThrow({ where: { id } })
  await prisma.task.update({
    where: { id },
    data: {
      completed: !task.completed,
      completedAt: !task.completed ? new Date() : null,
    },
  })
  revalidatePath("/")
}

export async function deleteTask(id: number) {
  await prisma.task.delete({ where: { id } })
  revalidatePath("/")
}

export async function updateTask(
  id: number,
  data: {
    title?: string
    notes?: string | null
    dueDate?: Date | null
    priority?: Priority
    assigneeId?: number | null
    reminderSet?: boolean
  }
) {
  if (data.priority !== undefined) {
    data.priority = parsePriority(data.priority)
  }
  await prisma.task.update({ where: { id }, data })
  revalidatePath("/")
}

export async function toggleReminder(id: number) {
  const task = await prisma.task.findUniqueOrThrow({ where: { id } })
  await prisma.task.update({ where: { id }, data: { reminderSet: !task.reminderSet } })
  revalidatePath("/")
}

export async function addPerson(formData: FormData) {
  const name = (formData.get("name") as string).trim()
  if (!name) return
  await prisma.person.create({ data: { name } })
  revalidatePath("/")
}

export async function deletePerson(id: number, reassignToId?: number) {
  await prisma.$transaction([
    prisma.task.updateMany({
      where: { assigneeId: id },
      data: { assigneeId: reassignToId ?? null },
    }),
    prisma.person.delete({ where: { id } }),
  ])
  revalidatePath("/")
}
