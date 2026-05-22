import { getCategoryMeta } from "@/lib/categories"
import type { CategoryValue } from "@/lib/categories"

export default function CategoryTag({ value, size = "sm" }: {
  value: CategoryValue
  size?: "sm" | "md"
}) {
  const cat = getCategoryMeta(value)
  if (!cat) return null
  const { Icon, label } = cat
  return (
    <span className="inline-flex items-center gap-1 text-text-secondary">
      <Icon size={size === "sm" ? 12 : 16} aria-hidden="true" />
      <span className={size === "sm" ? "text-xs" : "text-sm"}>{label}</span>
    </span>
  )
}
