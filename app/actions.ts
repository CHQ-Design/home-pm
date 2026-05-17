"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function addTask(formData: FormData) {
  const title = (formData.get("title") as string).trim()
  if (!title) return
  const notes = (formData.get("notes") as string).trim() || null
  const dueDateStr = formData.get("dueDate") as string
  const priority = (formData.get("priority") as string) || "medium"

  await prisma.task.create({
    data: {
      title,
      notes,
      dueDate: dueDateStr ? new Date(dueDateStr) : null,
      priority,
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
  data: { title?: string; notes?: string | null; dueDate?: Date | null; priority?: string }
) {
  await prisma.task.update({ where: { id }, data })
  revalidatePath("/")
}
