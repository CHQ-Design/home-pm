"use server"

import { prisma } from "@/lib/prisma"
import { getSessionUser, verifyBelongsToHousehold } from "@/lib/require-auth"
import { parseId } from "@/lib/parse"
import { revalidatePath } from "next/cache"
import { del } from "@vercel/blob"

type AttachmentInput = {
  filename: string
  originalName: string
  mimeType: string
  size: number
  blobUrl?: string
}

const UUID_FILENAME_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$/

function sanitizeAttachments(atts: AttachmentInput[]): AttachmentInput[] {
  return atts.filter(att =>
    UUID_FILENAME_RE.test(att.filename) &&
    typeof att.originalName === "string" && att.originalName.length > 0 &&
    typeof att.mimeType === "string" &&
    typeof att.size === "number" && att.size > 0 &&
    (att.blobUrl === undefined || (
      typeof att.blobUrl === "string" &&
      att.blobUrl.startsWith("https://") &&
      att.blobUrl.includes(".blob.vercel-storage.com/")
    ))
  )
}

function normalizeTags(raw: string): string | null {
  const tags = raw.split(",").map(t => t.trim().toLowerCase()).filter(Boolean)
  return tags.length > 0 ? tags.join(", ") : null
}

async function removeFile(_filename: string, blobUrl?: string | null) {
  if (blobUrl) await del(blobUrl).catch(() => {})
}

export async function addNote(formData: FormData, attachments: AttachmentInput[]) {
  const sessionUser = await getSessionUser()
  if (sessionUser?.role !== "admin") throw new Error("Not authorized")
  const title = ((formData.get("title") as string) ?? "").trim()
  if (!title) return
  if (title.length > 500) return { error: "Title is too long" }

  const body = ((formData.get("body") as string) ?? "").trim() || null
  if (body && body.length > 10000) return { error: "Body is too long" }
  const rawTags = (formData.get("tags") as string) ?? ""
  if (rawTags.length > 200) return { error: "Tags are too long" }
  const tags = normalizeTags(rawTags)
  const projectIdRaw = formData.get("projectId") as string
  const projectId = projectIdRaw ? await verifyBelongsToHousehold("project", parseId(projectIdRaw), sessionUser.householdId) : null
  const safeAttachments = sanitizeAttachments(attachments)

  await prisma.note.create({
    data: {
      title,
      body,
      tags,
      projectId,
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
  const sessionUser = await getSessionUser()
  if (sessionUser?.role !== "admin") throw new Error("Not authorized")

  // Build update from only whitelisted fields
  const update: { title?: string; body?: string | null; tags?: string | null; projectId?: number | null } = {}
  if (data.title !== undefined) {
    const t = data.title.trim()
    if (!t) return
    if (t.length > 500) return { error: "Title is too long" }
    update.title = t
  }
  if (data.body !== undefined) {
    if (data.body !== null && data.body.length > 10000) return { error: "Body is too long" }
    update.body = data.body
  }
  if (data.tags !== undefined) {
    if (data.tags !== null && data.tags.length > 200) return { error: "Tags are too long" }
    update.tags = data.tags !== null ? normalizeTags(data.tags) : null
  }
  if (data.projectId !== undefined) {
    update.projectId = data.projectId !== null
      ? await verifyBelongsToHousehold("project", data.projectId, sessionUser.householdId)
      : null
  }
  const safeAttachments = sanitizeAttachments(newAttachments)
  await prisma.note.update({
    where: { id, householdId: sessionUser.householdId },
    data: {
      ...update,
      updatedAt: new Date(),
      ...(safeAttachments.length > 0 ? { attachments: { create: safeAttachments } } : {}),
    },
  })
  revalidatePath("/", "layout")
}

export async function deleteNote(id: number) {
  const sessionUser = await getSessionUser()
  if (sessionUser?.role !== "admin") throw new Error("Not authorized")
  const note = await prisma.note.findUnique({
    where: { id, householdId: sessionUser.householdId },
    include: { attachments: true },
  })
  if (!note) return
  for (const att of note.attachments) {
    await removeFile(att.filename, att.blobUrl)
  }
  await prisma.note.delete({ where: { id, householdId: sessionUser.householdId } })
  revalidatePath("/", "layout")
}

export async function deleteAttachment(id: number) {
  const sessionUser = await getSessionUser()
  if (sessionUser?.role !== "admin") throw new Error("Not authorized")
  const att = await prisma.attachment.findUnique({
    where: { id },
    include: { note: { select: { householdId: true } } },
  })
  if (!att || att.note.householdId !== sessionUser.householdId) return
  await removeFile(att.filename, att.blobUrl)
  await prisma.attachment.delete({ where: { id } })
  revalidatePath("/", "layout")
}
