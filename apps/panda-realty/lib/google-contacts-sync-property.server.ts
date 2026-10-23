import "server-only"

import { getGmailAccessToken } from "@/lib/gmail-client"
import { isDialablePhone } from "@/lib/google-contact-dialable"
import { upsertGoogleContact } from "@/lib/google-contacts-client"
import { applyGoogleContactsSyncAuditBatch } from "@/lib/google-contacts-sync-audit.server"
import { fetchLinkedEntityIdsForPropertySync } from "@/lib/google-contacts-entity-addresses.server"
import { syncEntityToGoogleContacts } from "@/lib/google-contacts-sync-entity.server"
import { mergeWarnings } from "@/lib/google-contacts-sync-warnings"

function trimNonempty(v: unknown): string | null {
  if (typeof v !== "string") return null
  const t = v.trim()
  return t.length > 0 ? t : null
}

function readPropertyListIdFromDetail(detail: Record<string, unknown>): number | null {
  const v = detail.propertyListId
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return v
  if (typeof v === "string" && /^\d+$/.test(v.trim())) return Number(v.trim())
  return null
}

const PROPERTY_ENTITY_COLLECTION_KEYS = [
  "propertyBuyers",
  "propertyContacts",
  "propertyTenants",
] as const

function readEntityIdFromPropertyLine(line: unknown): number | null {
  if (line == null || typeof line !== "object" || Array.isArray(line)) return null
  const rec = line as Record<string, unknown>
  const embed = rec.propertyEntity
  if (embed == null || typeof embed !== "object" || Array.isArray(embed)) return null
  const id = (embed as Record<string, unknown>).entityId
  if (typeof id === "number" && Number.isFinite(id) && id > 0) return id
  if (typeof id === "string" && /^\d+$/.test(id.trim())) return Number(id.trim())
  return null
}

/**
 * Owner slots on `panda_properties` — each uses **this property's** street only (not multi-property).
 */
export async function syncPropertyOwnersToGoogleContacts(
  detail: Record<string, unknown>,
): Promise<string[]> {
  const warnings: string[] = []
  const streetRaw = detail.streetAddress
  const propertyStreet =
    typeof streetRaw === "string" && streetRaw.trim().length > 0 ? streetRaw.trim() : undefined

  const propertyListId = readPropertyListIdFromDetail(detail)

  let accessToken: string
  try {
    accessToken = await getGmailAccessToken()
  } catch (e) {
    warnings.push(e instanceof Error ? e.message : "Google not connected")
    return warnings
  }

  for (const n of [1, 2, 3] as const) {
    const email = trimNonempty(detail[`owner${n}email`])
    const phoneRaw = trimNonempty(detail[`owner${n}phone`])
    const dialablePhone =
      phoneRaw && isDialablePhone(phoneRaw) ? phoneRaw : undefined
    if (!email && !dialablePhone) continue

    const nameRaw = detail[`owner${n}name`]
    const entityName =
      typeof nameRaw === "string" && nameRaw.trim().length > 0 ? nameRaw.trim() : `Owner ${n}`

    const label = email ?? dialablePhone ?? `owner ${n}`
    const syncedAt = new Date()

    try {
      const outcome = await upsertGoogleContact(accessToken, {
        entityName,
        emailAddress: email ?? undefined,
        phoneNumber: dialablePhone,
        propertyAddress: propertyStreet,
        propertyRole: "seller",
      })
      if (propertyListId != null) {
        await applyGoogleContactsSyncAuditBatch({
          contributingEntityIds: [],
          contributingOwners: [{ propertyListId, slot: n }],
          outcome,
          errorMessage: null,
          syncedAt,
        })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "sync failed"
      if (propertyListId != null) {
        await applyGoogleContactsSyncAuditBatch({
          contributingEntityIds: [],
          contributingOwners: [{ propertyListId, slot: n }],
          outcome: "failed",
          errorMessage: msg,
          syncedAt,
        })
      }
      warnings.push(`Google Contacts (owner ${n}, ${label}): ${msg}`)
    }
  }
  return warnings
}

/**
 * Collects **entityId** values on the property detail (buyers/contacts/tenants) for Google sync.
 * Loads full row from DB in {@link syncEntityToGoogleContacts} so **`contact`** is applied even when
 * the list embed omits it.
 */
export function collectLinkedEntityIdsFromPropertyDetailForGoogleSync(
  detail: Record<string, unknown>,
): number[] {
  const ids = new Set<number>()
  for (const key of PROPERTY_ENTITY_COLLECTION_KEYS) {
    const arr = detail[key]
    if (!Array.isArray(arr)) continue
    for (const line of arr) {
      const id = readEntityIdFromPropertyLine(line)
      if (id != null) ids.add(id)
    }
  }
  return [...ids]
}

/**
 * After a **property** PATCH returns full detail: owners + linked entities (sync uses DB for each entity).
 * Entity IDs are fetched from DB via `propertyListId` because the PATCH response omits junction data.
 */
export async function syncGoogleContactsForPropertyDetail(
  detail: Record<string, unknown>,
): Promise<string[]> {
  const warnings: string[] = []
  mergeWarnings(warnings, await syncPropertyOwnersToGoogleContacts(detail))
  const propertyListId = readPropertyListIdFromDetail(detail)
  const entityIds = propertyListId != null
    ? await fetchLinkedEntityIdsForPropertySync(propertyListId)
    : collectLinkedEntityIdsFromPropertyDetailForGoogleSync(detail)
  const entityWarningLists = await Promise.all(
    entityIds.map((entityId) => syncEntityToGoogleContacts(entityId)),
  )
  for (const list of entityWarningLists) mergeWarnings(warnings, list)
  return warnings
}
