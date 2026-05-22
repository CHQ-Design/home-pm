export const VALID_UNITS = ["day", "week", "month", "year", "weekday"] as const
export type Unit = typeof VALID_UNITS[number]

export function computeNextDue(from: Date, value: number, unit: Unit): Date {
  const d = new Date(from)
  switch (unit) {
    case "day":  d.setDate(d.getDate() + value); break
    case "week": d.setDate(d.getDate() + value * 7); break
    case "month": {
      const day = d.getDate()
      d.setDate(1)
      d.setMonth(d.getMonth() + value)
      d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
      break
    }
    case "year": {
      const day = d.getDate()
      d.setDate(1)
      d.setFullYear(d.getFullYear() + value)
      d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
      break
    }
    case "weekday":
      for (let i = 0; i < value; i++) {
        d.setDate(d.getDate() + 1)
        if (d.getDay() === 6) d.setDate(d.getDate() + 2) // Sat → Mon
        if (d.getDay() === 0) d.setDate(d.getDate() + 1) // Sun → Mon
      }
      break
  }
  return d
}

export function computePrevDue(from: Date, value: number, unit: Unit): Date {
  const d = new Date(from)
  switch (unit) {
    case "day":  d.setDate(d.getDate() - value); break
    case "week": d.setDate(d.getDate() - value * 7); break
    case "month": {
      const day = d.getDate()
      d.setDate(1)
      d.setMonth(d.getMonth() - value)
      d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
      break
    }
    case "year": {
      const day = d.getDate()
      d.setDate(1)
      d.setFullYear(d.getFullYear() - value)
      d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
      break
    }
    case "weekday":
      for (let i = 0; i < value; i++) {
        d.setDate(d.getDate() - 1)
        while (d.getDay() === 6 || d.getDay() === 0) d.setDate(d.getDate() - 1)
      }
      break
  }
  return d
}

// Lazy streak reset: returns the effective streak at read time without writing to DB.
// Pass `now` explicitly so callers can control it in tests.
export function computeEffectiveStreak(
  task: {
    streak: number
    nextDue: Date
    lastActionAt: Date | null
    intervalValue: number
    intervalUnit: string
  },
  now = new Date()
): number {
  if (task.streak <= 0) return 0
  if (task.nextDue > now) return task.streak
  const prevCycleStart = computePrevDue(task.nextDue, task.intervalValue, task.intervalUnit as Unit)
  if (task.lastActionAt === null || task.lastActionAt < prevCycleStart) return 0
  return task.streak
}
