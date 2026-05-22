import { utcDateStr, daysDiff } from "./dates"

export type Bucket = "today" | "thisWeek" | "later"

// See docs/today-bucketing-eng-brief.md for the canonical bucket rules.
// Today: overdue (any priority), OR due-today high-priority
// This week: due in next 1-3 calendar days, OR undated high-priority
// Later: everything else (today non-high, 4+ days out, undated non-high)
export function bucketForTask(
  dueDate: Date | string | null | undefined,
  priority: string,
  today: string
): Bucket {
  if (!dueDate) {
    return priority === "high" ? "thisWeek" : "later"
  }
  const dateStr = utcDateStr(dueDate)
  if (dateStr < today) return "today"
  if (dateStr === today && priority === "high") return "today"
  const diff = daysDiff(dueDate, today)
  if (diff >= 1 && diff <= 3) return "thisWeek"
  return "later"
}

export function bucketForRoutine(nextDue: Date | string, today: string): Bucket {
  const dateStr = utcDateStr(nextDue)
  if (dateStr <= today) return "today"
  const diff = daysDiff(nextDue, today)
  if (diff >= 1 && diff <= 3) return "thisWeek"
  return "later"
}
