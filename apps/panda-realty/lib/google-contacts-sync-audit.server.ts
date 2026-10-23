import "server-only"

import { eq, inArray } from "drizzle-orm"

import { db } from "@/db"
import { entities, pandaProperties } from "@/db/schema"

import type { GoogleContactsStoredOutcome } from "@/lib/google-contacts-patch-all-result-types"

/**
 * Updates last Google Contacts sync attempt on `entities` and/or `panda_properties` owner slots.
 * Same outcome + timestamp applied to every contributor row for one merge-key upsert.
 */
export async function applyGoogleContactsSyncAuditBatch(args: {
  contributingEntityIds: readonly number[]
  contributingOwners: readonly { propertyListId: number; slot: 1 | 2 | 3 }[]
  outcome: GoogleContactsStoredOutcome
  errorMessage: string | null
  syncedAt: Date
}): Promise<void> {
  const { contributingEntityIds, contributingOwners, outcome, errorMessage, syncedAt } = args
  const err = errorMessage && errorMessage.length > 0 ? errorMessage : null

  const entityIds = [...new Set(contributingEntityIds.filter((id) => Number.isFinite(id) && id > 0))]
  const ownerDedup = new Map<string, { propertyListId: number; slot: 1 | 2 | 3 }>()
  for (const o of contributingOwners) {
    ownerDedup.set(`${o.propertyListId}-${o.slot}`, o)
  }
  const owners = [...ownerDedup.values()]

  if (entityIds.length === 0 && owners.length === 0) return

  await db.transaction(async (tx) => {
    if (entityIds.length > 0) {
      await tx
        .update(entities)
        .set({
          googleContactsSyncedAt: syncedAt,
          googleContactsLastOutcome: outcome,
          googleContactsLastError: err,
        })
        .where(inArray(entities.entityId, entityIds))
    }
    for (const ref of owners) {
      const pid = ref.propertyListId
      const slotSets =
        ref.slot === 1
          ? {
              owner1GoogleContactsSyncedAt: syncedAt,
              owner1GoogleContactsLastOutcome: outcome,
              owner1GoogleContactsLastError: err,
            }
          : ref.slot === 2
            ? {
                owner2GoogleContactsSyncedAt: syncedAt,
                owner2GoogleContactsLastOutcome: outcome,
                owner2GoogleContactsLastError: err,
              }
            : {
                owner3GoogleContactsSyncedAt: syncedAt,
                owner3GoogleContactsLastOutcome: outcome,
                owner3GoogleContactsLastError: err,
              }
      await tx.update(pandaProperties).set(slotSets).where(eq(pandaProperties.propertyListId, pid))
    }
  })
}
