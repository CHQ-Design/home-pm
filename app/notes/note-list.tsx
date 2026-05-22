"use client"

import { useState, useMemo } from "react"
import type { Prisma, Project } from "@prisma/client"
import NoteItem from "./note-item"

type Note = Prisma.NoteGetPayload<{ include: { attachments: true; project: true } }>

export default function NoteList({ notes, projects }: { notes: Note[]; projects: Project[] }) {
  const [search, setSearch] = useState("")
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    for (const note of notes) {
      if (note.tags) {
        note.tags.split(",").forEach(t => {
          const trimmed = t.trim()
          if (trimmed) tagSet.add(trimmed)
        })
      }
    }
    return Array.from(tagSet).sort()
  }, [notes])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return notes.filter(note => {
      const matchesSearch = !q ||
        note.title.toLowerCase().includes(q) ||
        (note.body ?? "").toLowerCase().includes(q) ||
        (note.tags ?? "").toLowerCase().includes(q)
      const matchesTag = !activeTag ||
        (note.tags ?? "").split(",").map(t => t.trim()).includes(activeTag)
      return matchesSearch && matchesTag
    })
  }, [notes, search, activeTag])

  return (
    <div>
      <div className="relative mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search notes…"
          aria-label="Search notes"
          className="w-full bg-surface-warm border border-border-card rounded-md px-3 py-2 text-base text-foreground placeholder-text-muted outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-hover text-xs leading-none"
          >
            ✕
          </button>
        )}
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => setActiveTag(null)}
            aria-pressed={activeTag === null}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors border font-medium ${
              activeTag === null
                ? "bg-accent text-white border-accent"
                : "bg-surface text-text-hover border-border-chip hover:bg-[#E4DBD0]"
            }`}
          >
            All
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              aria-pressed={activeTag === tag}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors border font-medium ${
                activeTag === tag
                  ? "bg-accent text-white border-accent"
                  : "bg-surface text-text-hover border-border-chip hover:bg-[#E4DBD0]"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <p className="text-sm text-text-muted py-4">
          {notes.length === 0 ? "Nothing saved yet. Add a thought above." : "No notes match your search."}
        </p>
      )}

      <div className="space-y-3">
        {filtered.map(note => (
          <NoteItem key={note.id} note={note} projects={projects} />
        ))}
      </div>
    </div>
  )
}
