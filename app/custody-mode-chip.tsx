"use client"

import { useEffect, useState, useTransition } from "react"
import { IconArrowsExchange } from "@tabler/icons-react"
import { setUserCustodyMode } from "@/app/settings/actions"

export type CustodyMode = "with_kids" | "without_kids"

const MODE_LABEL: Record<CustodyMode, string> = {
  with_kids: "With kids",
  without_kids: "Without kids",
}
const OTHER: Record<CustodyMode, CustodyMode> = {
  with_kids: "without_kids",
  without_kids: "with_kids",
}

const STORAGE_KEY = "custodyModeDate"

export default function CustodyModeChip({
  initialMode,
  onModeChange,
}: {
  initialMode: CustodyMode | null
  onModeChange: (mode: CustodyMode | null) => void
}) {
  const [mode, setMode] = useState<CustodyMode | null>(initialMode)
  const [isStale, setIsStale] = useState(false)
  const [, startTransition] = useTransition()

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const today = new Date().toLocaleDateString("en-CA")
    setIsStale(mode !== null && stored !== today)
  }, [mode])

  function handleTap() {
    const next: CustodyMode = mode ? OTHER[mode] : "with_kids"
    setMode(next)
    setIsStale(false)
    onModeChange(next)
    localStorage.setItem(STORAGE_KEY, new Date().toLocaleDateString("en-CA"))
    startTransition(() => setUserCustodyMode(next))
  }

  const label = mode ? MODE_LABEL[mode] : "Set mode"

  return (
    <button
      onClick={handleTap}
      aria-label={
        mode
          ? `Day mode: ${MODE_LABEL[mode]}. Tap to switch to ${MODE_LABEL[OTHER[mode]]}`
          : "Set day mode"
      }
      className={`text-xs px-3 rounded-lg transition-colors touch-manipulation min-h-[44px] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 inline-flex items-center gap-1.5 border font-medium ${
        !mode
          ? "bg-surface text-text-muted border-border-chip"
          : isStale
            ? "bg-surface text-text-secondary border-border-chip"
            : "bg-surface-raised text-foreground border-border"
      }`}
    >
      <IconArrowsExchange size={12} aria-hidden="true" />
      {label}
      {isStale && (
        <span className="w-1.5 h-1.5 rounded-full bg-text-secondary shrink-0" aria-hidden="true" />
      )}
    </button>
  )
}
