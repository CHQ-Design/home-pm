"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { unlink } from "fs/promises"
import { join } from "path"

type AttachmentInput = {
  filename: string
  originalName: string
  mimeType: string
  size: number
}

function normalizeTags(raw: string): string | null {
  const tags = raw.split(",").map(t => t.trim().toLowerCase()).filter(Boolean)
  return tags.length > 0 ? tags.join(", ") : null
}

async function removeFile(filename: string) {
  const path = join(process.cwd(), "public", "uploads", filename)
  await unlink(path).catch(() => {})
}

export async function addNote(formData: FormData, attachments: AttachmentInput[]) {
  const title = ((formData.get("title") as string) ?? "").trim()
  if (!title) return

  const body = ((formData.get("body") as string) ?? "").trim() || null
  const tags = normalizeTags((formData.get("tags") as string) ?? "")
  const projectIdRaw = formData.get("projectId") as string

  await prisma.note.create({
    data: {
      title,
      body,
      tags,
      projectId: projectIdRaw ? Number(projectIdRaw) : null,
      attachments: attachments.length > 0 ? { create: attachments } : undefined,
    },
  })
  revalidatePath("/", "layout")
}

export async function updateNote(
  id: number,
  data: { title?: string; body?: string | null; tags?: string | null; projectId?: number | null },
  newAttachments: AttachmentInput[] = []
) {
  if (data.tags !== undefined && data.tags !== null) {
    data = { ...data, tags: normalizeTags(data.tags) }
  }
  await prisma.note.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
      attachments: newAttachments.length > 0 ? { create: newAttachments } : undefined,
    },
  })
  revalidatePath("/", "layout")
}

export async function deleteNote(id: number) {
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
  const att = await prisma.attachment.findUnique({ where: { id } })
  if (!att) return
  await removeFile(att.filename)
  await prisma.attachment.delete({ where: { id } })
  revalidatePath("/", "layout")
}
