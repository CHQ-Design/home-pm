"use server"

import { prisma } from "@/lib/prisma"
import { requireAssignedOrAdmin, getSessionUser, getSessionPersonId } from "@/lib/require-auth"
import { revalidatePath } from "next/cache"
import { todayUTC } from "@/lib/dates"
import { parseReminder } from "@/lib/parse"

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
  const [sessionUser, sessionPersonId] = await Promise.all([getSessionUser(), getSessionPersonId()])
  if (!sessionUser) throw new Error("Not authenticated")
  const { role, householdId } = sessionUser
  const isAdmin = role === "admin"
  if (!isAdmin && !sessionPersonId) {
    return { error: "Your account isn't linked to a person yet. Ask your admin." }
  }

  const title = ((formData.get("title") as string) ?? "").trim()
  if (!title) return
  const notes = (formData.get("notes") as string | null)?.trim() || null
  const priority = parsePriority(formData.get("priority"))

  await prisma.task.create({
    data: {
      title,
      notes,
      dueDate: parseDate(formData.get("dueDate") as string),
      time: (formData.get("time") as string | null) || null,
      priority,
      assigneeId: isAdmin ? parseId(formData.get("assigneeId") as string) : sessionPersonId,
      projectId: isAdmin ? parseId(formData.get("projectId") as string) : null,
      reminderMinutesBefore: parseReminder(formData.get("reminderMinutesBefore") as string | null),
      householdId,
    },
  })
  revalidatePath("/", "layout")
}

export async function toggleTask(id: number) {
  const task = await prisma.task.findUniqueOrThrow({ where: { id } })
  await requireAssignedOrAdmin(task.assigneeId, task.householdId)
  const completing = !task.completed
  await prisma.task.update({
    where: { id },
    data: {
      completed: completing,
      completedAt: completing ? new Date() : null,
    },
  })
  if (completing && task.assigneeId) {
    const person = await prisma.person.findUnique({ where: { id: task.assigneeId } })
    if (person) {
      const today = todayUTC()
      const last = person.lastStreakDate ? person.lastStreakDate.toISOString().slice(0, 10) : null
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      let streakCount = person.streakCount
      if (last === today) {
        // already counted today — no change
      } else if (last === yesterday) {
        streakCount += 1
      } else {
        streakCount = 1
      }
      if (last !== today) {
        await prisma.person.update({
          where: { id: task.assigneeId },
          data: { streakCount, lastStreakDate: new Date() },
        })
      }
    }
  }
  revalidatePath("/", "layout")
}

export async function deleteTask(id: number) {
  const sessionUser = await getSessionUser()
  if (sessionUser?.role !== "admin") throw new Error("Not authorized")
  await prisma.task.delete({ where: { id, householdId: sessionUser.householdId } })
  revalidatePath("/", "layout")
}

export async function updateTask(
  id: number,
  data: {
    title?: string
    notes?: string | null
    dueDate?: Date | null
    time?: string | null
    priority?: Priority
    assigneeId?: number | null
    projectId?: number | null
    reminderMinutesBefore?: number | null
  }
) {
  const sessionUser = await getSessionUser()
  if (sessionUser?.role !== "admin") throw new Error("Not authorized")
  if (data.title !== undefined) {
    data.title = data.title.trim()
    if (!data.title) delete data.title
  }
  if (data.priority !== undefined) {
    data.priority = parsePriority(data.priority)
  }
  if (data.reminderMinutesBefore !== undefined && data.reminderMinutesBefore !== null) {
    const r = data.reminderMinutesBefore
    if (!Number.isInteger(r) || r < 0) data.reminderMinutesBefore = null
  }
  await prisma.task.update({ where: { id, householdId: sessionUser.householdId }, data })
  revalidatePath("/", "layout")
}

export async function addPerson(formData: FormData) {
  const sessionUser = await getSessionUser()
  if (sessionUser?.role !== "admin") throw new Error("Not authorized")
  const name = ((formData.get("name") as string) ?? "").trim()
  if (!name) return
  await prisma.person.create({ data: { name, householdId: sessionUser.householdId } })
  revalidatePath("/", "layout")
}

export async function updatePerson(id: number, data: { email?: string | null }) {
  const sessionUser = await getSessionUser()
  if (sessionUser?.role !== "admin") throw new Error("Not authorized")
  const email = typeof data.email === "string" ? (data.email.toLowerCase() || null) : data.email
  await prisma.person.update({ where: { id, householdId: sessionUser.householdId }, data: { ...data, email } })
  revalidatePath("/", "layout")
}

export async function deletePerson(id: number, reassignToId?: number) {
  const sessionUser = await getSessionUser()
  if (sessionUser?.role !== "admin") throw new Error("Not authorized")
  const { householdId } = sessionUser

  // Ensure reassignment target belongs to the same household
  if (reassignToId) {
    const target = await prisma.person.findFirst({ where: { id: reassignToId, householdId } })
    if (!target) reassignToId = undefined
  }

  await prisma.$transaction([
    prisma.task.updateMany({
      where: { assigneeId: id, householdId },
      data: { assigneeId: reassignToId ?? null },
    }),
    prisma.person.delete({ where: { id, householdId } }),
  ])
  revalidatePath("/", "layout")
}
