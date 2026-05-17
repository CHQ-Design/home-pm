"use client"

import { useRef, useState } from "react"
import { addProject } from "./actions"

const inputClass =
  "bg-[#F2ECE2] border border-[#D4C9B5] rounded-lg px-3 py-2 text-sm text-[#3A3228] placeholder-[#A09080] outline-none focus:border-accent focus:ring-1 focus:ring-[#6B7A5A]/20"

export default function AddProjectForm() {
  const [showDesc, setShowDesc] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = (formData.get("name") as string).trim()
    if (!name) return
    setSubmitting(true)
    await addProject(formData)
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
          className="px-4 py-2 bg-accent text-white font-medium text-sm rounded-lg hover:bg-[#556148] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Adding…" : "Add"}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setShowDesc(v => !v)}
        aria-expanded={showDesc}
        className="text-xs text-[#8C7D6A] hover:text-[#3A3228] min-h-[44px] inline-flex items-center"
      >
        {showDesc ? "▾ fewer options" : "▸ add description"}
      </button>

      {showDesc && (
        <textarea
          name="description"
          placeholder="What's this project about? (optional)"
          rows={2}
          className={`w-full ${inputClass} resize-none`}
        />
      )}
    </form>
  )
}
