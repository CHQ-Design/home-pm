import { timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { webpush } from "@/lib/web-push"

export const dynamic = "force-dynamic"

function computeNotifyAt(dueDate: Date, time: string | null, minutesBefore: number): Date {
  const [h, m] = (time ?? "00:00").split(":").map(Number)
  const due = new Date(dueDate)
  due.setUTCHours(h, m, 0, 0)
  return new Date(due.getTime() - minutesBefore * 60 * 1000)
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const provided = request.headers.get("authorization") ?? ""
  const expected = `Bearer ${secret ?? ""}`
  const secretsMatch = secret &&
    provided.length === expected.length &&
    timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  if (!secretsMatch) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const windowStart = new Date(now.getTime() - 60 * 60 * 1000)

  const [tasks, routines] = await Promise.all([
    prisma.task.findMany({
      where: { completed: false, reminderMinutesBefore: { not: null }, notifiedAt: null },
      select: {
        id: true, title: true, dueDate: true, time: true, reminderMinutesBefore: true,
        assignee: { select: { email: true } },
      },
    }),
    prisma.recurringTask.findMany({
      where: { reminderMinutesBefore: { not: null }, notifiedAt: null },
      select: {
        id: true, title: true, nextDue: true, time: true, reminderMinutesBefore: true,
        assignee: { select: { email: true } },
      },
    }),
  ])

  const byEmail = new Map<string, string[]>()
  const taskIds: number[] = []
  const routineIds: number[] = []

  for (const task of tasks) {
    if (!task.dueDate) continue
    const fireAt = computeNotifyAt(task.dueDate, task.time, task.reminderMinutesBefore!)
    if (fireAt < windowStart || fireAt > now) continue
    const email = task.assignee?.email?.toLowerCase()
    if (!email) continue
    taskIds.push(task.id)
    const list = byEmail.get(email) ?? []
    list.push(task.title)
    byEmail.set(email, list)
  }

  for (const routine of routines) {
    const fireAt = computeNotifyAt(routine.nextDue, routine.time, routine.reminderMinutesBefore!)
    if (fireAt < windowStart || fireAt > now) continue
    const email = routine.assignee?.email?.toLowerCase()
    if (!email) continue
    routineIds.push(routine.id)
    const list = byEmail.get(email) ?? []
    list.push(routine.title)
    byEmail.set(email, list)
  }

  // Mark as notified before sending so a slow send can't double-fire
  if (taskIds.length > 0) {
    await prisma.task.updateMany({ where: { id: { in: taskIds } }, data: { notifiedAt: now } })
  }
  if (routineIds.length > 0) {
    await prisma.recurringTask.updateMany({ where: { id: { in: routineIds } }, data: { notifiedAt: now } })
  }

  if (byEmail.size === 0) return NextResponse.json({ sent: 0 })

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userEmail: { in: Array.from(byEmail.keys()) } },
  })

  let sent = 0
  await Promise.allSettled(
    subscriptions.map(async sub => {
      const titles = byEmail.get(sub.userEmail)
      if (!titles?.length) return
      const body = titles.length === 1 ? titles[0] : `${titles[0]} + ${titles.length - 1} more`
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: "Toft", body, url: "/" })
      ).then(() => { sent++ }).catch(async err => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } })
        }
      })
    })
  )

  return NextResponse.json({ sent, tasks: taskIds.length, routines: routineIds.length })
}
