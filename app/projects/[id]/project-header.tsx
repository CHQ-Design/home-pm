"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateProject, deleteProject } from "../actions"
import ProjectStatusSelect from "./project-status-select"
import PageMast from "@/app/page-mast"
import { inputClass } from "@/lib/styles"

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
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name, description: description ?? "" })
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

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

  async function handleDelete() {
    setDeleting(true)
    await deleteProject(projectId)
    router.push("/projects")
  }

  if (editing) {
    return (
      <div className="mb-6 space-y-3">
        <input
          aria-label="Project name"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel() }}
          className="w-full font-serif text-2xl font-bold bg-transparent border-b-2 border-accent outline-none text-foreground pb-1"
          autoFocus
        />
        <textarea
          aria-label="Project description"
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
            className="text-sm px-4 py-1.5 bg-accent text-white font-medium rounded-md hover:bg-accent-hover disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={handleCancel}
            className="text-sm px-4 py-1.5 text-text-secondary hover:text-foreground rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageMast
        title={name}
        subtitle={description || undefined}
      >
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
      </PageMast>

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

      {showDeleteConfirm ? (
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border-subtle">
          <span className="text-sm text-text-secondary">Delete this project? Its tasks will be kept.</span>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50 shrink-0"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className="text-sm text-text-secondary hover:text-foreground shrink-0"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="mt-4 text-xs text-text-secondary hover:text-red-600 transition-colors"
        >
          Delete project
        </button>
      )}
    </div>
  )
}
