export function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
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
