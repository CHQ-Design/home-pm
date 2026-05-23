"use client"

import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { IconCheck } from "@tabler/icons-react"
import { CATEGORIES, UNCATEGORIZED } from "@/lib/categories"
import type { CategoryValue } from "@/lib/categories"
import CustodyModeChip from "./custody-mode-chip"
import type { CustodyMode } from "./custody-mode-chip"

export default function FilterSheet({
  selectedCategories,
  onToggleCategory,
  custodyModeEnabled,
  custodyMode,
  onModeChange,
  onClose,
}: {
  selectedCategories: (CategoryValue | typeof UNCATEGORIZED)[]
  onToggleCategory: (cat: CategoryValue | typeof UNCATEGORIZED) => void
  custodyModeEnabled: boolean
  custodyMode: CustodyMode | null
  onModeChange: (mode: CustodyMode | null) => void
  onClose: () => void
}) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const firstItemRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    firstItemRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return }
      if (e.key !== "Tab" || !sheetRef.current) return
      const focusable = Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>("button:not([disabled])")
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  const content = (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" aria-hidden="true" onClick={onClose} />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className="fixed bottom-0 left-0 right-0 z-50 bg-surface-warm rounded-t-2xl border-t border-border-card"
        style={{ animation: "slide-up 200ms ease-out", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-border-card" />
        </div>
        <p className="text-center text-sm font-medium text-text-secondary py-2">Filters</p>

        <ul>
          {CATEGORIES.map((cat, i) => {
            const isSelected = selectedCategories.includes(cat.value)
            return (
              <li key={cat.value}>
                <button
                  ref={i === 0 ? firstItemRef : undefined}
                  onClick={() => onToggleCategory(cat.value)}
                  className="w-full flex items-center gap-3 px-5 min-h-[52px] text-left hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
                  aria-pressed={isSelected}
                >
                  <cat.Icon size={18} className="text-text-secondary shrink-0" aria-hidden="true" />
                  <span className="flex-1 text-sm text-foreground">{cat.label}</span>
                  {isSelected && <IconCheck size={16} className="text-accent shrink-0" aria-hidden="true" />}
                </button>
              </li>
            )
          })}
          <li className="border-t border-border-subtle">
            <button
              onClick={() => onToggleCategory(UNCATEGORIZED)}
              className="w-full flex items-center gap-3 px-5 min-h-[52px] text-left hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
              aria-pressed={selectedCategories.includes(UNCATEGORIZED)}
            >
              <span className="flex-1 text-sm text-foreground">Uncategorized</span>
              {selectedCategories.includes(UNCATEGORIZED) && (
                <IconCheck size={16} className="text-accent shrink-0" aria-hidden="true" />
              )}
            </button>
          </li>
        </ul>

        {custodyModeEnabled && (
          <div className="border-t border-border-subtle px-5 py-4 flex items-center gap-3">
            <span className="flex-1 text-sm text-foreground">Day mode</span>
            <CustodyModeChip initialMode={custodyMode} onModeChange={onModeChange} />
          </div>
        )}

        <div className="px-5 pt-2 pb-3 border-t border-border-subtle">
          <button
            onClick={onClose}
            className="w-full text-sm text-text-secondary hover:text-foreground py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 rounded"
          >
            Done
          </button>
        </div>
      </div>
    </>
  )

  if (typeof document === "undefined") return null
  return createPortal(content, document.body)
}
