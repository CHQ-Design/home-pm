"use client"

import { useState } from "react"
import { updateProject } from "../actions"
import ProjectStatusSelect from "./project-status-select"
import { inputClassSm as inputClass } from "@/lib/styles"

export default function ProjectHeader({
  projectId,
  name,
  description,
  status,
  progress,
}: {
  projectId: number
  name: string
  description: string | null
  status: string
  progress: { done: number; total: number } | null
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name, description: description ?? "" })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const trimmedName = form.name.trim()
    if (!trimmedName) return
    setSaving(true)
    await updateProject(projectId, {
      name: trimmedName,
      description: form.description.trim() || null,
    })
    setSaving(false)
    setEditing(false)
  }

  function handleCancel() {
    setForm({ name, description: description ?? "" })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="mb-6 space-y-3">
        <input
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel() }}
          className="w-full font-serif text-2xl font-bold bg-transparent border-b-2 border-accent outline-none text-foreground pb-1"
          autoFocus
        />
        <textarea
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Description (optional)"
          rows={2}
          className={`${inputClass} resize-none`}
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-sm px-4 py-1.5 bg-accent text-white font-medium rounded-md hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={handleCancel}
            className="text-sm px-4 py-1.5 text-text-secondary hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-serif text-2xl font-bold text-foreground">{name}</h1>
        <div className="flex items-center gap-2 shrink-0">
          <ProjectStatusSelect projectId={projectId} status={status} />
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-text-faint hover:text-text-hover transition-colors"
            aria-label="Edit project"
          >
            ✎
          </button>
        </div>
      </div>

      {description && (
        <p className="text-sm text-text-secondary mt-1">{description}</p>
      )}

      {progress && progress.total > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-text-muted mb-1">
            <span>{progress.done} of {progress.total} thing{progress.total !== 1 ? "s" : ""} done</span>
            <span>{Math.round((progress.done / progress.total) * 100)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-border-subtle overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
