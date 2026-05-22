import { IconHome, IconUsers, IconShoppingBag, IconFileText, IconHeartbeat, IconUser } from "@tabler/icons-react"
import type { ComponentType } from "react"

export const CATEGORY_VALUES = ["HOME", "KIDS", "ERRANDS", "ADMIN", "HEALTH", "PERSONAL"] as const
export type CategoryValue = typeof CATEGORY_VALUES[number]

// Sentinel used in URL params / filter state to represent "no category set"
export const UNCATEGORIZED = "UNCATEGORIZED" as const

type IconComponent = ComponentType<{ size?: number; className?: string; strokeWidth?: number }>

export const CATEGORIES: { value: CategoryValue; label: string; Icon: IconComponent }[] = [
  { value: "HOME",     label: "Home",     Icon: IconHome },
  { value: "KIDS",     label: "Kids",     Icon: IconUsers },
  { value: "ERRANDS",  label: "Errands",  Icon: IconShoppingBag },
  { value: "ADMIN",    label: "Admin",    Icon: IconFileText },
  { value: "HEALTH",   label: "Health",   Icon: IconHeartbeat },
  { value: "PERSONAL", label: "Personal", Icon: IconUser },
]

export function getCategoryMeta(value: CategoryValue | null | undefined) {
  if (!value) return null
  return CATEGORIES.find(c => c.value === value) ?? null
}
