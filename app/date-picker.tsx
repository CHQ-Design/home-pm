"use client"

import { useEffect, useRef, useState } from "react"
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
  caption_label: "text-sm font-medium text-white",
  nav: "absolute inset-x-0 top-0 flex justify-between",
  button_previous:
    "h-8 w-8 flex items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors",
  button_next:
    "h-8 w-8 flex items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors",
  month_grid: "w-full border-collapse",
  weekdays: "flex",
  weekday: "text-zinc-500 text-xs font-normal w-9 h-8 flex items-center justify-center",
  weeks: "space-y-1 mt-1",
  week: "flex",
  day: "w-9 h-9 p-0 text-center",
  day_button:
    "w-9 h-9 rounded-md text-sm text-zinc-200 hover:bg-zinc-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
  selected: "[&>button]:bg-blue-600 [&>button]:text-white [&>button]:hover:bg-blue-700 [&>button]:font-medium",
  today: "[&>button]:text-blue-400 [&>button]:font-medium",
  outside: "[&>button]:text-zinc-600",
  disabled: "[&>button]:text-zinc-700 [&>button]:cursor-not-allowed",
  hidden: "invisible",
  focused: "",
  chevron: "fill-current",
}

export default function DatePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selected = value ? toLocalDate(value) : undefined

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open])

  function handleSelect(day: Date | undefined) {
    onChange(day ? toDateStr(day) : "")
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        readOnly
        value={formatDisplay(value)}
        onClick={() => setOpen(v => !v)}
        placeholder="No date"
        className="w-full text-sm bg-zinc-800 border border-zinc-600 rounded-md px-3 py-2 text-white placeholder-zinc-500 outline-none focus:border-blue-500 cursor-pointer"
      />
      {value && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onChange(""); setOpen(false) }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs leading-none"
          aria-label="Clear date"
        >
          ✕
        </button>
      )}

      {open && (
        <div className="absolute bottom-full left-0 mb-2 z-20 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-3">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={selected ?? new Date()}
            classNames={calendarClassNames}
          />
        </div>
      )}
    </div>
  )
}
