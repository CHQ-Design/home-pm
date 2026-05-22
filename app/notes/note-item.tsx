"use client"

import { useState } from "react"
import { IconPencilMinus, IconX } from "@tabler/icons-react"
import type { Prisma, Project } from "@prisma/client"
import { updateNote, deleteNote, deleteAttachment } from "./actions"
import { formatTimestamp } from "@/lib/dates"
import { inputClass } from "@/lib/styles"
import CustomSelect from "../custom-select"

type Note = Prisma.NoteGetPayload<{ include: { attachments: true; project: true } }>

type UploadedFile = {
  filename: string
  originalName: string
  mimeType: string
  size: number
  blobUrl?: string
}


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
  const [saveError, setSaveError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
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
    setUploadError(null)
    const uploaded: UploadedFile[] = []
    const failed: string[] = []
    for (const file of files) {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (res.ok) {
        uploaded.push(await res.json())
      } else {
        const msg = res.status === 413 ? "too large"
                  : res.status === 415 ? "file type not allowed"
                  : "upload failed"
        failed.push(`${file.name}: ${msg}`)
      }
    }
    if (uploaded.length > 0) await updateNote(note.id, {}, uploaded)
    if (failed.length > 0) setUploadError(failed.join(", "))
    setUploading(false)
    e.target.value = ""
  }

  async function handleSave() {
    const title = form.title.trim()
    if (!title) return
    setPending(true)
    setSaveError(null)
    try {
      await updateNote(note.id, {
        title,
        body: form.body.trim() || null,
        tags: form.tags,
        projectId: form.projectId ? Number(form.projectId) : null,
      })
      setEditing(false)
    } catch {
      setSaveError("Couldn't save — please try again.")
    } finally {
      setPending(false)
    }
  }

  async function handleDelete() {
    setPending(true)
    setSaveError(null)
    try {
      await deleteNote(note.id)
    } catch {
      setSaveError("Couldn't delete — please try again.")
      setPending(false)
    }
  }

  async function handleDeleteAttachment(id: number) {
    try {
      await deleteAttachment(id)
    } catch {
      setUploadError("Couldn't remove attachment — please try again.")
    }
  }

  const tags = note.tags ? note.tags.split(",").map(t => t.trim()).filter(Boolean) : []
  const bodyTruncated = note.body && note.body.length > 200 && !expanded

  if (editing) {
    return (
      <div className="p-4 bg-surface rounded-xl border border-border-card space-y-3">
        <input
          aria-label="Note title"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          onKeyDown={e => { if (e.key === "Escape") setEditing(false) }}
          className={inputClass}
          autoFocus
        />
        <textarea
          aria-label="Note body"
          value={form.body}
          onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
          placeholder="Body (optional)"
          rows={4}
          className={`${inputClass} resize-none`}
        />
        <input
          aria-label="Tags"
          value={form.tags}
          onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
          placeholder="Tags (comma-separated)"
          className={inputClass}
        />
        {projects.length > 0 && (
          <CustomSelect
            value={form.projectId}
            onChange={v => setForm(f => ({ ...f, projectId: v }))}
            options={[
              { value: "", label: "No project" },
              ...projects.map(p => ({ value: String(p.id), label: p.name })),
            ]}
            aria-label="Project"
          />
        )}
        {saveError && <p className="text-xs text-red-600">{saveError}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={pending}
            className="text-sm px-4 py-1.5 bg-accent text-white font-medium rounded-md hover:bg-accent-hover disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="text-sm px-4 py-1.5 text-text-secondary hover:text-foreground rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (confirming) {
    return (
      <div className="p-4 bg-surface rounded-xl border border-border-card space-y-3">
        <p className="text-sm text-foreground">Delete <strong>{note.title}</strong> and all its attachments?</p>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={pending}
            className="text-sm px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-1"
          >
            {pending ? "Deleting…" : "Delete"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="text-sm px-3 py-1 text-text-secondary hover:text-foreground rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
          >
            Cancel
          </button>
        </div>
        {saveError && <p className="text-xs text-red-600">{saveError}</p>}
      </div>
    )
  }

  return (
    <div className="p-4 bg-surface-warm rounded-xl border border-border-subtle group space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-base font-medium text-foreground">{note.title}</p>
          {note.project && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent-hover mt-1 inline-block">
              {note.project.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="flex items-center justify-center min-h-[44px] min-w-[44px] text-text-faint hover:text-text-hover active:text-foreground"
            aria-label={`Edit ${note.title}`}
          >
            <IconPencilMinus size={15} aria-hidden="true" />
          </button>
          <button
            onClick={() => setConfirming(true)}
            className="flex items-center justify-center min-h-[44px] min-w-[44px] text-text-faint hover:text-red-600 active:text-red-700"
            aria-label={`Delete ${note.title}`}
          >
            <IconX size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      {note.body && (
        <div>
          <p className="text-sm text-text-hover whitespace-pre-wrap">
            {bodyTruncated ? `${note.body.slice(0, 200)}…` : note.body}
          </p>
          {note.body.length > 200 && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-xs text-text-secondary hover:text-foreground mt-1"
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
              className="text-xs px-2 py-0.5 rounded-full bg-surface text-text-secondary border border-border-card"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {note.attachments.length > 0 && (
        <ul className="space-y-1 pt-1">
          {note.attachments.map(att => (
            <li key={att.id} className="flex items-center justify-between text-xs text-text-hover bg-surface rounded px-2 py-1.5">
              <a
                href={`/api/uploads/${att.filename}`}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate hover:text-accent flex-1"
              >
                {att.originalName}
                <span className="ml-1.5 text-text-secondary">{formatSize(att.size)}</span>
              </a>
              <button
                onClick={() => handleDeleteAttachment(att.id)}
                className="ml-2 text-text-faint hover:text-red-600 shrink-0"
                aria-label={`Remove ${att.originalName}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-text-muted">Updated {formatTimestamp(note.updatedAt)}</span>
        <label className={`text-xs cursor-pointer ${uploading ? "text-text-muted" : "text-text-secondary hover:text-foreground"}`}>
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
