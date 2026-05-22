"use client"

import { useEffect } from "react"

interface UndoToastProps {
  message: string
  onUndo: () => void
  onDismiss: () => void
}

export default function UndoToast({ message, onUndo, onDismiss }: UndoToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-28 left-1/2 -translate-x-1/2 md:bottom-6 md:left-auto md:right-6 md:translate-x-0 z-50 flex items-center gap-4 px-4 py-3 bg-background rounded-xl border border-border-subtle shadow-lift text-sm animate-[fade-in_0.2s_ease]"
      style={{ minWidth: 240, maxWidth: "calc(100vw - 2rem)" }}
    >
      <span className="flex-1 text-foreground">{message}</span>
      <button
        onClick={onUndo}
        className="text-warm-text underline underline-offset-2 hover:text-warm shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
      >
        Undo
      </button>
    </div>
  )
}
