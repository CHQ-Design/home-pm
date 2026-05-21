"use server"

import { prisma } from "@/lib/prisma"
import { requireAssignedOrAdmin, getSessionUser, getSessionPersonId, verifyBelongsToHousehold } from "@/lib/require-auth"
import { revalidatePath } from "next/cache"
import { parseReminder, parseId, parseTime, parseDate, TIME_RE, EMAIL_RE } from "@/lib/parse"

function localYmd(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("sv", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date)
}

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
    : [await verifyBelongsToHousehold("person", sessionPersonId, householdId), null]

  const dueDate = parseDate(formData.get("dueDate") as string)
  const reminderRaw = parseReminder(formData.get("reminderMinutesBefore") as string | null)
  const reminderMinutesBefore = reminderRaw != null && assigneeId != null && dueDate != null ? reminderRaw : null

  await prisma.task.create({
    data: {
      title,
      notes,
      dueDate,
      time: parseTime(formData.get("time") as string | null),
      priority,
      assigneeId,
      projectId,
      reminderMinutesBefore,
      householdId,
    },
  })
  revalidatePath("/", "layout")
}

export async function toggleTask(id: number) {
  const [sessionUser, sessionPersonId] = await Promise.all([getSessionUser(), getSessionPersonId()])
  if (!sessionUser) throw new Error("Not authenticated")
  const task = await prisma.task.findFirst({ where: { id, householdId: sessionUser.householdId } })
  if (!task) return
  const canToggle = sessionUser.role === "admin" || task.assigneeId === sessionPersonId
  if (!canToggle) throw new Error("Not authorized")
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
      const linkedUser = person.email
        ? await prisma.user.findUnique({ where: { email: person.email.toLowerCase() }, select: { timezone: true } })
        : null
      const tz = linkedUser?.timezone ?? "America/Los_Angeles"
      const now = new Date()
      const today     = localYmd(now, tz)
      const yesterday = localYmd(new Date(Date.now() - 86400000), tz)
      const last      = person.lastStreakDate ? localYmd(person.lastStreakDate, tz) : null
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
          data: { streakCount, lastStreakDate: now },
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
  const { householdId } = sessionUser

  // Build update from only whitelisted fields — never spread client data into Prisma
  const update: {
    title?: string; notes?: string | null; dueDate?: Date | null; time?: string | null
    priority?: string; assigneeId?: number | null; projectId?: number | null
    reminderMinutesBefore?: number | null; notifiedAt?: Date | null
  } = {}
  if (data.title !== undefined) {
    const t = data.title.trim()
    if (!t) return
    if (t.length > 500) return { error: "Title is too long" }
    update.title = t
  }
  if (data.notes !== undefined) update.notes = data.notes
  if (data.dueDate !== undefined) update.dueDate = data.dueDate
  if (data.time !== undefined) update.time = (data.time && TIME_RE.test(data.time)) ? data.time : null
  if (data.priority !== undefined) update.priority = parsePriority(data.priority)
  if (data.reminderMinutesBefore !== undefined) {
    const r = data.reminderMinutesBefore
    update.reminderMinutesBefore = (r !== null && Number.isInteger(r) && r >= 0) ? r : null
    update.notifiedAt = null
  }
  if (data.assigneeId !== undefined) {
    update.assigneeId = data.assigneeId !== null
      ? await verifyBelongsToHousehold("person", data.assigneeId, householdId)
      : null
  }
  if (data.projectId !== undefined) {
    update.projectId = data.projectId !== null
      ? await verifyBelongsToHousehold("project", data.projectId, householdId)
      : null
  }
  if (update.reminderMinutesBefore != null || "assigneeId" in update || "dueDate" in update) {
    const current = await prisma.task.findUnique({ where: { id, householdId }, select: { assigneeId: true, dueDate: true, reminderMinutesBefore: true } })
    const finalAssignee = "assigneeId" in update ? update.assigneeId : current?.assigneeId
    const finalDue = "dueDate" in update ? update.dueDate : current?.dueDate
    const effectiveReminder = update.reminderMinutesBefore !== undefined ? update.reminderMinutesBefore : current?.reminderMinutesBefore
    if (effectiveReminder != null && (!finalAssignee || !finalDue)) update.reminderMinutesBefore = null
  }
  await prisma.task.update({ where: { id, householdId }, data: update })
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
  const update: { email?: string | null; isKid?: boolean } = {}
  if (data.isKid !== undefined) update.isKid = !!data.isKid
  if (data.email !== undefined) {
    const email = typeof data.email === "string" ? (data.email.toLowerCase() || null) : data.email
    if (email) {
      if (!EMAIL_RE.test(email)) return { error: "Invalid email address" }
      const matching = await prisma.user.findFirst({
        where: { email, householdId: sessionUser.householdId },
        select: { id: true },
      })
      if (!matching) return { error: "That email isn't a member of this household yet — invite them first." }
    }
    update.email = email
  }
  await prisma.person.update({ where: { id, householdId: sessionUser.householdId }, data: update })
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
    prisma.recurringTask.updateMany({
      where: { assigneeId: id, householdId },
      data: { assigneeId: reassignToId ?? null },
    }),
    prisma.person.delete({ where: { id, householdId } }),
  ])
  revalidatePath("/", "layout")
}
