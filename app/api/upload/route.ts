import { put } from "@vercel/blob"
import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

const ALLOWED_EXTENSIONS = new Set([
  "pdf", "png", "jpg", "jpeg", "gif", "webp",
  "txt", "md", "csv", "xlsx", "docx", "ics",
])

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

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const contentLength = Number(request.headers.get("content-length") ?? 0)
  if (contentLength > MAX_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 413 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 413 })
  }

  const rawExt = (file.name.split(".").pop() ?? "").toLowerCase()
  if (!ALLOWED_EXTENSIONS.has(rawExt)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 415 })
  }

  const mimeType = MIME_MAP[rawExt] ?? "application/octet-stream"
  const filename = `${randomUUID()}.${rawExt}`

  const blob = await put(filename, file, { access: "private", contentType: mimeType })

  return NextResponse.json({
    filename,
    originalName: file.name,
    mimeType,
    size: file.size,
    blobUrl: blob.url,
  })
}
