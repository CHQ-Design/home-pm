"use server"

import { prisma } from "@/lib/prisma"
import { requireAssignedOrAdmin, getSessionUser, getSessionPersonId, verifyBelongsToHousehold } from "@/lib/require-auth"
import { parseReminder, parseId, parseTime, parseDate, TIME_RE } from "@/lib/parse"
import { revalidatePath } from "next/cache"

const VALID_UNITS = ["day", "week", "month", "year", "weekday"] as const
type Unit = typeof VALID_UNITS[number]



function computeNextDue(from: Date, value: number, unit: Unit): Date {
  const d = new Date(from)
  switch (unit) {
    case "day":  d.setDate(d.getDate() + value); break
    case "week": d.setDate(d.getDate() + value * 7); break
    case "month": {
      const day = d.getDate()
      d.setDate(1)
      d.setMonth(d.getMonth() + value)
      d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
      break
    }
    case "year": {
      const day = d.getDate()
      d.setDate(1)
      d.setFullYear(d.getFullYear() + value)
      d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
      break
    }
    case "weekday":
      for (let i = 0; i < value; i++) {
        d.setDate(d.getDate() + 1)
        if (d.getDay() === 6) d.setDate(d.getDate() + 2) // Sat → Mon
        if (d.getDay() === 0) d.setDate(d.getDate() + 1) // Sun → Mon
      }
      break
  }
  return d
}

export async function addRecurringTask(formData: FormData) {
  const [sessionUser, sessionPersonId] = await Promise.all([getSessionUser(), getSessionPersonId()])
  if (!sessionUser) throw new Error("Not authenticated")
  const { role, householdId } = sessionUser
  const isAdmin = role === "admin"
  if (!isAdmin && !sessionPersonId) return

  const title = ((formData.get("title") as string) ?? "").trim()
  if (!title) return
  if (title.length > 500) return { error: "Title is too long" }

  const cadence = (formData.get("cadence") as string) ?? ""
  const [ivStr, iu] = cadence.split("|")
  const intervalValue = Number(ivStr)
  const intervalUnit = iu
  if (!intervalValue || !VALID_UNITS.includes(intervalUnit as Unit)) return { error: "Invalid cadence" }

  const nextDue = parseDate(formData.get("nextDue") as string)
  if (!nextDue) return { error: "Invalid date" }

  const notes = ((formData.get("notes") as string) ?? "").trim() || null
  if (notes && notes.length > 10000) return { error: "Notes are too long" }

  const reminderRaw = parseReminder(formData.get("reminderMinutesBefore") as string | null)

  const [assigneeId, projectId] = isAdmin
    ? await Promise.all([
        verifyBelongsToHousehold("person", parseId(formData.get("assigneeId") as string), householdId),
        verifyBelongsToHousehold("project", parseId(formData.get("projectId") as string), householdId),
      ])
    : [sessionPersonId, null]

  const reminderMinutesBefore = reminderRaw != null && assigneeId != null ? reminderRaw : null

  await prisma.recurringTask.create({
    data: {
      title,
      notes,
      time: parseTime(formData.get("time") as string | null),
      intervalValue,
      intervalUnit,
      nextDue,
      assigneeId,
      projectId,
      reminderMinutesBefore,
      householdId,
    },
  })
  revalidatePath("/", "layout")
}

export async function completeRecurringTask(id: number) {
  const task = await prisma.recurringTask.findUnique({ where: { id } })
  if (!task) return
  await requireAssignedOrAdmin(task.assigneeId, task.householdId)

  const now = new Date()
  const nextDue = computeNextDue(task.nextDue, task.intervalValue, task.intervalUnit as Unit)

  await prisma.recurringTask.update({
    where: { id },
    data: { lastCompleted: now, nextDue, notifiedAt: null },
  })
  revalidatePath("/", "layout")
}

export async function updateRecurringTask(
  id: number,
  data: {
    title?: string
    notes?: string | null
    time?: string | null
    intervalValue?: number
    intervalUnit?: string
    nextDue?: Date
    assigneeId?: number | null
    projectId?: number | null
    reminderMinutesBefore?: number | null
  }
) {
  const sessionUser = await getSessionUser()
  if (sessionUser?.role !== "admin") throw new Error("Not authorized")
  const { householdId } = sessionUser

  // Build update from only whitelisted fields
  const update: {
    title?: string; notes?: string | null; time?: string | null; intervalValue?: number
    intervalUnit?: string; nextDue?: Date; assigneeId?: number | null
    projectId?: number | null; reminderMinutesBefore?: number | null; notifiedAt?: Date | null
  } = {}
  if (data.title !== undefined) {
    const t = data.title.trim()
    if (!t) return
    if (t.length > 500) return { error: "Title is too long" }
    update.title = t
  }
  if (data.notes !== undefined) update.notes = data.notes
  if (data.time !== undefined) update.time = (data.time && TIME_RE.test(data.time)) ? data.time : null
  if (data.intervalValue !== undefined) {
    if (!Number.isInteger(data.intervalValue) || data.intervalValue < 1) return
    update.intervalValue = data.intervalValue
  }
  if (data.intervalUnit !== undefined) {
    if (!VALID_UNITS.includes(data.intervalUnit as Unit)) return
    update.intervalUnit = data.intervalUnit
  }
  if (data.nextDue !== undefined) update.nextDue = data.nextDue
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
  if (update.reminderMinutesBefore != null) {
    const current = await prisma.recurringTask.findUnique({ where: { id, householdId }, select: { assigneeId: true } })
    const finalAssignee = "assigneeId" in update ? update.assigneeId : current?.assigneeId
    if (!finalAssignee) update.reminderMinutesBefore = null
  }
  await prisma.recurringTask.update({ where: { id, householdId }, data: update })
  revalidatePath("/", "layout")
}

export async function deleteRecurringTask(id: number) {
  const sessionUser = await getSessionUser()
  if (sessionUser?.role !== "admin") throw new Error("Not authorized")
  await prisma.recurringTask.delete({ where: { id, householdId: sessionUser.householdId } })
  revalidatePath("/", "layout")
}
