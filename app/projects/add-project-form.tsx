"use client"

import { useRef, useState } from "react"
import { addProject } from "./actions"
import { inputClass } from "@/lib/styles"

export default function AddProjectForm() {
  const [showDesc, setShowDesc] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = (formData.get("name") as string).trim()
    if (!name) return
    setSubmitting(true)
    setSubmitError(null)
    const result = await addProject(formData)
    if (result && "error" in result) {
      setSubmitError(result.error)
      setSubmitting(false)
      return
    }
    formRef.current?.reset()
    setShowDesc(false)
    setSubmitting(false)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mb-8 space-y-2">
      <div className="flex gap-2">
        <input
          name="name"
          placeholder="New project…"
          className={`flex-1 ${inputClass}`}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-accent text-white font-medium text-sm rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Adding…" : "Add"}
        </button>
      </div>

      {submitError && <p className="text-sm text-danger">{submitError}</p>}

      <button
        type="button"
        onClick={() => setShowDesc(v => !v)}
        aria-expanded={showDesc}
        className="text-xs text-text-secondary hover:text-foreground min-h-[44px] inline-flex items-center"
      >
        {showDesc ? "▾ fewer options" : "▸ add description"}
      </button>

      {showDesc && (
        <textarea
          name="description"
          placeholder="What's this project about? (optional)"
          rows={2}
          className={`${inputClass} resize-none`}
        />
      )}
    </form>
  )
}
