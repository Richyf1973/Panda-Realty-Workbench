import "server-only"

import { maxPropertyRole } from "@/lib/google-contact-name-prefix"
import { normalizePhoneDigits } from "@/lib/google-contact-dialable"
import { buildGoogleContactMemberIdentity } from "@/lib/google-contacts-member-name"
import type { EntityMemberBulkRow } from "@/lib/google-contacts-bulk-addresses.server"
import type { EmailAggWithContributors, PhoneOnlyAggWithContributors } from "@/lib/google-contacts-patch-all-aggregates.types"
import { normalizeEmailKey } from "@/lib/google-contacts-agg-utils.server"

function addParentEntityName(target: Set<string> | undefined, name: string): Set<string> {
  const trimmed = name.trim()
  if (!trimmed) return target ?? new Set<string>()
  const next = target ?? new Set<string>()
  next.add(trimmed)
  return next
}

export function aggregateRepRows(
  repRows: readonly EntityMemberBulkRow[],
  byRepEmail: Map<string, EmailAggWithContributors>,
  byRepPhoneOnly: Map<string, PhoneOnlyAggWithContributors>,
): void {
  for (const row of repRows) {
    const emailRaw = row.memberEmailAddress?.trim() ?? ""
    const repPhone = row.memberPhoneNumber
    const memberIdentity = buildGoogleContactMemberIdentity({
      memberName: row.memberName,
      parentEntityName: row.entityName,
      parentEntityCategorySlug: row.entityCategorySlug,
      isBuyersRepresentative: row.isBuyersRepresentative,
    })
    const street = row.streetAddress ?? null

    if (emailRaw.length > 0) {
      const key = normalizeEmailKey(emailRaw)
      const existing = byRepEmail.get(key)
      if (!existing) {
        byRepEmail.set(key, {
          canonicalEmail: emailRaw,
          entityName: memberIdentity.entityName,
          parentEntityNames: addParentEntityName(undefined, row.entityName),
          phoneNumber: repPhone,
          propertyRole: memberIdentity.propertyRole,
          streets: street ? [street] : [],
          fromEntity: true,
          fromOwner: false,
          contributingEntityIds: new Set([row.entityId]),
          contributingOwners: new Map(),
        })
      } else {
        existing.propertyRole = maxPropertyRole(existing.propertyRole, memberIdentity.propertyRole)
        existing.parentEntityNames = addParentEntityName(existing.parentEntityNames, row.entityName)
        if (repPhone && !existing.phoneNumber) {
          existing.phoneNumber = repPhone
        } else if (
          repPhone &&
          existing.phoneNumber &&
          normalizePhoneDigits(repPhone) !== normalizePhoneDigits(existing.phoneNumber)
        ) {
          // Different phone — separate person sharing an email; give them their own phone-only contact
          const pKey = normalizePhoneDigits(repPhone)
          const existingP = byRepPhoneOnly.get(pKey)
          if (!existingP) {
            byRepPhoneOnly.set(pKey, {
              normalizedDigits: pKey,
              displayPhone: repPhone,
              entityName: memberIdentity.entityName,
              parentEntityNames: addParentEntityName(undefined, row.entityName),
              propertyRole: memberIdentity.propertyRole,
              streets: street ? [street] : [],
              fromEntity: true,
              fromOwner: false,
              contributingEntityIds: new Set([row.entityId]),
              contributingOwners: new Map(),
            })
          } else {
            existingP.propertyRole = maxPropertyRole(existingP.propertyRole, memberIdentity.propertyRole)
            existingP.parentEntityNames = addParentEntityName(existingP.parentEntityNames, row.entityName)
            if (street && !existingP.streets.includes(street)) existingP.streets.push(street)
            existingP.contributingEntityIds.add(row.entityId)
          }
        }
        if (street && !existing.streets.includes(street)) existing.streets.push(street)
        existing.contributingEntityIds.add(row.entityId)
      }
    } else if (repPhone) {
      const pKey = normalizePhoneDigits(repPhone)
      const existingP = byRepPhoneOnly.get(pKey)
      if (!existingP) {
        byRepPhoneOnly.set(pKey, {
          normalizedDigits: pKey,
          displayPhone: repPhone,
          entityName: memberIdentity.entityName,
          parentEntityNames: addParentEntityName(undefined, row.entityName),
          propertyRole: memberIdentity.propertyRole,
          streets: street ? [street] : [],
          fromEntity: true,
          fromOwner: false,
          contributingEntityIds: new Set([row.entityId]),
          contributingOwners: new Map(),
        })
      } else {
        existingP.propertyRole = maxPropertyRole(existingP.propertyRole, memberIdentity.propertyRole)
        existingP.parentEntityNames = addParentEntityName(existingP.parentEntityNames, row.entityName)
        if (street && !existingP.streets.includes(street)) existingP.streets.push(street)
        existingP.contributingEntityIds.add(row.entityId)
      }
    }
  }
}
