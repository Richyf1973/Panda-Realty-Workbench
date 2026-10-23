import "server-only"

import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"
import { buildBulkGoogleContactsAggregates } from "@/lib/google-contacts-patch-all-aggregates.server"
import { GOOGLE_CONTACTS_PATCH_ALL_RESULTS_MAX } from "@/lib/google-contacts-patch-all-result-types"
import type { GoogleContactsPatchAllResultRow } from "@/lib/google-contacts-patch-all-result-types"
import {
  fetchEntityMembersForBulkSync,
  fetchEntitiesWithPropertyStreetsForBulkSync,
  fetchOwnerSlotsForBulkGoogleContactsSync,
} from "@/lib/google-contacts-bulk-addresses.server"
import {
  getGoogleContactsPatchAllPropertyListAllowlist,
  getGoogleContactsPatchAllRecentFilter,
  type DateRangeOption,
} from "@/lib/google-contacts-patch-all-recent"
import {
  buildPatchAllDevLogBody,
  googleContactsPatchAllDevLogRelativePath,
  isGoogleContactsPatchAllDevFileLogEnabled,
  writeGoogleContactsPatchAllDevLog,
} from "@/lib/google-contacts-patch-all-dev-log.server"
import { getGmailAccessToken } from "@/lib/gmail-client"
import {
  upsertEmailKey,
  upsertPhoneOnly,
  type GoogleContactsPatchAllTimingEntry,
} from "@/lib/google-contacts-patch-all-upsert.server"
import { computePatchAllTimingsSummary } from "@/lib/google-contacts-patch-all-timings"

export async function POST(request: Request) {
  const tStart = performance.now()
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  let accessToken: string
  const tAuth = performance.now()
  try {
    accessToken = await getGmailAccessToken()
  } catch (err) {
    return adminJsonError(err instanceof Error ? err.message : "Google not connected", 422)
  }
  const authMs = performance.now() - tAuth

  const url = new URL(request.url)
  const dateRange = url.searchParams.get("dateRange") as DateRangeOption | null

  const recentFilter = getGoogleContactsPatchAllRecentFilter(dateRange)
  const propertyListAllowlist = getGoogleContactsPatchAllPropertyListAllowlist()
  const fetchOpts =
    recentFilter != null || (propertyListAllowlist?.length ?? 0) > 0
      ? {
          ...(recentFilter != null ? { recentActivitySince: recentFilter.cutoff } : {}),
          ...(propertyListAllowlist?.length ? { propertyListIds: propertyListAllowlist } : {}),
        }
      : undefined

  const tFetchDb = performance.now()
  const [entityRows, ownerRows, repRows] = await Promise.all([
    fetchEntitiesWithPropertyStreetsForBulkSync(fetchOpts),
    fetchOwnerSlotsForBulkGoogleContactsSync(fetchOpts),
    fetchEntityMembersForBulkSync(fetchOpts),
  ])
  const fetchDbMs = performance.now() - tFetchDb

  const tAgg = performance.now()
  const {
    byEmail,
    byPhoneOnly,
    phoneOnlyMergedIntoEmail,
    mergedEmailCount,
    distinctPhoneOnlyRemaining,
    phoneUpserts,
    byRepEmail,
    repPhoneUpserts,
    repPhoneOnlyMergedIntoRepEmail,
  } = buildBulkGoogleContactsAggregates(entityRows, ownerRows, repRows)
  const aggregateMs = performance.now() - tAgg

  const upsertOutcomeLines: string[] = []
  const timingEntries: GoogleContactsPatchAllTimingEntry[] = []
  const recordTiming = (entry: GoogleContactsPatchAllTimingEntry) => {
    entry.index = timingEntries.length
    timingEntries.push(entry)
  }

  console.info("[panda-realty] google-contacts patch-all: starting upsert loop", {
    entityLinkRows: entityRows.length,
    ownerSlotRows: ownerRows.length,
    entityMemberRows: repRows.length,
    distinctEmails: byEmail.size,
    distinctRepEmails: byRepEmail.size,
    distinctPhoneOnlyRemaining,
    repPhoneOnlyRemaining: repPhoneUpserts.length,
    phoneOnlyMergedIntoEmail: phoneOnlyMergedIntoEmail.size,
    repPhoneOnlyMergedIntoRepEmail: repPhoneOnlyMergedIntoRepEmail.size,
    mergedEmailCount,
    authMs: Math.round(authMs),
    fetchDbMs: Math.round(fetchDbMs),
    aggregateMs: Math.round(aggregateMs),
    ...(recentFilter && {
      devRecentFilterHours: recentFilter.hours,
      devRecentFilterCutoffIso: recentFilter.cutoff.toISOString(),
    }),
    ...(propertyListAllowlist?.length
      ? {
          devPropertyListIdAllowlistCount: propertyListAllowlist.length,
          devPropertyListIdAllowlist: propertyListAllowlist,
        }
      : {}),
  })

  let synced = 0
  let failed = 0
  const errors: string[] = []
  const resultsForJson: GoogleContactsPatchAllResultRow[] = []
  let resultsTruncated = false

  const maybePushResult = (row: GoogleContactsPatchAllResultRow) => {
    if (resultsForJson.length < GOOGLE_CONTACTS_PATCH_ALL_RESULTS_MAX) {
      resultsForJson.push(row)
    } else {
      resultsTruncated = true
    }
  }

  const sortedEmailKeys = [...byEmail.keys()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  )
  const sortedRepEmailKeys = [...byRepEmail.keys()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  )

  const tLoop = performance.now()
  for (const key of sortedEmailKeys) {
    const r = await upsertEmailKey(
      accessToken,
      key,
      byEmail.get(key)!,
      upsertOutcomeLines,
      maybePushResult,
      recordTiming,
    )
    synced += r.synced; failed += r.failed; errors.push(...r.errors)
  }
  for (const pAgg of phoneUpserts) {
    const r = await upsertPhoneOnly(accessToken, pAgg, upsertOutcomeLines, maybePushResult, recordTiming)
    synced += r.synced; failed += r.failed; errors.push(...r.errors)
  }
  for (const key of sortedRepEmailKeys) {
    const r = await upsertEmailKey(
      accessToken,
      key,
      byRepEmail.get(key)!,
      upsertOutcomeLines,
      maybePushResult,
      recordTiming,
    )
    synced += r.synced; failed += r.failed; errors.push(...r.errors)
  }
  for (const pAgg of repPhoneUpserts) {
    const r = await upsertPhoneOnly(accessToken, pAgg, upsertOutcomeLines, maybePushResult, recordTiming)
    synced += r.synced; failed += r.failed; errors.push(...r.errors)
  }
  const upsertLoopMs = performance.now() - tLoop

  const expectedAttempts = sortedEmailKeys.length + phoneUpserts.length + sortedRepEmailKeys.length + repPhoneUpserts.length
  const resultsOmitted = resultsTruncated ? Math.max(0, expectedAttempts - resultsForJson.length) : 0

  const totalFetchedRows = entityRows.length + ownerRows.length + repRows.length
  const distinctUpserts = byEmail.size + phoneUpserts.length + byRepEmail.size + repPhoneUpserts.length
  const exclusionCount = Math.max(0, totalFetchedRows - distinctUpserts)

  const totalMs = performance.now() - tStart
  const timingsSummary = computePatchAllTimingsSummary({
    totalMs,
    authMs,
    fetchDbMs,
    aggregateMs,
    upsertLoopMs,
    entries: timingEntries,
  })

  console.info("[panda-realty] google-contacts patch-all: done", {
    totalMs: Math.round(timingsSummary.totalMs),
    authMs: Math.round(timingsSummary.authMs),
    fetchDbMs: Math.round(timingsSummary.fetchDbMs),
    aggregateMs: Math.round(timingsSummary.aggregateMs),
    upsertLoopMs: Math.round(timingsSummary.upsertLoopMs),
    auditWriteMsTotal: Math.round(timingsSummary.auditWriteMsTotal),
    googleSearchMsTotal: Math.round(timingsSummary.googleSearchMsTotal),
    googleWriteMsTotal: Math.round(timingsSummary.googleWriteMsTotal),
    upsertCount: timingsSummary.upsertCount,
    p50Ms: Math.round(timingsSummary.p50Ms),
    p95Ms: Math.round(timingsSummary.p95Ms),
    maxMs: Math.round(timingsSummary.maxMs),
    synced,
    failed,
  })

  let devPatchAllLogRelativePath: string | null = null
  if (isGoogleContactsPatchAllDevFileLogEnabled()) {
    const body = buildPatchAllDevLogBody({
      entityRows, ownerRows, repRows,
      byEmail, byPhoneOnly, byRepEmail,
      sortedEmailKeys, sortedRepEmailKeys,
      phoneOnlyMergedIntoEmail,
      recentFilter,
      propertyListAllowlist: propertyListAllowlist ?? null,
      upsertOutcomeLines,
      timingEntries,
      timingsSummary,
    })
    const abs = await writeGoogleContactsPatchAllDevLog(body)
    if (abs) devPatchAllLogRelativePath = googleContactsPatchAllDevLogRelativePath()
  }

  return NextResponse.json({
    synced,
    failed,
    errors,
    results: resultsForJson,
    ...(resultsTruncated ? { resultsTruncated: true as const, resultsOmitted } : {}),
    exclusionCount,
    entityLinkRows: entityRows.length,
    ownerSlotsWithEmail: ownerRows.length,
    ownerSlotRows: ownerRows.length,
    entityMemberRows: repRows.length,
    distinctEmails: byEmail.size,
    distinctRepEmails: byRepEmail.size,
    distinctPhoneOnlyRemaining,
    repPhoneOnlyRemaining: repPhoneUpserts.length,
    phoneOnlyMergedIntoEmailCount: phoneOnlyMergedIntoEmail.size,
    mergedEmailCount,
    timingsSummary,
    ...(recentFilter
      ? {
          devRecentFilterHours: recentFilter.hours,
          devRecentFilterCutoffIso: recentFilter.cutoff.toISOString(),
        }
      : {}),
    ...(propertyListAllowlist?.length
      ? {
          devPropertyListIdAllowlistCount: propertyListAllowlist.length,
          devPropertyListIdAllowlist: propertyListAllowlist,
        }
      : {}),
    ...(devPatchAllLogRelativePath != null ? { devPatchAllLogRelativePath } : {}),
  })
}
