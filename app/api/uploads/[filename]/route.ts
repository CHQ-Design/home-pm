import { readFile } from "fs/promises"
import { join } from "path"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const MIME_MAP: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ics: "text/calendar",
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { filename } = await params
  if (!filename || filename.includes("..") || filename.includes("/")) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }

  const att = await prisma.attachment.findFirst({
    where: { filename },
    select: { id: true, originalName: true, blobUrl: true },
  })
  if (!att) return NextResponse.json({ error: "Not found" }, { status: 404 })

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

  // Legacy files: read from local disk
  const filepath = join(process.cwd(), "uploads", filename)
  try {
    const file = await readFile(filepath)
    const ext = filename.split(".").pop()?.toLowerCase() ?? ""
    const mimeType = MIME_MAP[ext] ?? "application/octet-stream"
    return new Response(file, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${att.originalName ?? filename}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}
