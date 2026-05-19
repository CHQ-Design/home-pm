"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
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
  const [listPos, setListPos] = useState({ top: 0, left: 0, width: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const currentLabel = options.find(o => o.value === value)?.label ?? placeholder ?? ""

  function openList() {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setListPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    setFocusedIndex(options.findIndex(o => o.value === value))
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return

    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node
      if (!triggerRef.current?.contains(target) && !listRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener("mousedown", onMouseDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onMouseDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!open || focusedIndex < 0) return
    listRef.current?.children[focusedIndex]?.scrollIntoView({ block: "nearest" })
  }, [open, focusedIndex])

  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault()
      openList()
    }
  }

  function handleOptionKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === "ArrowDown") { e.preventDefault(); setFocusedIndex(Math.min(index + 1, options.length - 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setFocusedIndex(Math.max(index - 1, 0)) }
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onChange(options[index].value)
      setOpen(false)
      triggerRef.current?.focus()
    } else if (e.key === "Tab") {
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      {name && <input type="hidden" name={name} value={value} />}
      <button
        ref={triggerRef}
        type="button"
        data-trigger
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => open ? setOpen(false) : openList()}
        onKeyDown={handleTriggerKeyDown}
        className="w-full flex items-center justify-between gap-1 bg-surface-warm border border-border-card rounded-md px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 text-left"
      >
        <span className={value ? "text-foreground" : "text-text-muted"}>{currentLabel}</span>
        <IconChevronDown size={14} aria-hidden="true" className="shrink-0 text-text-secondary" />
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <ul
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          className="fixed z-[200] bg-surface-raised border border-border-card rounded-lg shadow-md overflow-hidden"
          style={{ top: listPos.top, left: listPos.left, width: listPos.width }}
        >
          {options.map((opt, i) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              tabIndex={focusedIndex === i ? 0 : -1}
              ref={el => { if (focusedIndex === i) el?.focus() }}
              onMouseEnter={() => setFocusedIndex(i)}
              onClick={() => { onChange(opt.value); setOpen(false); triggerRef.current?.focus() }}
              onKeyDown={e => handleOptionKeyDown(e, i)}
              className={`px-3 py-2.5 text-sm cursor-pointer outline-none min-h-[44px] flex items-center
                ${opt.value === value ? "text-accent font-medium" : "text-foreground"}
                ${focusedIndex === i ? "bg-accent/10" : "hover:bg-accent/10"}`}
            >
              {opt.label}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  )
}
