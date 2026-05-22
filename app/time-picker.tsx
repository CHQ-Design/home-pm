"use client"

const HOURS = Array.from({ length: 12 }, (_, i) => String(i === 0 ? 12 : i))
const MINUTES = ["00", "15", "30", "45"]

function toDisplay(value: string): { h: string; m: string; ampm: string } {
  if (!value) return { h: "", m: "", ampm: "AM" }
  const [hh, mm] = value.split(":")
  const hour = parseInt(hh, 10)
  const ampm = hour < 12 ? "AM" : "PM"
  const h = hour === 0 ? "12" : hour > 12 ? String(hour - 12) : String(hour)
  const m = MINUTES.includes(mm) ? mm : "00"
  return { h, m, ampm }
}

function toHHMM(h: string, m: string, ampm: string): string {
  if (!h) return ""
  let hour = parseInt(h, 10)
  if (ampm === "PM" && hour !== 12) hour += 12
  if (ampm === "AM" && hour === 12) hour = 0
  return `${String(hour).padStart(2, "0")}:${m || "00"}`
}

const triggerClass =
  "bg-surface-warm border border-border-card rounded-md px-2 py-2 text-base text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 appearance-none cursor-pointer"

interface Props {
  value: string // HH:MM or ""
  onChange: (value: string) => void
  name?: string // for hidden input
}

export default function TimePicker({ value, onChange, name }: Props) {
  const { h, m, ampm } = toDisplay(value)

  function update(next: { h?: string; m?: string; ampm?: string }) {
    const nh = next.h ?? h
    const nm = next.m ?? m
    const na = next.ampm ?? ampm
    if (!nh) { onChange(""); return }
    onChange(toHHMM(nh, nm || "00", na))
  }

  return (
    <div className="flex gap-1.5 items-center">
      {name && <input type="hidden" name={name} value={value} />}
      <select
        aria-label="Hour"
        value={h}
        onChange={e => update({ h: e.target.value })}
        style={{ fontSize: '16px' }}
        className={`${triggerClass} w-16`}
      >
        <option value="">--</option>
        {HOURS.map(hr => <option key={hr} value={hr}>{hr}</option>)}
      </select>
      <span className="text-text-secondary text-sm select-none">:</span>
      <select
        aria-label="Minute"
        value={m || "00"}
        onChange={e => update({ m: e.target.value })}
        style={{ fontSize: '16px' }}
        className={`${triggerClass} w-16`}
        disabled={!h}
      >
        {MINUTES.map(mn => <option key={mn} value={mn}>{mn}</option>)}
      </select>
      <select
        aria-label="AM or PM"
        value={ampm}
        onChange={e => update({ ampm: e.target.value })}
        style={{ fontSize: '16px' }}
        className={`${triggerClass} w-16`}
        disabled={!h}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
      {h && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-xs text-text-muted hover:text-text-hover leading-none"
          aria-label="Clear time"
        >
          ✕
        </button>
      )}
    </div>
  )
}
