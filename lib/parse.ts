export function parseReminder(raw: string | null | undefined): number | null {
  if (!raw || raw === "") return null
  const n = parseInt(raw, 10)
  return isNaN(n) || n < 0 ? null : n
}
