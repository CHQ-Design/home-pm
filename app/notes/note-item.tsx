"use client"

import { useState } from "react"
import { IconPencilMinus, IconX } from "@tabler/icons-react"
import type { Prisma, Project } from "@prisma/client"
import { updateNote, deleteNote, deleteAttachment } from "./actions"
import { formatTimestamp } from "@/lib/dates"

type Note = Prisma.NoteGetPayload<{ include: { attachments: true; project: true } }>

type UploadedFile = {
  filename: string
  originalName: string
  mimeType: string
  size: number
  blobUrl?: string
}

const inputClass =
  "w-full bg-[#F2ECE2] border border-[#D4C9B5] rounded-md px-3 py-2 text-sm text-[#3A3228] placeholder-[#A09080] outline-none focus:border-accent focus:ring-1 focus:ring-[#6B7A5A]/20"

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}


export default function NoteItem({ note, projects }: { note: Note; projects: Project[] }) {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [pending, setPending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    title: note.title,
    body: note.body ?? "",
    tags: note.tags ?? "",
    projectId: note.projectId ? String(note.projectId) : "",
  })

  async function handleFileAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setUploading(true)
    const uploaded: UploadedFile[] = []
    for (const file of files) {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (res.ok) uploaded.push(await res.json())
    }
    await updateNote(note.id, {}, uploaded)
    setUploading(false)
    e.target.value = ""
  }

  async function handleSave() {
    const title = form.title.trim()
    if (!title) return
    setPending(true)
    await updateNote(note.id, {
      title,
      body: form.body.trim() || null,
      tags: form.tags,
      projectId: form.projectId ? Number(form.projectId) : null,
    })
    setPending(false)
    setEditing(false)
  }

  async function handleDelete() {
    setPending(true)
    await deleteNote(note.id)
    setPending(false)
  }

  async function handleDeleteAttachment(id: number) {
    await deleteAttachment(id)
  }

  const tags = note.tags ? note.tags.split(",").map(t => t.trim()).filter(Boolean) : []
  const bodyTruncated = note.body && note.body.length > 200 && !expanded

  if (editing) {
    return (
      <div className="p-4 bg-[#EDE6D8] rounded-xl border border-[#D4C9B5] space-y-3">
        <input
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          onKeyDown={e => { if (e.key === "Escape") setEditing(false) }}
          className={inputClass}
          autoFocus
        />
        <textarea
          value={form.body}
          onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
          placeholder="Body (optional)"
          rows={4}
          className={`${inputClass} resize-none`}
        />
        <input
          value={form.tags}
          onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
          placeholder="Tags (comma-separated)"
          className={inputClass}
        />
        {projects.length > 0 && (
          <select
            value={form.projectId}
            onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
            className={inputClass}
          >
            <option value="">No project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={pending}
            className="text-sm px-4 py-1.5 bg-accent text-white font-medium rounded-md hover:bg-[#556148] disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="text-sm px-4 py-1.5 text-[#8C7D6A] hover:text-[#3A3228]"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (confirming) {
    return (
      <div className="p-4 bg-[#EDE6D8] rounded-xl border border-[#D4C9B5] space-y-3">
        <p className="text-sm text-[#4A3F34]">Delete <strong>{note.title}</strong> and all its attachments?</p>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={pending}
            className="text-sm px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? "Deleting…" : "Delete"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="text-sm px-3 py-1 text-[#8C7D6A] hover:text-[#3A3228]"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 bg-[#F2ECE2] rounded-xl border border-[#E4DDD0] group space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-base font-medium text-[#3A3228]">{note.title}</p>
          {note.project && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent mt-1 inline-block">
              {note.project.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="flex items-center justify-center min-h-[44px] min-w-[44px] text-[#C8BFAD] hover:text-[#6B5E52] active:text-[#3A3228]"
            aria-label={`Edit ${note.title}`}
          >
            <IconPencilMinus size={15} aria-hidden="true" />
          </button>
          <button
            onClick={() => setConfirming(true)}
            className="flex items-center justify-center min-h-[44px] min-w-[44px] text-[#C8BFAD] hover:text-red-600 active:text-red-700"
            aria-label={`Delete ${note.title}`}
          >
            <IconX size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      {note.body && (
        <div>
          <p className="text-sm text-[#6B5E52] whitespace-pre-wrap">
            {bodyTruncated ? `${note.body.slice(0, 200)}…` : note.body}
          </p>
          {note.body.length > 200 && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-xs text-[#B5A898] hover:text-[#6B5E52] mt-1"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map(tag => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full bg-[#EDE6D8] text-[#8C7D6A] border border-[#D4C9B5]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {note.attachments.length > 0 && (
        <ul className="space-y-1 pt-1">
          {note.attachments.map(att => (
            <li key={att.id} className="flex items-center justify-between text-xs text-[#6B5E52] bg-[#EDE6D8] rounded px-2 py-1.5">
              <a
                href={`/api/uploads/${att.filename}`}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate hover:text-accent flex-1"
              >
                {att.originalName}
                <span className="ml-1.5 text-[#B5A898]">{formatSize(att.size)}</span>
              </a>
              <button
                onClick={() => handleDeleteAttachment(att.id)}
                className="ml-2 text-[#B5A898] hover:text-red-600 shrink-0"
                aria-label={`Remove ${att.originalName}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-[#C8BFAD]">Updated {formatTimestamp(note.updatedAt)}</span>
        <label className={`text-xs cursor-pointer ${uploading ? "text-[#A09080]" : "text-[#B5A898] hover:text-[#6B5E52]"}`}>
          {uploading ? "Uploading…" : "+ Attach"}
          <input
            type="file"
            multiple
            className="sr-only"
            onChange={handleFileAdd}
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  )
}
