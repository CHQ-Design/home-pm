"use server"

import { prisma } from "@/lib/prisma"
import { requireRole, getSessionUser } from "@/lib/require-auth"
import { revalidatePath } from "next/cache"
import { unlink } from "fs/promises"
import { join } from "path"

type AttachmentInput = {
  filename: string
  originalName: string
  mimeType: string
  size: number
}

const UUID_FILENAME_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$/

function sanitizeAttachments(atts: AttachmentInput[]): AttachmentInput[] {
  return atts.filter(att =>
    UUID_FILENAME_RE.test(att.filename) &&
    typeof att.originalName === "string" && att.originalName.length > 0 &&
    typeof att.mimeType === "string" &&
    typeof att.size === "number" && att.size > 0
  )
}

function normalizeTags(raw: string): string | null {
  const tags = raw.split(",").map(t => t.trim().toLowerCase()).filter(Boolean)
  return tags.length > 0 ? tags.join(", ") : null
}

async function removeFile(filename: string) {
  const path = join(process.cwd(), "uploads", filename)
  await unlink(path).catch(() => {})
}

export async function addNote(formData: FormData, attachments: AttachmentInput[]) {
  const sessionUser = await getSessionUser()
  if (sessionUser?.role !== "admin") throw new Error("Not authorized")
  const title = ((formData.get("title") as string) ?? "").trim()
  if (!title) return

  const body = ((formData.get("body") as string) ?? "").trim() || null
  const tags = normalizeTags((formData.get("tags") as string) ?? "")
  const projectIdRaw = formData.get("projectId") as string
  const safeAttachments = sanitizeAttachments(attachments)

  await prisma.note.create({
    data: {
      title,
      body,
      tags,
      projectId: projectIdRaw ? Number(projectIdRaw) : null,
      householdId: sessionUser.householdId,
      attachments: safeAttachments.length > 0 ? { create: safeAttachments } : undefined,
    },
  })
  revalidatePath("/", "layout")
}

export async function updateNote(
  id: number,
  data: { title?: string; body?: string | null; tags?: string | null; projectId?: number | null },
  newAttachments: AttachmentInput[] = []
) {
  await requireRole("admin")
  if (data.tags !== undefined && data.tags !== null) {
    data = { ...data, tags: normalizeTags(data.tags) }
  }
  const safeAttachments = sanitizeAttachments(newAttachments)
  await prisma.note.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
      attachments: safeAttachments.length > 0 ? { create: safeAttachments } : undefined,
    },
  })
  revalidatePath("/", "layout")
}

export async function deleteNote(id: number) {
  await requireRole("admin")
  const note = await prisma.note.findUnique({ where: { id }, include: { attachments: true } })
  if (note) {
    for (const att of note.attachments) {
      await removeFile(att.filename)
    }
  }
  await prisma.note.delete({ where: { id } })
  revalidatePath("/", "layout")
}

export async function deleteAttachment(id: number) {
  await requireRole("admin")
  const att = await prisma.attachment.findUnique({ where: { id } })
  if (!att) return
  await removeFile(att.filename)
  await prisma.attachment.delete({ where: { id } })
  revalidatePath("/", "layout")
}
