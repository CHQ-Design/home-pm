"use client"

import { useRef, useState } from "react"
import type { Project } from "@prisma/client"
import { addNote } from "./actions"
import { inputClass } from "@/lib/styles"
import CustomSelect from "../custom-select"

type UploadedFile = {
  filename: string
  originalName: string
  mimeType: string
  size: number
  blobUrl?: string
}

export default function AddNoteForm({ projects }: { projects: Project[] }) {
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showBody, setShowBody] = useState(false)
  const [showProject, setShowProject] = useState(false)
  const [projectId, setProjectId] = useState("")
  const [uploading, setUploading] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<UploadedFile[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
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
    setPendingFiles(prev => [...prev, ...uploaded])
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function removePending(filename: string) {
    setPendingFiles(prev => prev.filter(f => f.filename !== filename))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitError(null)
    const formData = new FormData(e.currentTarget)
    const result = await addNote(formData, pendingFiles)
    if (result && "error" in result) {
      setSubmitError(result.error)
      return
    }
    formRef.current?.reset()
    setPendingFiles([])
    setShowBody(false)
    setShowProject(false)
    setProjectId("")
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mb-8 space-y-3">
      <input
        name="title"
        placeholder="Note title…"
        className={inputClass}
        autoComplete="off"
        required
      />

      {showBody && (
        <textarea
          name="body"
          placeholder="Body (optional)"
          rows={4}
          className={`${inputClass} resize-none`}
        />
      )}

      <input
        name="tags"
        placeholder="Tags (comma-separated, e.g. warranty, appliance)"
        className={inputClass}
        autoComplete="off"
      />

      {showProject && projects.length > 0 && (
        <CustomSelect
          name="projectId"
          value={projectId}
          onChange={setProjectId}
          options={[
            { value: "", label: "No project" },
            ...projects.map(p => ({ value: String(p.id), label: p.name })),
          ]}
          aria-label="Project"
        />
      )}

      {pendingFiles.length > 0 && (
        <ul className="space-y-1">
          {pendingFiles.map(f => (
            <li key={f.filename} className="flex items-center justify-between text-xs text-text-hover bg-surface rounded px-2 py-1">
              <span className="truncate">{f.originalName}</span>
              <button
                type="button"
                onClick={() => removePending(f.filename)}
                className="ml-2 text-text-faint hover:text-red-600 shrink-0"
                aria-label={`Remove ${f.originalName}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {submitError && <p className="text-sm text-danger">{submitError}</p>}

      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowBody(v => !v)}
            className={`text-xs ${showBody ? "text-accent" : "text-text-secondary hover:text-foreground"}`}
          >
            {showBody ? "− Body" : "+ Body"}
          </button>
          <label className={`text-xs cursor-pointer ${uploading ? "text-text-muted" : "text-text-secondary hover:text-foreground"}`}>
            {uploading ? "Uploading…" : "+ Attach"}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="sr-only"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
          {projects.length > 0 && (
            <button
              type="button"
              onClick={() => setShowProject(v => !v)}
              className={`text-xs ${showProject ? "text-accent" : "text-text-secondary hover:text-foreground"}`}
            >
              {showProject ? "− Project" : "+ Project"}
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={uploading}
          className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-md hover:bg-accent-hover disabled:opacity-50"
        >
          Add note
        </button>
      </div>
    </form>
  )
}
