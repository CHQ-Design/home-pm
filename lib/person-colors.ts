const PALETTE: Array<{ bg: string; text: string; border: string }> = [
  { bg: "#EDE0D0", text: "#6B4C2A", border: "#C8A882" },
  { bg: "#D8E6DC", text: "#3A5C44", border: "#91B89A" },
  { bg: "#EDE0E6", text: "#6B3A52", border: "#C8899A" },
  { bg: "#E0E4ED", text: "#3A4461", border: "#8891B8" },
  { bg: "#E8E4D8", text: "#5C5230", border: "#B0A87A" },
]

export const PERSON_COLOR_FALLBACK = { bg: "#EDE6D8", text: "#8C7D6A", border: "#C8BFAD" }

export function getPersonColor(
  people: { id: number }[],
  personId: number
): { bg: string; text: string; border: string } {
  const sorted = [...people].sort((a, b) => a.id - b.id)
  const index = sorted.findIndex(p => p.id === personId)
  if (index === -1) return PERSON_COLOR_FALLBACK
  return PALETTE[index % PALETTE.length]
}
