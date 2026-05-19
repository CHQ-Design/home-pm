import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

function icalDate(date: Date): string {
  return new Date(date).toISOString().slice(0, 10).replace(/-/g, "")
}

function icalNextDay(date: Date): string {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + 1)
  return icalDate(d)
}

function icalDatetime(date: Date): string {
  return new Date(date).toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z"
}

function escapeText(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
}

// RFC 5545 requires lines no longer than 75 octets, continuation lines start with a space
function foldLine(line: string): string {
  if (line.length <= 75) return line
  const chunks = [line.slice(0, 75)]
  let i = 75
  while (i < line.length) {
    chunks.push(" " + line.slice(i, i + 74))
    i += 74
  }
  return chunks.join("\r\n")
}

const PRIORITY_MAP: Record<string, number> = { high: 1, medium: 5, low: 9 }

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const email = session.user?.email?.toLowerCase() ?? ""
  const dbUser = await prisma.user.findUnique({ where: { email }, select: { role: true, householdId: true } })
  const isAdmin = dbUser?.role === "admin"
  const householdId = dbUser?.householdId
  if (!householdId) return new NextResponse("Forbidden", { status: 403 })

  let assigneeFilter: { assigneeId?: number } = {}
  if (!isAdmin) {
    const person = await prisma.person.findFirst({ where: { email }, select: { id: true } })
    if (!person) return new NextResponse("Forbidden", { status: 403 })
    assigneeFilter = { assigneeId: person.id }
  }

  const tasks = await prisma.task.findMany({
    where: { householdId, dueDate: { not: null }, completed: false, ...assigneeFilter },
    include: { assignee: true },
    orderBy: { dueDate: "asc" },
  })

  const events = tasks.map(task => {
    const summary = task.assignee
      ? `${task.title} [${task.assignee.name}]`
      : task.title

    const lines = [
      "BEGIN:VEVENT",
      `UID:task-${task.id}@home-pm`,
      `DTSTAMP:${icalDatetime(task.createdAt)}`,
      `DTSTART;VALUE=DATE:${icalDate(task.dueDate!)}`,
      `DTEND;VALUE=DATE:${icalNextDay(task.dueDate!)}`,
      `SUMMARY:${escapeText(summary)}`,
      `PRIORITY:${PRIORITY_MAP[task.priority] ?? 5}`,
      ...(task.notes ? [`DESCRIPTION:${escapeText(task.notes)}`] : []),
      "END:VEVENT",
    ]

    return lines.map(foldLine).join("\r\n")
  })

  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Home PM//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Home PM",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n")

  return new NextResponse(calendar, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="home-pm.ics"',
    },
  })
}
