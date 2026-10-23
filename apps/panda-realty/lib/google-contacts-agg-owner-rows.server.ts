import "server-only"

import { maxPropertyRole } from "@/lib/google-contact-name-prefix"
import { normalizePhoneDigits } from "@/lib/google-contact-dialable"
import type { OwnerSlotBulkRow } from "@/lib/google-contacts-bulk-addresses.server"
import type { ContributingOwnerRef, EmailAggWithContributors, PhoneOnlyAggWithContributors } from "@/lib/google-contacts-patch-all-aggregates.types"
import { normalizeEmailKey, ownerRefMapKey } from "@/lib/google-contacts-agg-utils.server"

export function aggregateOwnerRows(
  ownerRows: readonly OwnerSlotBulkRow[],
  byEmail: Map<string, EmailAggWithContributors>,
  byPhoneOnly: Map<string, PhoneOnlyAggWithContributors>,
): void {
  for (const row of ownerRows) {
    const street =
      typeof row.streetAddress === "string" && row.streetAddress.trim().length > 0
        ? row.streetAddress.trim()
        : null
    const emailRaw = row.emailAddress?.trim() ?? ""
    const ownerPhone = row.dialableOwnerPhone
    const ownerRef: ContributingOwnerRef = {
      propertyListId: row.propertyListId,
      slot: row.slot,
    }
    const ok = ownerRefMapKey(ownerRef)

    if (emailRaw.length > 0) {
      const key = normalizeEmailKey(emailRaw)
      const existing = byEmail.get(key)
      if (!existing) {
        byEmail.set(key, {
          canonicalEmail: emailRaw,
          entityName: row.entityName,
          phoneNumber: ownerPhone,
          propertyRole: "seller",
          streets: street ? [street] : [],
          fromEntity: false,
          fromOwner: true,
          contributingEntityIds: new Set(),
          contributingOwners: new Map([[ok, ownerRef]]),
        })
      } else {
        existing.fromOwner = true
        existing.contributingOwners.set(ok, ownerRef)
        existing.propertyRole = maxPropertyRole(existing.propertyRole, "seller")
        if (street) existing.streets.push(street)
        if (!existing.fromEntity) {
          existing.entityName = row.entityName
          existing.phoneNumber = ownerPhone ?? existing.phoneNumber
        } else if (!existing.phoneNumber && ownerPhone) {
          existing.phoneNumber = ownerPhone
        }
      }
    } else if (ownerPhone) {
      const pKey = normalizePhoneDigits(ownerPhone)
      const existingP = byPhoneOnly.get(pKey)
      if (!existingP) {
        byPhoneOnly.set(pKey, {
          normalizedDigits: pKey,
          displayPhone: ownerPhone,
          entityName: row.entityName,
          propertyRole: "seller",
          streets: street ? [street] : [],
          fromEntity: false,
          fromOwner: true,
          contributingEntityIds: new Set(),
          contributingOwners: new Map([[ok, ownerRef]]),
        })
      } else {
        existingP.fromOwner = true
        existingP.contributingOwners.set(ok, ownerRef)
        existingP.propertyRole = maxPropertyRole(existingP.propertyRole, "seller")
        if (street) existingP.streets.push(street)
        if (!existingP.fromEntity) {
          existingP.entityName = row.entityName
        }
      }
    }
  }
}
