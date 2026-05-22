"use client"

import { useState, useTransition } from "react"
import { updateHouseholdSoundEnabled } from "./actions"

export default function SoundSettingToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [, startTransition] = useTransition()

  function handleToggle() {
    const next = !enabled
    setEnabled(next)
    startTransition(() => {
      updateHouseholdSoundEnabled(next).catch(() => {
        setEnabled(!next)
      })
    })
  }

  return (
    <div className="mb-8 pb-6 border-b border-border">
      <h2 className="font-serif text-lg font-semibold text-foreground mb-3">Sound</h2>
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={enabled}
          onChange={handleToggle}
          className="accent-accent mt-1"
        />
        <span>
          <span className="text-sm text-foreground block">Completion sound</span>
          <span className="text-xs text-text-secondary block mt-0.5">
            Plays a quiet chime when something gets checked off.
          </span>
        </span>
      </label>
    </div>
  )
}
