"use server"

import { prisma } from "@/lib/prisma"
import { requireAssignedOrAdmin, getSessionUser, getSessionPersonId } from "@/lib/require-auth"
import { parseReminder } from "@/lib/parse"
import { revalidatePath } from "next/cache"

const VALID_UNITS = ["day", "week", "month", "year", "weekday"] as const
type Unit = typeof VALID_UNITS[number]

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

function computeNextDue(from: Date, value: number, unit: Unit): Date {
  const d = new Date(from)
  switch (unit) {
    case "day":   d.setDate(d.getDate() + value); break
    case "week":  d.setDate(d.getDate() + value * 7); break
    case "month": d.setMonth(d.getMonth() + value); break
    case "year":  d.setFullYear(d.getFullYear() + value); break
    case "weekday":
      d.setDate(d.getDate() + 1)
      if (d.getDay() === 6) d.setDate(d.getDate() + 2) // Sat → Mon
      if (d.getDay() === 0) d.setDate(d.getDate() + 1) // Sun → Mon
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

  const cadence = (formData.get("cadence") as string) ?? ""
  const [ivStr, iu] = cadence.split("|")
  const intervalValue = Number(ivStr)
  const intervalUnit = iu
  if (!intervalValue || !VALID_UNITS.includes(intervalUnit as Unit)) return

  const nextDue = parseDate(formData.get("nextDue") as string)
  if (!nextDue) return

  const notes = ((formData.get("notes") as string) ?? "").trim() || null

  const reminderMinutesBefore = parseReminder(formData.get("reminderMinutesBefore") as string | null)

  await prisma.recurringTask.create({
    data: {
      title,
      notes,
      time: (formData.get("time") as string | null) || null,
      intervalValue,
      intervalUnit,
      nextDue,
      assigneeId: isAdmin ? parseId(formData.get("assigneeId") as string) : sessionPersonId,
      projectId: isAdmin ? parseId(formData.get("projectId") as string) : null,
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
  const nextDue = computeNextDue(now, task.intervalValue, task.intervalUnit as Unit)

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
  if (data.intervalUnit && !VALID_UNITS.includes(data.intervalUnit as Unit)) return
  if (data.intervalValue !== undefined && (!Number.isInteger(data.intervalValue) || data.intervalValue < 1)) return
  if (data.reminderMinutesBefore !== undefined && data.reminderMinutesBefore !== null) {
    const r = data.reminderMinutesBefore
    if (!Number.isInteger(r) || r < 0) data.reminderMinutesBefore = null
  }
  await prisma.recurringTask.update({ where: { id, householdId: sessionUser.householdId }, data })
  revalidatePath("/", "layout")
}

export async function deleteRecurringTask(id: number) {
  const sessionUser = await getSessionUser()
  if (sessionUser?.role !== "admin") throw new Error("Not authorized")
  await prisma.recurringTask.delete({ where: { id, householdId: sessionUser.householdId } })
  revalidatePath("/", "layout")
}
