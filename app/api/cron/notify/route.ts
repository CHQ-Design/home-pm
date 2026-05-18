import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { webpush } from "@/lib/web-push"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase() ?? ""

  const subscriptions = await prisma.pushSubscription.findMany()

  const results = await Promise.allSettled(
    subscriptions.map(async sub => {
      const isAdmin = sub.userEmail === adminEmail

      const person = isAdmin
        ? null
        : await prisma.person.findFirst({ where: { email: sub.userEmail }, select: { id: true } })

      const assigneeFilter = isAdmin ? {} : { assigneeId: person?.id ?? -1 }

      const [tasks, routines] = await Promise.all([
        prisma.task.findMany({
          where: { completed: false, reminderSet: true, dueDate: { lte: todayEnd }, ...assigneeFilter },
          select: { title: true },
          orderBy: { dueDate: "asc" },
        }),
        prisma.recurringTask.findMany({
          where: { nextDue: { lte: todayEnd }, ...assigneeFilter },
          select: { title: true },
          orderBy: { nextDue: "asc" },
        }),
      ])

      const items = [...tasks, ...routines]
      if (items.length === 0) return

      const body =
        items.length === 1
          ? items[0].title
          : `${items[0].title} + ${items.length - 1} more`

      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: "The Board", body, url: "/" })
      ).catch(async err => {
        // Remove stale subscriptions (device unsubscribed)
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } })
        }
      })
    })
  )

  const failed = results.filter(r => r.status === "rejected").length
  return NextResponse.json({ sent: subscriptions.length, failed })
}
