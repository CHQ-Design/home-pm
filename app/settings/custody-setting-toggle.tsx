"use client"

import { useState, useTransition } from "react"
import { updateHouseholdCustodyModeEnabled } from "./actions"

export default function CustodySettingToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [, startTransition] = useTransition()

  function handleToggle() {
    const next = !enabled
    setEnabled(next)
    startTransition(() => {
      updateHouseholdCustodyModeEnabled(next).catch(() => setEnabled(!next))
    })
  }

  return (
    <div className="mb-8 pb-6 border-b border-border">
      <h2 className="font-serif text-lg font-semibold text-foreground mb-3">Day mode</h2>
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={enabled}
          onChange={handleToggle}
          className="accent-accent mt-1"
        />
        <span>
          <span className="text-sm text-foreground block">Kids home / away days</span>
          <span className="text-xs text-text-secondary block mt-0.5">
            Show different routines depending on whether your kids are with you today.
          </span>
        </span>
      </label>
    </div>
  )
}
