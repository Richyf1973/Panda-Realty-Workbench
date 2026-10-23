import "server-only"

import type { ContributingOwnerRef } from "@/lib/google-contacts-patch-all-aggregates.types"

export function normalizeEmailKey(email: string): string {
  return email.trim().toLowerCase()
}

export function ownerRefMapKey(ref: ContributingOwnerRef): string {
  return `${ref.propertyListId}-${ref.slot}`
}
