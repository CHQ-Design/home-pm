"use server"

import { prisma } from "@/lib/prisma"
import { requireRole, requireAssignedOrAdmin } from "@/lib/require-auth"
import { revalidatePath } from "next/cache"

const VALID_UNITS = ["day", "week", "month", "year"] as const
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
  }
  return d
}

export async function addRecurringTask(formData: FormData) {
  await requireRole("admin")
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

  await prisma.recurringTask.create({
    data: {
      title,
      notes,
      intervalValue,
      intervalUnit,
      nextDue,
      assigneeId: parseId(formData.get("assigneeId") as string),
      projectId: parseId(formData.get("projectId") as string),
    },
  })
  revalidatePath("/", "layout")
}

export async function completeRecurringTask(id: number) {
  const task = await prisma.recurringTask.findUnique({ where: { id } })
  await requireAssignedOrAdmin(task?.assigneeId ?? null)
  if (!task) return

  const now = new Date()
  const nextDue = computeNextDue(now, task.intervalValue, task.intervalUnit as Unit)

  await prisma.recurringTask.update({
    where: { id },
    data: { lastCompleted: now, nextDue },
  })
  revalidatePath("/", "layout")
}

export async function updateRecurringTask(
  id: number,
  data: {
    title?: string
    notes?: string | null
    intervalValue?: number
    intervalUnit?: string
    nextDue?: Date
    assigneeId?: number | null
    projectId?: number | null
  }
) {
  await requireRole("admin")
  if (data.intervalUnit && !VALID_UNITS.includes(data.intervalUnit as Unit)) return
  await prisma.recurringTask.update({ where: { id }, data })
  revalidatePath("/", "layout")
}

export async function deleteRecurringTask(id: number) {
  await requireRole("admin")
  await prisma.recurringTask.delete({ where: { id } })
  revalidatePath("/", "layout")
}
