"use client"

import { useRef, useState } from "react"
import type { Project } from "@prisma/client"
import { addNote } from "./actions"

const inputClass =
  "w-full bg-[#F2ECE2] border border-[#D4C9B5] rounded-md px-3 py-2 text-sm text-[#3A3228] placeholder-[#A09080] outline-none focus:border-accent focus:ring-1 focus:ring-[#6B7A5A]/20"

type UploadedFile = {
  filename: string
  originalName: string
  mimeType: string
  size: number
}

export default function AddNoteForm({ projects }: { projects: Project[] }) {
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showBody, setShowBody] = useState(false)
  const [showProject, setShowProject] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<UploadedFile[]>([])

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
    const formData = new FormData(e.currentTarget)
    await addNote(formData, pendingFiles)
    formRef.current?.reset()
    setPendingFiles([])
    setShowBody(false)
    setShowProject(false)
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
        <select name="projectId" className={inputClass}>
          <option value="">No project</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      )}

      {pendingFiles.length > 0 && (
        <ul className="space-y-1">
          {pendingFiles.map(f => (
            <li key={f.filename} className="flex items-center justify-between text-xs text-[#6B5E52] bg-[#EDE6D8] rounded px-2 py-1">
              <span className="truncate">{f.originalName}</span>
              <button
                type="button"
                onClick={() => removePending(f.filename)}
                className="ml-2 text-[#B5A898] hover:text-red-600 shrink-0"
                aria-label={`Remove ${f.originalName}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowBody(v => !v)}
            className={`text-xs ${showBody ? "text-accent" : "text-[#B5A898] hover:text-[#6B5E52]"}`}
          >
            {showBody ? "− Body" : "+ Body"}
          </button>
          <label className={`text-xs cursor-pointer ${uploading ? "text-[#A09080]" : "text-[#B5A898] hover:text-[#6B5E52]"}`}>
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
              className={`text-xs ${showProject ? "text-accent" : "text-[#B5A898] hover:text-[#6B5E52]"}`}
            >
              {showProject ? "− Project" : "+ Project"}
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={uploading}
          className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-md hover:bg-[#556148] disabled:opacity-50"
        >
          Add note
        </button>
      </div>
    </form>
  )
}
