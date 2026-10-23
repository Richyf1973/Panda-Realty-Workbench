import type { EntityEmailItem } from "@/app/api/admin/properties/[id]/entity-emails/route"

export const GROUP_LABELS: Record<EntityEmailItem["type"], string> = {
  owner: "Owner",
  buyer: "Buyer",
  contact: "Contact",
  tenant: "Tenant",
  member: "Member",
}

export const GROUP_ORDER: EntityEmailItem["type"][] = [
  "owner",
  "buyer",
  "contact",
  "tenant",
  "member",
]

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function hasInvalidEmailChips(...chipArrays: string[][]): boolean {
  return chipArrays.flat().some((chip) => !isValidEmail(chip))
}

export function joinChips(chips: string[]): string | undefined {
  const joined = chips.join(",")
  return joined || undefined
}
