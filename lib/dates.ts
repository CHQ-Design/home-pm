export function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function todayInTz(timezone: string): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: timezone })
}

// Returns the date string (YYYY-MM-DD) for the Sunday that ends the current
// calendar week in the given timezone (ISO week: Mon–Sun).
export function endOfWeekStr(timezone: string): string {
  const todayStr = todayInTz(timezone)
  const [y, m, d] = todayStr.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const dow = date.getUTCDay() // 0 = Sun, 1 = Mon, …, 6 = Sat
  const daysUntilSunday = dow === 0 ? 0 : 7 - dow
  date.setUTCDate(date.getUTCDate() + daysUntilSunday)
  return date.toISOString().slice(0, 10)
}

export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

export function utcDateStr(date: Date | string): string {
  return new Date(date).toISOString().slice(0, 10)
}

export function daysDiff(date: Date | string, todayStr: string): number {
  const dueStr = utcDateStr(date)
  return Math.round((new Date(dueStr).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24))
}

export function greeting(hour = new Date().getHours()): string {
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`
}

export function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
}

export function formatShortDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
}

export function formatTimestamp(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function formatToastDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })
}
