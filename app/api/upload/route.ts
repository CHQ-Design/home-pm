import { put } from "@vercel/blob"
import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/require-auth"
import { ALLOWED_EXTENSIONS, MIME_MAP } from "@/lib/upload"

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(request: Request) {
  const sessionUser = await getSessionUser()
  if (sessionUser?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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
