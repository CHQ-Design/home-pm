import { utcDateStr } from "./dates"

export type Bucket = "today" | "thisWeek" | "later"

// See docs/today-bucketing-eng-brief.md for the canonical bucket rules.
// Today: dueDate <= today (any priority)
// This week: dueDate tomorrow through end of current calendar week (Sunday in user TZ),
//            OR undated high-priority
// Later: everything else
export function bucketForTask(
  dueDate: Date | string | null | undefined,
  priority: string,
  today: string,
  endOfWeek: string
): Bucket {
  if (!dueDate) {
    return priority === "high" ? "thisWeek" : "later"
  }
  const dateStr = utcDateStr(dueDate)
  if (dateStr <= today) return "today"
  if (dateStr <= endOfWeek) return "thisWeek"
  return "later"
}

export function bucketForRoutine(nextDue: Date | string, today: string, endOfWeek: string): Bucket {
  const dateStr = utcDateStr(nextDue)
  if (dateStr <= today) return "today"
  if (dateStr <= endOfWeek) return "thisWeek"
  return "later"
}
