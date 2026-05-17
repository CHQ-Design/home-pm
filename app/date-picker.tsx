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
  selected:
    "[&>button]:bg-blue-600 [&>button]:text-white [&>button]:hover:bg-blue-700 [&>button]:font-medium",
  today: "[&>button]:text-blue-400 [&>button]:font-medium",
  outside: "[&>button]:text-zinc-600",
  disabled: "[&>button]:text-zinc-700 [&>button]:cursor-not-allowed",
  hidden: "invisible",
  focused: "",
  chevron: "fill-current",
}

const CAL_WIDTH = 256
const CAL_HEIGHT = 300
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

    // Prefer opening above; fall back to below if no room
    const spaceAbove = rect.top - MARGIN
    const top =
      spaceAbove >= CAL_HEIGHT
        ? rect.top - CAL_HEIGHT - MARGIN
        : rect.bottom + MARGIN

    // Clamp left so calendar never bleeds off screen
    const rawLeft = rect.left
    const left = Math.min(rawLeft, window.innerWidth - CAL_WIDTH - MARGIN)

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
      <input
        readOnly
        value={formatDisplay(value)}
        onClick={openCalendar}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openCalendar() } }}
        placeholder="No date"
        className="w-full text-sm bg-zinc-800 border border-zinc-600 rounded-md px-3 py-2 text-white placeholder-zinc-500 outline-none focus:border-blue-500 cursor-pointer"
      />
      {value && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            onChange("")
            setOpen(false)
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs leading-none"
          aria-label="Clear date"
        >
          ✕
        </button>
      )}

      {open && (
        <div
          ref={calendarRef}
          className="fixed z-[200] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-3"
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
        </div>
      )}
    </div>
  )
}
