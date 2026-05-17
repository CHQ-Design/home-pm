"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function addTask(formData: FormData) {
  const title = (formData.get("title") as string).trim()
  if (!title) return
  const notes = (formData.get("notes") as string | null)?.trim() || null
  const dueDateStr = formData.get("dueDate") as string
  const priority = (formData.get("priority") as string) || "medium"
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
    priority?: string
    assigneeId?: number | null
    reminderSet?: boolean
  }
) {
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
