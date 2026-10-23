import "server-only"

import { entityCategorySlugToPropertyRole, maxPropertyRole } from "@/lib/google-contact-name-prefix"
import { normalizePhoneDigits } from "@/lib/google-contact-dialable"
import { resolveEntityPhoneForGoogleSync } from "@/lib/google-contact-entity-phone"
import type { EntityBulkSyncRow } from "@/lib/google-contacts-patch-all-aggregates.types"
import type { EmailAggWithContributors, PhoneOnlyAggWithContributors } from "@/lib/google-contacts-patch-all-aggregates.types"
import { normalizeEmailKey } from "@/lib/google-contacts-agg-utils.server"

export function aggregateEntityRows(
  entityRows: readonly EntityBulkSyncRow[],
  byEmail: Map<string, EmailAggWithContributors>,
  byPhoneOnly: Map<string, PhoneOnlyAggWithContributors>,
): void {
  for (const row of entityRows) {
    const rawEmail =
      typeof row.emailAddress === "string" ? row.emailAddress.trim() : ""
    const dialableContact = resolveEntityPhoneForGoogleSync(row.contact)

    const street =
      typeof row.streetAddress === "string" && row.streetAddress.trim().length > 0
        ? row.streetAddress.trim()
        : null
    const name =
      typeof row.entityName === "string" && row.entityName.trim().length > 0
        ? row.entityName.trim()
        : "Contact"

    const eid =
      typeof row.entityId === "number" && Number.isFinite(row.entityId) && row.entityId > 0
        ? row.entityId
        : null

    const entityRole = entityCategorySlugToPropertyRole(row.entityCategorySlug)

    if (rawEmail.length > 0) {
      const key = normalizeEmailKey(rawEmail)
      const existing = byEmail.get(key)
      if (!existing) {
        const contributingEntityIds = new Set<number>()
        if (eid != null) contributingEntityIds.add(eid)
        byEmail.set(key, {
          canonicalEmail: rawEmail,
          entityName: name || "Contact",
          phoneNumber: dialableContact,
          propertyRole: entityRole,
          streets: street ? [street] : [],
          fromEntity: true,
          fromOwner: false,
          contributingEntityIds,
          contributingOwners: new Map(),
        })
      } else {
        existing.fromEntity = true
        existing.entityName = name || existing.entityName
        existing.propertyRole = maxPropertyRole(existing.propertyRole, entityRole)
        if (dialableContact) existing.phoneNumber = dialableContact
        if (street) existing.streets.push(street)
        if (eid != null) existing.contributingEntityIds.add(eid)
      }
    } else if (dialableContact && eid != null) {
      const pKey = normalizePhoneDigits(dialableContact)
      const existingP = byPhoneOnly.get(pKey)
      if (!existingP) {
        byPhoneOnly.set(pKey, {
          normalizedDigits: pKey,
          displayPhone: dialableContact,
          entityName: name || "Contact",
          propertyRole: entityRole,
          streets: street ? [street] : [],
          fromEntity: true,
          fromOwner: false,
          contributingEntityIds: new Set([eid]),
          contributingOwners: new Map(),
        })
      } else {
        existingP.fromEntity = true
        existingP.entityName = name || existingP.entityName
        existingP.propertyRole = maxPropertyRole(existingP.propertyRole, entityRole)
        if (street) existingP.streets.push(street)
        existingP.contributingEntityIds.add(eid)
      }
    }
  }
}
