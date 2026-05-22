"use client"

import { useEffect, useRef } from "react"
import { IconCheck, IconClockUp, IconPlayerSkipForward, IconArrowMoveUp } from "@tabler/icons-react"
import { daysDiff } from "@/lib/dates"

export type RoutineVerb = "done" | "snooze" | "skip" | "move-to-today"

interface RoutineActionSheetProps {
  taskTitle: string
  nextDue: Date | string
  today: string
  anchorRect: DOMRect | null
  onAction: (verb: RoutineVerb) => void
  onClose: () => void
}

const ACTIONS: { verb: RoutineVerb; label: string; Icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean | "true" }> }[] = [
  { verb: "done",          label: "Mark done",       Icon: IconCheck },
  { verb: "snooze",        label: "Snooze 1 day",    Icon: IconClockUp },
  { verb: "skip",          label: "Skip this cycle", Icon: IconPlayerSkipForward },
  { verb: "move-to-today", label: "Move to today",   Icon: IconArrowMoveUp },
]

export default function RoutineActionSheet({ taskTitle, nextDue, today, anchorRect, onAction, onClose }: RoutineActionSheetProps) {
  const moveToTodayDisabled = daysDiff(nextDue, today) <= 0
  const firstBtnRef = useRef<HTMLButtonElement>(null)

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [onClose])

  // Focus first action on open
  useEffect(() => {
    firstBtnRef.current?.focus()
  }, [])

  // Desktop popover positioning (safe — this component only mounts on client via user interaction)
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768
  const popoverStyle: React.CSSProperties | undefined = isDesktop && anchorRect ? {
    position: "fixed",
    right: window.innerWidth - anchorRect.right,
    ...(anchorRect.top > window.innerHeight / 2
      ? { bottom: window.innerHeight - anchorRect.top + 4 }
      : { top: anchorRect.bottom + 4 }),
  } : undefined

  const sharedItemClass =
    "flex items-center gap-3 w-full px-4 py-3.5 text-left text-sm text-foreground hover:bg-surface-hover focus-visible:outline-none focus-visible:bg-surface-hover transition-colors"

  function items(autoFocusFirst = false) {
    return ACTIONS.map(({ verb, label, Icon }, i) => {
      const disabled = verb === "move-to-today" && moveToTodayDisabled
      return (
        <button
          key={verb}
          ref={i === 0 && autoFocusFirst ? firstBtnRef : undefined}
          onClick={() => !disabled && onAction(verb)}
          aria-disabled={disabled ? "true" : undefined}
          className={`${sharedItemClass} ${disabled ? "opacity-40 cursor-default" : ""}`}
        >
          <Icon size={18} aria-hidden={true} />
          <span>{label}</span>
        </button>
      )
    })
  }

  if (isDesktop && popoverStyle) {
    return (
      <>
        <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
        <div
          role="dialog"
          aria-label={`Actions for ${taskTitle}`}
          aria-modal="true"
          className="z-50 bg-surface-raised rounded-xl border border-border-subtle shadow-lift overflow-hidden min-w-[220px]"
          style={popoverStyle}
        >
          <div className="px-4 pt-3.5 pb-2.5 border-b border-border-subtle">
            <p className="font-serif text-base text-foreground leading-snug">{taskTitle}</p>
          </div>
          <div className="divide-y divide-border-subtle">
            {items(true)}
          </div>
        </div>
      </>
    )
  }

  // Mobile bottom sheet
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-foreground/20"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-label={`Actions for ${taskTitle}`}
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-50 bg-surface-raised rounded-t-2xl shadow-lift animate-[slide-up_0.2s_ease]"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="px-4 pt-4 pb-3 border-b border-border-subtle">
          <p className="font-serif text-base text-foreground">{taskTitle}</p>
        </div>
        <div className="divide-y divide-border-subtle">
          {items(true)}
        </div>
        <div className="px-3 pt-2">
          <button
            onClick={onClose}
            className="w-full py-3.5 text-sm text-text-secondary rounded-xl hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  )
}
