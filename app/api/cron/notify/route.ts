import { timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { webpush } from "@/lib/web-push"

export const dynamic = "force-dynamic"

// Compute the UTC instant for a given calendar date + wall-clock time in a timezone,
// then subtract the reminder lead time.
//
// dueDate is stored as midnight UTC; .toISOString().slice(0,10) gives the intended
// calendar date (e.g. "2026-05-19") independent of the viewer's locale.
// "time" is the HH:MM at which the task/routine is due, as a local wall-clock time
// in the assignee's timezone.  We convert to UTC using the "sv" locale trick:
// format a UTC epoch in the target tz, measure the offset, then correct.
function computeNotifyAt(dueDate: Date, time: string | null, minutesBefore: number, tz: string): Date {
  const dateStr = dueDate.toISOString().slice(0, 10) // e.g. "2026-05-19"
  const [h, m] = (time ?? "00:00").split(":").map(Number)
  const hh = String(h).padStart(2, "0")
  const mm = String(m).padStart(2, "0")

  // Treat the desired wall-clock time as UTC to get an approximation
  const approx = new Date(`${dateStr}T${hh}:${mm}:00Z`)

  // Find what the target timezone shows at that UTC instant
  const tzStr = new Intl.DateTimeFormat("sv", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).format(approx).replace(" ", "T") // "YYYY-MM-DDTHH:MM:SS"

  // Offset between what we want and what the tz shows
  const diff = approx.getTime() - new Date(tzStr + "Z").getTime()

  // Correct to get the actual UTC instant for the desired wall-clock time in tz
  return new Date(approx.getTime() + diff - minutesBefore * 60_000)
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

  // Collect unique assignee emails so we can bulk-fetch their timezones
  const allEmails = new Set<string>()
  for (const t of tasks) { if (t.assignee?.email) allEmails.add(t.assignee.email.toLowerCase()) }
  for (const r of routines) { if (r.assignee?.email) allEmails.add(r.assignee.email.toLowerCase()) }

  const users = await prisma.user.findMany({
    where: { email: { in: Array.from(allEmails) } },
    select: { email: true, timezone: true },
  })
  const tzByEmail = new Map(users.map(u => [u.email.toLowerCase(), u.timezone]))

  type UserItems = { titles: string[]; taskIds: number[]; routineIds: number[] }
  const byEmail = new Map<string, UserItems>()

  function getOrCreate(email: string): UserItems {
    let entry = byEmail.get(email)
    if (!entry) { entry = { titles: [], taskIds: [], routineIds: [] }; byEmail.set(email, entry) }
    return entry
  }

  for (const task of tasks) {
    if (!task.dueDate) continue
    const email = task.assignee?.email?.toLowerCase()
    if (!email) continue
    const tz = tzByEmail.get(email) ?? "America/Los_Angeles"
    const fireAt = computeNotifyAt(task.dueDate, task.time, task.reminderMinutesBefore!, tz)
    if (fireAt < windowStart || fireAt > now) continue
    const entry = getOrCreate(email)
    entry.titles.push(task.title)
    entry.taskIds.push(task.id)
  }

  for (const routine of routines) {
    const email = routine.assignee?.email?.toLowerCase()
    if (!email) continue
    const tz = tzByEmail.get(email) ?? "America/Los_Angeles"
    const fireAt = computeNotifyAt(routine.nextDue, routine.time, routine.reminderMinutesBefore!, tz)
    if (fireAt < windowStart || fireAt > now) continue
    const entry = getOrCreate(email)
    entry.titles.push(routine.title)
    entry.routineIds.push(routine.id)
  }

  if (byEmail.size === 0) return NextResponse.json({ sent: 0 })

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userEmail: { in: Array.from(byEmail.keys()) } },
  })

  // Track which items were successfully notified so we only mark them after a send succeeds
  const notifiedTaskIds = new Set<number>()
  const notifiedRoutineIds = new Set<number>()
  let sent = 0

  await Promise.allSettled(
    subscriptions.map(async sub => {
      const items = byEmail.get(sub.userEmail)
      if (!items?.titles.length) return
      const body = items.titles.length === 1
        ? items.titles[0]
        : `${items.titles[0]} + ${items.titles.length - 1} more`
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: "Toft", body, url: "/" })
        )
        sent++
        for (const id of items.taskIds) notifiedTaskIds.add(id)
        for (const id of items.routineIds) notifiedRoutineIds.add(id)
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 410 || status === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } })
        } else {
          console.error(`Push notification failed for ${sub.userEmail}:`, err)
        }
      }
    })
  )

  if (notifiedTaskIds.size > 0) {
    await prisma.task.updateMany({ where: { id: { in: [...notifiedTaskIds] } }, data: { notifiedAt: now } })
  }
  if (notifiedRoutineIds.size > 0) {
    await prisma.recurringTask.updateMany({ where: { id: { in: [...notifiedRoutineIds] } }, data: { notifiedAt: now } })
  }

  return NextResponse.json({ sent, tasks: notifiedTaskIds.size, routines: notifiedRoutineIds.size })
}
