import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const subs = await prisma.pushSubscription.findMany({
    select: { id: true, userEmail: true, createdAt: true },
  })

  return NextResponse.json({ count: subs.length, subs })
}
