export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const TIME_RE = /^\d{2}:\d{2}$/

export function parseReminder(raw: string | null | undefined): number | null {
  if (!raw || raw === "") return null
  const n = parseInt(raw, 10)
  return isNaN(n) || n < 0 ? null : n
}

export function parseId(raw: string | null | undefined): number | null {
  if (!raw) return null
  const n = parseInt(raw, 10)
  return isNaN(n) || n <= 0 ? null : n
}

export function parseTime(raw: string | null | undefined): string | null {
  if (!raw) return null
  return TIME_RE.test(raw) ? raw : null
}

export function parseDate(raw: string | null | undefined): Date | null {
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}
