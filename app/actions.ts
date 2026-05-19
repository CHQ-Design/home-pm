"use server"

import { prisma } from "@/lib/prisma"
import { requireAssignedOrAdmin, getSessionUser, getSessionPersonId, verifyBelongsToHousehold } from "@/lib/require-auth"
import { revalidatePath } from "next/cache"
import { todayUTC } from "@/lib/dates"
import { parseReminder, parseId, parseTime, parseDate, TIME_RE, EMAIL_RE } from "@/lib/parse"

const VALID_PRIORITIES = ["high", "medium", "low"] as const
type Priority = typeof VALID_PRIORITIES[number]

function parsePriority(raw: unknown): Priority {
  return VALID_PRIORITIES.includes(raw as Priority) ? (raw as Priority) : "medium"
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
  if (title.length > 500) return { error: "Title is too long" }
  const notes = (formData.get("notes") as string | null)?.trim() || null
  if (notes && notes.length > 10000) return { error: "Notes are too long" }
  const priority = parsePriority(formData.get("priority"))

  const [assigneeId, projectId] = isAdmin
    ? await Promise.all([
        verifyBelongsToHousehold("person", parseId(formData.get("assigneeId") as string), householdId),
        verifyBelongsToHousehold("project", parseId(formData.get("projectId") as string), householdId),
      ])
    : [sessionPersonId, null]

  await prisma.task.create({
    data: {
      title,
      notes,
      dueDate: parseDate(formData.get("dueDate") as string),
      time: parseTime(formData.get("time") as string | null),
      priority,
      assigneeId,
      projectId,
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
    else if (data.title.length > 500) return { error: "Title is too long" }
  }
  if (data.priority !== undefined) {
    data.priority = parsePriority(data.priority)
  }
  if (data.time !== undefined && data.time !== null) {
    if (!TIME_RE.test(data.time)) data.time = null
  }
  if (data.reminderMinutesBefore !== undefined && data.reminderMinutesBefore !== null) {
    const r = data.reminderMinutesBefore
    if (!Number.isInteger(r) || r < 0) data.reminderMinutesBefore = null
  }
  if (data.assigneeId !== undefined && data.assigneeId !== null) {
    data.assigneeId = await verifyBelongsToHousehold("person", data.assigneeId, sessionUser.householdId)
  }
  if (data.projectId !== undefined && data.projectId !== null) {
    data.projectId = await verifyBelongsToHousehold("project", data.projectId, sessionUser.householdId)
  }
  await prisma.task.update({ where: { id, householdId: sessionUser.householdId }, data })
  revalidatePath("/", "layout")
}

export async function addPerson(formData: FormData) {
  const sessionUser = await getSessionUser()
  if (sessionUser?.role !== "admin") throw new Error("Not authorized")
  const name = ((formData.get("name") as string) ?? "").trim()
  if (!name) return
  if (name.length > 100) return { error: "Name is too long" }
  await prisma.person.create({ data: { name, householdId: sessionUser.householdId } })
  revalidatePath("/", "layout")
}

export async function updatePerson(id: number, data: { email?: string | null; isKid?: boolean }) {
  const sessionUser = await getSessionUser()
  if (sessionUser?.role !== "admin") throw new Error("Not authorized")
  const email = typeof data.email === "string" ? (data.email.toLowerCase() || null) : data.email
  if (email && !EMAIL_RE.test(email)) return { error: "Invalid email address" }
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
