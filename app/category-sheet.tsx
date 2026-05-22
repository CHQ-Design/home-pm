"use client"

import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { IconCheck } from "@tabler/icons-react"
import { CATEGORIES } from "@/lib/categories"
import type { CategoryValue } from "@/lib/categories"

export default function CategorySheet({
  value,
  onSelect,
  onClose,
}: {
  value: CategoryValue | null
  onSelect: (v: CategoryValue | null) => void
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
      <div
        className="fixed inset-0 z-40 bg-black/40"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Select category"
        className="fixed bottom-0 left-0 right-0 z-50 bg-surface-warm rounded-t-2xl border-t border-border-card"
        style={{ animation: "slide-up 200ms ease-out", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-border-card" />
        </div>
        <p className="text-center text-sm font-medium text-text-secondary py-2">Category</p>
        <ul>
          {CATEGORIES.map((cat, i) => {
            const isSelected = value === cat.value
            return (
              <li key={cat.value}>
                <button
                  ref={i === 0 ? firstItemRef : undefined}
                  onClick={() => { onSelect(cat.value); onClose() }}
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
              onClick={() => { onSelect(null); onClose() }}
              className="w-full flex items-center gap-3 px-5 min-h-[52px] text-left hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
              aria-pressed={value === null}
            >
              <span className="flex-1 text-sm text-text-secondary">None</span>
              {value === null && <IconCheck size={16} className="text-accent shrink-0" aria-hidden="true" />}
            </button>
          </li>
        </ul>
      </div>
    </>
  )

  if (typeof document === "undefined") return null
  return createPortal(content, document.body)
}
