import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sub = await request.json()
  if (
    typeof sub?.endpoint !== "string" ||
    typeof sub?.keys?.p256dh !== "string" ||
    typeof sub?.keys?.auth !== "string"
  ) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 })
  }
  const userEmail = session.user.email.toLowerCase()

  // Don't allow one user to claim another user's push endpoint
  const existing = await prisma.pushSubscription.findFirst({
    where: { endpoint: sub.endpoint },
    select: { userEmail: true },
  })
  if (existing && existing.userEmail !== userEmail) {
    return NextResponse.json({ ok: true })
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    update: { p256dh: sub.keys.p256dh, auth: sub.keys.auth, userEmail },
    create: { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userEmail },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { endpoint } = body
  if (typeof endpoint !== "string") return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userEmail: session.user.email.toLowerCase() },
  })

  return NextResponse.json({ ok: true })
}
