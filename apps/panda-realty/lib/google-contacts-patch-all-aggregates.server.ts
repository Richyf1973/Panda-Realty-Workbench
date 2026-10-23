import "server-only"

import { maxPropertyRole } from "@/lib/google-contact-name-prefix"
import { normalizePhoneDigits } from "@/lib/google-contact-dialable"
import type { EntityMemberBulkRow, OwnerSlotBulkRow } from "@/lib/google-contacts-bulk-addresses.server"
import type {
  EmailAggWithContributors,
  EntityBulkSyncRow,
  PhoneOnlyAggWithContributors,
} from "@/lib/google-contacts-patch-all-aggregates.types"
import { normalizeEmailKey, ownerRefMapKey } from "@/lib/google-contacts-agg-utils.server"
import { aggregateEntityRows } from "@/lib/google-contacts-agg-entity-rows.server"
import { aggregateOwnerRows } from "@/lib/google-contacts-agg-owner-rows.server"
import { aggregateRepRows } from "@/lib/google-contacts-agg-rep-rows.server"

export { normalizeEmailKey, ownerRefMapKey }

/** @internal Exported for Vitest — merges phone-bucket contributors into an email-key aggregate when phone-only rows fold into email upsert. */
export function mergePhoneContributorsIntoEmailAgg(
  email: EmailAggWithContributors,
  phone: PhoneOnlyAggWithContributors,
): void {
  for (const id of phone.contributingEntityIds) {
    email.contributingEntityIds.add(id)
  }
  for (const [k, v] of phone.contributingOwners) {
    email.contributingOwners.set(k, v)
  }
  email.propertyRole = maxPropertyRole(email.propertyRole, phone.propertyRole)
}

function mergePhoneOnlyIntoEmailMap(
  byPhoneOnly: Map<string, PhoneOnlyAggWithContributors>,
  byEmail: Map<string, EmailAggWithContributors>,
  merged: Set<string>,
  propagateFromFlags: boolean,
): void {
  for (const [pKey, pAgg] of byPhoneOnly) {
    for (const eAgg of byEmail.values()) {
      const ep = eAgg.phoneNumber
      if (ep && normalizePhoneDigits(ep) === pKey) {
        for (const s of pAgg.streets) eAgg.streets.push(s)
        if (propagateFromFlags) {
          if (pAgg.fromOwner) eAgg.fromOwner = true
          if (pAgg.fromEntity) eAgg.fromEntity = true
        }
        mergePhoneContributorsIntoEmailAgg(eAgg, pAgg)
        merged.add(pKey)
        break
      }
    }
  }
}

export function buildBulkGoogleContactsAggregates(
  entityRows: readonly EntityBulkSyncRow[],
  ownerRows: readonly OwnerSlotBulkRow[],
  repRows: readonly EntityMemberBulkRow[] = [],
): {
  byEmail: Map<string, EmailAggWithContributors>
  byPhoneOnly: Map<string, PhoneOnlyAggWithContributors>
  phoneOnlyMergedIntoEmail: Set<string>
  mergedEmailCount: number
  distinctPhoneOnlyRemaining: number
  phoneUpserts: PhoneOnlyAggWithContributors[]
  /** Member contacts — always separate from entity/owner aggregates. */
  byRepEmail: Map<string, EmailAggWithContributors>
  byRepPhoneOnly: Map<string, PhoneOnlyAggWithContributors>
  repPhoneOnlyMergedIntoRepEmail: Set<string>
  repPhoneUpserts: PhoneOnlyAggWithContributors[]
} {
  const byEmail = new Map<string, EmailAggWithContributors>()
  const byPhoneOnly = new Map<string, PhoneOnlyAggWithContributors>()
  const byRepEmail = new Map<string, EmailAggWithContributors>()
  const byRepPhoneOnly = new Map<string, PhoneOnlyAggWithContributors>()

  aggregateEntityRows(entityRows, byEmail, byPhoneOnly)
  aggregateOwnerRows(ownerRows, byEmail, byPhoneOnly)
  aggregateRepRows(repRows, byRepEmail, byRepPhoneOnly)

  const phoneOnlyMergedIntoEmail = new Set<string>()
  mergePhoneOnlyIntoEmailMap(byPhoneOnly, byEmail, phoneOnlyMergedIntoEmail, true)

  const repPhoneOnlyMergedIntoRepEmail = new Set<string>()
  mergePhoneOnlyIntoEmailMap(byRepPhoneOnly, byRepEmail, repPhoneOnlyMergedIntoRepEmail, false)

  let mergedEmailCount = 0
  for (const agg of byEmail.values()) {
    if (agg.fromEntity && agg.fromOwner) mergedEmailCount++
  }

  const distinctPhoneOnlyRemaining = [...byPhoneOnly.keys()].filter(
    (k) => !phoneOnlyMergedIntoEmail.has(k),
  ).length

  const phoneUpserts = [...byPhoneOnly.values()]
    .filter((p) => !phoneOnlyMergedIntoEmail.has(p.normalizedDigits))
    .sort((a, b) =>
      a.normalizedDigits.localeCompare(b.normalizedDigits, undefined, { sensitivity: "base" }),
    )

  const repPhoneUpserts = [...byRepPhoneOnly.values()]
    .filter((p) => !repPhoneOnlyMergedIntoRepEmail.has(p.normalizedDigits))
    .sort((a, b) =>
      a.normalizedDigits.localeCompare(b.normalizedDigits, undefined, { sensitivity: "base" }),
    )

  return {
    byEmail,
    byPhoneOnly,
    phoneOnlyMergedIntoEmail,
    mergedEmailCount,
    distinctPhoneOnlyRemaining,
    phoneUpserts,
    byRepEmail,
    byRepPhoneOnly,
    repPhoneOnlyMergedIntoRepEmail,
    repPhoneUpserts,
  }
}
