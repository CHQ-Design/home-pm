import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { MIME_MAP } from "@/lib/upload"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const householdId = session.user.householdId
  if (!householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { filename } = await params
  if (!filename || filename.includes("..") || filename.includes("/")) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }

  const att = await prisma.attachment.findFirst({
    where: { filename },
    select: { id: true, originalName: true, blobUrl: true, note: { select: { householdId: true } } },
  })
  if (!att || att.note.householdId !== householdId) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // New files: fetch from Vercel Blob using server-side token and proxy
  if (att.blobUrl) {
    const blobRes = await fetch(att.blobUrl, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    })
    if (!blobRes.ok) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const ext = filename.split(".").pop()?.toLowerCase() ?? ""
    const mimeType = MIME_MAP[ext] ?? "application/octet-stream"
    const safeName = (att.originalName ?? filename).replace(/"/g, "")
    return new Response(blobRes.body, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${safeName}"`,
      },
    })
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 })
}
