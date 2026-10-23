import "server-only"

import { upsertGoogleContact, type GoogleContactUpsertTimings } from "@/lib/google-contacts-client"
import { formatGoogleContactPropertyContext } from "@/lib/google-contact-property-context"
import { applyGoogleContactsSyncAuditBatch } from "@/lib/google-contacts-sync-audit.server"
import type {
  EmailAggWithContributors,
  PhoneOnlyAggWithContributors,
} from "@/lib/google-contacts-patch-all-aggregates.types"
import type {
  GoogleContactsContributingOwnerRef,
  GoogleContactsPatchAllResultRow,
  GoogleContactsPatchMergeKind,
  GoogleContactsStoredOutcome,
  GoogleContactsUpsertTimingsRow,
} from "@/lib/google-contacts-patch-all-result-types"

export type GoogleContactsPatchAllTimingEntry = {
  index: number
  mergeKind: GoogleContactsPatchMergeKind
  mergeKey: string
  displayLabel: string
  outcome: GoogleContactsStoredOutcome
  searchEmailMs?: number
  searchPhoneMs?: number
  writeMs?: number
  writeKind?: "create" | "update"
  auditMs: number
  totalMs: number
  error?: string
}

export type RecordTimingFn = (entry: GoogleContactsPatchAllTimingEntry) => void

export function sortedEntityIds(set: ReadonlySet<number>): number[] {
  return [...set].sort((a, b) => a - b)
}

export function sortedOwners(
  map: ReadonlyMap<string, GoogleContactsContributingOwnerRef>,
): GoogleContactsContributingOwnerRef[] {
  return [...map.values()].sort((a, b) =>
    a.propertyListId !== b.propertyListId
      ? a.propertyListId - b.propertyListId
      : a.slot - b.slot,
  )
}

function sortedNames(set: ReadonlySet<string> | undefined): string[] | undefined {
  if (!set || set.size === 0) return undefined
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
}

function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message.toLowerCase()
  // Retry on network errors, timeouts, and rate limits
  return (
    msg.includes("timeout") ||
    msg.includes("econnreset") ||
    msg.includes("econnrefused") ||
    msg.includes("rate limit") ||
    msg.includes("429") ||
    msg.includes("503") ||
    msg.includes("temporarily unavailable")
  )
}

async function performContactUpsert(
  accessToken: string,
  upsertArgs: Parameters<typeof upsertGoogleContact>[1],
  auditEntityIds: number[],
  auditOwners: GoogleContactsContributingOwnerRef[],
  baseRow: Omit<GoogleContactsPatchAllResultRow, "outcome" | "error" | "timings">,
  buildSuccessLog: (outcome: string) => string,
  buildErrorLog: (msg: string) => string,
  buildErrorEntry: (msg: string) => string,
  upsertOutcomeLines: string[],
  maybePushResult: (row: GoogleContactsPatchAllResultRow) => void,
  recordTiming: RecordTimingFn,
): Promise<{ synced: number; failed: number; errors: string[] }> {
  let synced = 0
  let failed = 0
  const errors: string[] = []
  const syncedAt = new Date()
  const httpTimings: GoogleContactUpsertTimings = {}
  const tStart = performance.now()
  let auditMs = 0

  let lastErr: unknown = null
  const maxRetries = 3

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    for (const k of Object.keys(httpTimings) as (keyof GoogleContactUpsertTimings)[]) {
      delete httpTimings[k]
    }
    try {
      const outcome = await upsertGoogleContact(accessToken, upsertArgs, httpTimings)
      upsertOutcomeLines.push(buildSuccessLog(outcome))
      synced++
      const tAudit = performance.now()
      await applyGoogleContactsSyncAuditBatch({
        contributingEntityIds: auditEntityIds,
        contributingOwners: auditOwners,
        outcome,
        errorMessage: null,
        syncedAt,
      })
      auditMs = performance.now() - tAudit
      const totalMs = performance.now() - tStart
      const timingsRow: GoogleContactsUpsertTimingsRow = {
        ...httpTimings,
        auditMs,
        totalMs,
      }
      maybePushResult({ ...baseRow, outcome, timings: timingsRow })
      recordTiming({
        index: -1,
        mergeKind: baseRow.mergeKind,
        mergeKey: baseRow.mergeKey,
        displayLabel: baseRow.displayLabel,
        outcome,
        ...httpTimings,
        auditMs,
        totalMs,
      })
      return { synced, failed, errors }
    } catch (err) {
      lastErr = err
      if (!isRetryableError(err) || attempt === maxRetries) {
        break
      }
      // Exponential backoff: 100ms, 200ms, 400ms
      const delay = Math.pow(2, attempt - 1) * 100
      await new Promise((r) => setTimeout(r, delay))
    }
  }

  // All retries exhausted or non-retryable error
  failed++
  const msg = lastErr instanceof Error ? lastErr.message : "unknown error"
  errors.push(buildErrorEntry(msg))
  upsertOutcomeLines.push(buildErrorLog(msg))
  const tAudit = performance.now()
  await applyGoogleContactsSyncAuditBatch({
    contributingEntityIds: auditEntityIds,
    contributingOwners: auditOwners,
    outcome: "failed",
    errorMessage: msg,
    syncedAt,
  })
  auditMs = performance.now() - tAudit
  const totalMs = performance.now() - tStart
  const timingsRow: GoogleContactsUpsertTimingsRow = {
    ...httpTimings,
    auditMs,
    totalMs,
  }
  maybePushResult({ ...baseRow, outcome: "failed", error: msg, timings: timingsRow })
  recordTiming({
    index: -1,
    mergeKind: baseRow.mergeKind,
    mergeKey: baseRow.mergeKey,
    displayLabel: baseRow.displayLabel,
    outcome: "failed",
    ...httpTimings,
    auditMs,
    totalMs,
    error: msg,
  })

  return { synced, failed, errors }
}

export async function upsertEmailKey(
  accessToken: string,
  key: string,
  agg: EmailAggWithContributors,
  upsertOutcomeLines: string[],
  maybePushResult: (row: GoogleContactsPatchAllResultRow) => void,
  recordTiming: RecordTimingFn,
): Promise<{ synced: number; failed: number; errors: string[] }> {
  const propertyAddress = formatGoogleContactPropertyContext(agg.streets) || undefined
  const auditEntityIds = sortedEntityIds(agg.contributingEntityIds)
  const auditOwners = sortedOwners(agg.contributingOwners)
  return performContactUpsert(
    accessToken,
    {
      entityName: agg.entityName,
      emailAddress: agg.canonicalEmail,
      phoneNumber: agg.phoneNumber,
      propertyAddress,
      propertyRole: agg.propertyRole,
    },
    auditEntityIds,
    auditOwners,
    {
      mergeKind: "email",
      mergeKey: key,
      displayLabel: agg.canonicalEmail,
      contactDisplayName: agg.entityName,
      parentEntityNames: sortedNames(agg.parentEntityNames),
      contributingEntityIds: auditEntityIds,
      contributingOwners: auditOwners,
    },
    (outcome) =>
      `[email-key] ${agg.canonicalEmail} | name="${agg.entityName}" | phone=${agg.phoneNumber ?? "—"} | ` +
      `propertyRole=${agg.propertyRole} | fromEntity=${agg.fromEntity} fromOwner=${agg.fromOwner} | Google=${outcome}`,
    (msg) => `[email-key] ${agg.canonicalEmail} | name="${agg.entityName}" | ERROR: ${msg}`,
    (msg) => `${agg.canonicalEmail}: ${msg}`,
    upsertOutcomeLines,
    maybePushResult,
    recordTiming,
  )
}

export async function upsertPhoneOnly(
  accessToken: string,
  pAgg: PhoneOnlyAggWithContributors,
  upsertOutcomeLines: string[],
  maybePushResult: (row: GoogleContactsPatchAllResultRow) => void,
  recordTiming: RecordTimingFn,
): Promise<{ synced: number; failed: number; errors: string[] }> {
  const propertyAddress = formatGoogleContactPropertyContext(pAgg.streets) || undefined
  const auditEntityIds = sortedEntityIds(pAgg.contributingEntityIds)
  const auditOwners = sortedOwners(pAgg.contributingOwners)
  return performContactUpsert(
    accessToken,
    {
      entityName: pAgg.entityName,
      phoneNumber: pAgg.displayPhone,
      propertyAddress,
      propertyRole: pAgg.propertyRole,
    },
    auditEntityIds,
    auditOwners,
    {
      mergeKind: "phone",
      mergeKey: pAgg.normalizedDigits,
      displayLabel: pAgg.displayPhone,
      contactDisplayName: pAgg.entityName,
      parentEntityNames: sortedNames(pAgg.parentEntityNames),
      contributingEntityIds: auditEntityIds,
      contributingOwners: auditOwners,
    },
    (outcome) =>
      `[phone-key] ${pAgg.displayPhone} (digits=${pAgg.normalizedDigits}) | name="${pAgg.entityName}" | ` +
      `propertyRole=${pAgg.propertyRole} | fromEntity=${pAgg.fromEntity} fromOwner=${pAgg.fromOwner} | Google=${outcome}`,
    (msg) => `[phone-key] ${pAgg.displayPhone} | name="${pAgg.entityName}" | ERROR: ${msg}`,
    (msg) => `phone:${pAgg.displayPhone}: ${msg}`,
    upsertOutcomeLines,
    maybePushResult,
    recordTiming,
  )
}
