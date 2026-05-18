"use client"

import { useEffect, useRef, useState } from "react"
import { IconChevronDown } from "@tabler/icons-react"

export interface SelectOption {
  label: string
  value: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  name?: string       // renders a hidden input for FormData-based forms
  placeholder?: string
  "aria-label"?: string
}

export default function CustomSelect({ value, onChange, options, name, placeholder, "aria-label": ariaLabel }: Props) {
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const currentLabel = options.find(o => o.value === value)?.label ?? placeholder ?? ""

  useEffect(() => {
    if (!open) return
    setFocusedIndex(options.findIndex(o => o.value === value))

    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); containerRef.current?.querySelector<HTMLElement>("[data-trigger]")?.focus() }
    }
    document.addEventListener("mousedown", onMouseDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onMouseDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open, options, value])

  useEffect(() => {
    if (!open || focusedIndex < 0) return
    listRef.current?.children[focusedIndex]?.scrollIntoView({ block: "nearest" })
  }, [open, focusedIndex])

  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault()
      setOpen(true)
    }
  }

  function handleOptionKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === "ArrowDown") { e.preventDefault(); setFocusedIndex(Math.min(index + 1, options.length - 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setFocusedIndex(Math.max(index - 1, 0)) }
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onChange(options[index].value)
      setOpen(false)
      containerRef.current?.querySelector<HTMLElement>("[data-trigger]")?.focus()
    } else if (e.key === "Tab") {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {name && <input type="hidden" name={name} value={value} />}
      <button
        type="button"
        data-trigger
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        onKeyDown={handleTriggerKeyDown}
        className="w-full flex items-center justify-between gap-1 bg-[#F2ECE2] border border-[#D4C9B5] rounded-md px-3 py-2 text-sm text-[#3A3228] outline-none focus:border-accent focus:ring-1 focus:ring-[#6B7A5A]/20 text-left"
      >
        <span className={value ? "text-[#3A3228]" : "text-[#A09080]"}>{currentLabel}</span>
        <IconChevronDown size={14} aria-hidden="true" className="shrink-0 text-[#8C7D6A]" />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute z-50 mt-1 w-full bg-[#F4EEE3] border border-[#D4C9B5] rounded-lg shadow-md overflow-hidden"
        >
          {options.map((opt, i) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              tabIndex={focusedIndex === i ? 0 : -1}
              ref={el => { if (focusedIndex === i) el?.focus() }}
              onMouseEnter={() => setFocusedIndex(i)}
              onClick={() => { onChange(opt.value); setOpen(false); containerRef.current?.querySelector<HTMLElement>("[data-trigger]")?.focus() }}
              onKeyDown={e => handleOptionKeyDown(e, i)}
              className={`px-3 py-2.5 text-sm cursor-pointer outline-none min-h-[44px] flex items-center
                ${opt.value === value ? "text-accent font-medium" : "text-[#3A3228]"}
                ${focusedIndex === i ? "bg-[#6B7A5A]/10" : "hover:bg-[#6B7A5A]/10"}`}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
