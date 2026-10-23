import "server-only"

import { entityCategorySlugToPropertyRole } from "@/lib/google-contact-name-prefix"
import { getGmailAccessToken } from "@/lib/gmail-client"
import { upsertGoogleContact } from "@/lib/google-contacts-client"
import { buildGoogleContactMemberIdentity } from "@/lib/google-contacts-member-name"
import { formatGoogleContactPropertyContext } from "@/lib/google-contact-property-context"
import {
  fetchStreetAddressesForEntity,
  loadEntityMembersForGoogleSync,
  loadEntityRowForGoogleSync,
} from "@/lib/google-contacts-entity-addresses.server"
import { applyGoogleContactsSyncAuditBatch } from "@/lib/google-contacts-sync-audit.server"
import { mergeWarnings } from "@/lib/google-contacts-sync-warnings"

/**
 * Upserts Google Contacts for all members of a CRM entity using the entity's street addresses for context.
 * Skips members with no email and no dialable phone.
 */
async function syncEntityMembersToGoogleContacts(
  entityId: number,
  entityName: string,
  accessToken: string,
  propertyAddress: string | undefined,
): Promise<string[]> {
  const warnings: string[] = []
  const members = await loadEntityMembersForGoogleSync(entityId)
  const syncedAt = new Date()
  const usedEmailKeys = new Set<string>()

  for (const member of members) {
    if (!member.memberEmailAddress && !member.memberPhoneNumber) continue
    const memberIdentity = buildGoogleContactMemberIdentity({
      memberName: member.memberName,
      parentEntityName: entityName,
      parentEntityCategorySlug: member.parentEntityCategorySlug,
      isBuyersRepresentative: member.isBuyersRepresentative,
    })
    const emailKey = member.memberEmailAddress?.trim().toLowerCase() ?? null
    const useEmail = emailKey != null && !usedEmailKeys.has(emailKey)
    if (emailKey != null) usedEmailKeys.add(emailKey)
    const label = member.memberEmailAddress ?? member.memberPhoneNumber ?? member.memberName
    try {
      const outcome = await upsertGoogleContact(accessToken, {
        entityName: memberIdentity.entityName,
        emailAddress: useEmail ? member.memberEmailAddress : undefined,
        phoneNumber: member.memberPhoneNumber,
        propertyAddress,
        propertyRole: memberIdentity.propertyRole,
      })
      await applyGoogleContactsSyncAuditBatch({
        contributingEntityIds: [entityId],
        contributingOwners: [],
        outcome,
        errorMessage: null,
        syncedAt,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "sync failed"
      await applyGoogleContactsSyncAuditBatch({
        contributingEntityIds: [entityId],
        contributingOwners: [],
        outcome: "failed",
        errorMessage: msg,
        syncedAt,
      })
      warnings.push(`Google Contacts (member ${label}): ${msg}`)
    }
  }
  return warnings
}

/**
 * Upserts Google Contact for a CRM **entity** row (buyer/contact/tenant) using DB state +
 * aggregated property street context across all `property_entities` links.
 * Also upserts Google Contacts for all entity members.
 */
export async function syncEntityToGoogleContacts(entityId: number): Promise<string[]> {
  const warnings: string[] = []
  const row = await loadEntityRowForGoogleSync(entityId)
  if (!row) return warnings

  let accessToken: string
  try {
    accessToken = await getGmailAccessToken()
  } catch (e) {
    warnings.push(e instanceof Error ? e.message : "Google not connected")
    return warnings
  }

  const streets = await fetchStreetAddressesForEntity(entityId)
  const propertyAddress = formatGoogleContactPropertyContext(streets) || undefined

  const label = row.emailAddress ?? row.phoneNumber ?? `#${row.entityId}`
  const syncedAt = new Date()
  const propertyRole = entityCategorySlugToPropertyRole(row.entityCategorySlug)

  try {
    const outcome = await upsertGoogleContact(accessToken, {
      entityName: row.entityName || "Contact",
      emailAddress: row.emailAddress,
      phoneNumber: row.phoneNumber,
      propertyAddress,
      propertyRole,
    })
    await applyGoogleContactsSyncAuditBatch({
      contributingEntityIds: [entityId],
      contributingOwners: [],
      outcome,
      errorMessage: null,
      syncedAt,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "sync failed"
    await applyGoogleContactsSyncAuditBatch({
      contributingEntityIds: [entityId],
      contributingOwners: [],
      outcome: "failed",
      errorMessage: msg,
      syncedAt,
    })
    warnings.push(`Google Contacts (${label}): ${msg}`)
  }

  mergeWarnings(warnings, await syncEntityMembersToGoogleContacts(entityId, row.entityName || "Contact", accessToken, propertyAddress))
  return warnings
}
