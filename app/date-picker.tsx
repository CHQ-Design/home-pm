"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { DayPicker } from "react-day-picker"

interface Props {
  value: string // YYYY-MM-DD or ""
  onChange: (value: string) => void
}

function toLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function toDateStr(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function formatDisplay(dateStr: string): string {
  if (!dateStr) return ""
  return toLocalDate(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const calendarClassNames = {
  root: "w-64 select-none",
  months: "",
  month: "space-y-2",
  month_caption: "flex justify-center items-center relative h-8",
  caption_label: "text-sm font-medium text-foreground",
  nav: "absolute inset-x-0 top-0 flex justify-between",
  button_previous:
    "h-8 w-8 flex items-center justify-center rounded-md text-text-secondary hover:bg-border-subtle hover:text-foreground transition-colors",
  button_next:
    "h-8 w-8 flex items-center justify-center rounded-md text-text-secondary hover:bg-border-subtle hover:text-foreground transition-colors",
  month_grid: "w-full border-collapse",
  weekdays: "flex",
  weekday: "text-text-muted text-xs font-normal w-9 h-8 flex items-center justify-center",
  weeks: "space-y-1 mt-1",
  week: "flex",
  day: "w-9 h-9 p-0 text-center",
  day_button:
    "w-9 h-9 rounded-md text-sm text-foreground hover:bg-surface hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
  selected:
    "[&>button]:bg-accent [&>button]:text-white [&>button]:hover:bg-accent-hover [&>button]:font-medium",
  today: "[&>button]:text-accent [&>button]:font-medium [&>button]:ring-1 [&>button]:ring-accent [&>button]:ring-inset",
  outside: "[&>button]:text-text-faint",
  disabled: "[&>button]:text-text-faint [&>button]:cursor-not-allowed",
  hidden: "invisible",
  focused: "",
  chevron: "fill-current",
}

// container is w-64 (256px) + p-3 (12px × 2) + border (1px × 2) = 282px
const CAL_WIDTH = 282
// Actual rendered height is ~330–340px (header + weekday row + 6 week rows + padding).
// Use 350 so the above/below decision and the bottom clamp both stay safe.
const CAL_HEIGHT = 350
const MARGIN = 8

export default function DatePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [calPos, setCalPos] = useState({ top: 0, left: 0 })
  const inputRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)
  const selected = value ? toLocalDate(value) : undefined

  function openCalendar() {
    if (!inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    const vp = window.visualViewport
    const vw = vp?.width ?? window.innerWidth
    const vh = vp?.height ?? window.innerHeight

    const spaceAbove = rect.top - MARGIN
    const spaceBelow = vh - rect.bottom - MARGIN

    // Prefer above when there's room; fall back to below; otherwise pick the larger side.
    let top: number
    if (spaceAbove >= CAL_HEIGHT) {
      top = rect.top - CAL_HEIGHT - MARGIN
    } else if (spaceBelow >= CAL_HEIGHT) {
      top = rect.bottom + MARGIN
    } else {
      top = spaceAbove >= spaceBelow
        ? MARGIN
        : Math.max(MARGIN, vh - CAL_HEIGHT - MARGIN)
    }

    // Hard clamp: never let the calendar extend past either edge of the viewport.
    // This is what prevents iOS Safari from expanding the page to accommodate it.
    top = Math.max(MARGIN, Math.min(top, vh - CAL_HEIGHT - MARGIN))

    const rawLeft = rect.left
    const left = Math.max(MARGIN, Math.min(rawLeft, vw - CAL_WIDTH - MARGIN))

    setCalPos({ top, left })
    setOpen(v => !v)
  }

  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node
      if (
        !inputRef.current?.contains(target) &&
        !calendarRef.current?.contains(target)
      ) {
        setOpen(false)
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onMouseDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onMouseDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  function handleSelect(day: Date | undefined) {
    onChange(day ? toDateStr(day) : "")
  }

  return (
    <div ref={inputRef} className="relative">
      {/*
        Use a button, not a readOnly input. iOS Safari auto-zooms (scales the
        viewport) when any input with font-size < 16px is focused — even readonly
        ones. That zoom is what causes the "screen expanding outside the viewport"
        bug. Buttons never trigger keyboard, zoom, or focus-scroll on iOS.
      */}
      <button
        type="button"
        data-control="trigger"
        onClick={openCalendar}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openCalendar() } }}
        className="w-full text-sm text-left bg-surface-warm border border-border-card rounded-md px-3 py-2 text-foreground outline-none focus-visible:border-accent cursor-pointer"
        style={{ touchAction: "manipulation" }}
      >
        {value
          ? formatDisplay(value)
          : <span className="text-text-muted">No date</span>
        }
      </button>
      {value && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            onChange("")
            setOpen(false)
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-hover text-xs leading-none"
          aria-label="Clear date"
        >
          ✕
        </button>
      )}

      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={calendarRef}
          className="fixed z-[200] bg-surface-raised border border-border-card rounded-xl p-3 overflow-hidden w-[282px]"
          style={{ top: calPos.top, left: calPos.left }}
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            onDayClick={() => setOpen(false)}
            defaultMonth={selected ?? new Date()}
            classNames={calendarClassNames}
          />
        </div>,
        document.body
      )}
    </div>
  )
}
