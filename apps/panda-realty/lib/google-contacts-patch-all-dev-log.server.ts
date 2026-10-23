import "server-only"

import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import type {
  EmailAggWithContributors,
  PhoneOnlyAggWithContributors,
} from "@/lib/google-contacts-patch-all-aggregates.types"
import type { GoogleContactsPatchAllTimingsSummary } from "@/lib/google-contacts-patch-all-result-types"
import type { GoogleContactsPatchAllTimingEntry } from "@/lib/google-contacts-patch-all-upsert.server"

const SCRATCH_DIR = ".scratch"
const LOG_FILE = "google-contacts-patch-all.log.txt"

export function isGoogleContactsPatchAllDevFileLogEnabled(): boolean {
  return process.env.NODE_ENV === "development"
}

/**
 * Writes UTF-8 text under Next.js `process.cwd()` (the app root): `.scratch/google-contacts-patch-all.log.txt`.
 * Overwrites on each run. No-op outside development.
 *
 * @returns absolute path when written, else `null`
 */
export async function writeGoogleContactsPatchAllDevLog(body: string): Promise<string | null> {
  if (!isGoogleContactsPatchAllDevFileLogEnabled()) return null
  const dir = path.join(process.cwd(), SCRATCH_DIR)
  const filePath = path.join(dir, LOG_FILE)
  await mkdir(dir, { recursive: true })
  await writeFile(filePath, body, "utf8")
  return filePath
}

export function googleContactsPatchAllDevLogRelativePath(): string {
  return `${SCRATCH_DIR}/${LOG_FILE}`
}

export type PatchAllDevLogContext = {
  entityRows: readonly unknown[]
  ownerRows: readonly unknown[]
  repRows: readonly unknown[]
  byEmail: Map<string, EmailAggWithContributors>
  byPhoneOnly: Map<string, PhoneOnlyAggWithContributors>
  byRepEmail: Map<string, EmailAggWithContributors>
  sortedEmailKeys: string[]
  sortedRepEmailKeys: string[]
  phoneOnlyMergedIntoEmail: Set<string>
  recentFilter: { hours: number; cutoff: Date } | null
  propertyListAllowlist: readonly number[] | null
  upsertOutcomeLines: string[]
  timingEntries: readonly GoogleContactsPatchAllTimingEntry[]
  timingsSummary: GoogleContactsPatchAllTimingsSummary
}

const fmtMs = (ms: number | undefined): string =>
  typeof ms === "number" ? `${ms.toFixed(1)}ms` : "—"

export function buildPatchAllDevLogBody(ctx: PatchAllDevLogContext): string {
  const {
    entityRows, ownerRows, repRows,
    byEmail, byPhoneOnly, byRepEmail,
    sortedEmailKeys, sortedRepEmailKeys,
    phoneOnlyMergedIntoEmail,
    recentFilter, propertyListAllowlist, upsertOutcomeLines,
    timingEntries, timingsSummary,
  } = ctx

  const sortedIds = (set: ReadonlySet<number>) => [...set].sort((a, b) => a - b)
  const sortedOwners = (map: EmailAggWithContributors["contributingOwners"]) =>
    [...map.values()].sort((a, b) =>
      a.propertyListId !== b.propertyListId ? a.propertyListId - b.propertyListId : a.slot - b.slot,
    )

  const emailAggLines = sortedEmailKeys.map((k) => {
    const a = byEmail.get(k)!
    return JSON.stringify({
      mergeKeyEmail: k,
      canonicalEmail: a.canonicalEmail,
      entityName: a.entityName,
      phoneNumber: a.phoneNumber ?? null,
      propertyRole: a.propertyRole,
      streets: a.streets,
      fromEntity: a.fromEntity,
      fromOwner: a.fromOwner,
      contributingEntityIds: sortedIds(a.contributingEntityIds),
      contributingOwners: sortedOwners(a.contributingOwners),
    })
  })

  const phoneOnlyLines = [...byPhoneOnly.values()].map((p) =>
    JSON.stringify({
      digits: p.normalizedDigits,
      displayPhone: p.displayPhone,
      entityName: p.entityName,
      propertyRole: p.propertyRole,
      streets: p.streets,
      fromEntity: p.fromEntity,
      fromOwner: p.fromOwner,
      mergedIntoEmailUpsert: phoneOnlyMergedIntoEmail.has(p.normalizedDigits),
    }),
  )

  const slowestLines = timingsSummary.slowest.map(
    (s, i) => `  #${i + 1} ${s.totalMs.toFixed(1)}ms  ${s.outcome.padEnd(7)}  ${s.mergeKind}: ${s.displayLabel}`,
  )

  const timingEntryLines = timingEntries.map((e) => {
    const search =
      typeof e.searchEmailMs === "number" || typeof e.searchPhoneMs === "number"
        ? [
            typeof e.searchEmailMs === "number" ? `searchEmail=${e.searchEmailMs.toFixed(1)}ms` : null,
            typeof e.searchPhoneMs === "number" ? `searchPhone=${e.searchPhoneMs.toFixed(1)}ms` : null,
          ]
            .filter(Boolean)
            .join(" ")
        : "search=skipped"
    const write =
      typeof e.writeMs === "number"
        ? `${e.writeKind ?? "write"}=${e.writeMs.toFixed(1)}ms`
        : "write=skipped"
    const audit = `audit=${e.auditMs.toFixed(1)}ms`
    const total = `total=${e.totalMs.toFixed(1)}ms`
    const errPart = e.error ? ` ERROR: ${e.error}` : ""
    return `[#${String(e.index).padStart(4, "0")}] ${e.outcome.padEnd(7)} ${e.mergeKind}: ${e.displayLabel} | ${search} | ${write} | ${audit} | ${total}${errPart}`
  })

  return [
    `=== panda-realty google-contacts PATCH /patch-all ${new Date().toISOString()} ===`,
    recentFilter
      ? `recentFilter: hours=${recentFilter.hours} cutoffIso=${recentFilter.cutoff.toISOString()}`
      : "recentFilter: off (full DB)",
    propertyListAllowlist?.length
      ? `propertyListAllowlist: ${propertyListAllowlist.join(",")}`
      : "propertyListAllowlist: off",
    `counts: entityLinkRows=${entityRows.length} ownerSlotRows=${ownerRows.length} entityMemberRows=${repRows.length} distinctEmailAggs=${byEmail.size} ` +
      `distinctRepEmailAggs=${byRepEmail.size} phoneOnlyMergedIntoEmail=${phoneOnlyMergedIntoEmail.size}`,
    "",
    "=== Phase timings ===",
    `total           ${fmtMs(timingsSummary.totalMs)}`,
    `auth            ${fmtMs(timingsSummary.authMs)}`,
    `db fetch        ${fmtMs(timingsSummary.fetchDbMs)}`,
    `aggregate       ${fmtMs(timingsSummary.aggregateMs)}`,
    `upsert loop     ${fmtMs(timingsSummary.upsertLoopMs)} across ${timingsSummary.upsertCount} upserts`,
    `  google search ${fmtMs(timingsSummary.googleSearchMsTotal)} (sum)`,
    `  google write  ${fmtMs(timingsSummary.googleWriteMsTotal)} (sum)`,
    `  audit DB      ${fmtMs(timingsSummary.auditWriteMsTotal)} (sum)`,
    `per-upsert      p50=${fmtMs(timingsSummary.p50Ms)} p95=${fmtMs(timingsSummary.p95Ms)} max=${fmtMs(timingsSummary.maxMs)}`,
    "",
    "=== Slowest upserts ===",
    ...(slowestLines.length > 0 ? slowestLines : ["  (none)"]),
    "",
    "=== Per-upsert timings (in execution order) ===",
    ...(timingEntryLines.length > 0 ? timingEntryLines : ["  (none)"]),
    "",
    "=== Raw DB rows: property-linked entities (one JSON per property–entity link) ===",
    ...entityRows.map((r) => JSON.stringify(r)),
    "",
    "=== Raw DB rows: owner slots (one JSON per owner slot with email and/or dialable phone) ===",
    ...ownerRows.map((r) => JSON.stringify(r)),
    "",
    "=== Raw DB rows: entity members (all, with email or dialable phone) ===",
    ...repRows.map((r) => JSON.stringify(r)),
    "",
    "=== Aggregates: email-keyed (input to each email-key People upsert) ===",
    ...emailAggLines,
    "",
    "=== Aggregates: rep email-keyed (separate from entity/owner — always own contact) ===",
    ...sortedRepEmailKeys.map((k) => {
      const a = byRepEmail.get(k)!
      return JSON.stringify({
        mergeKeyRepEmail: k,
        canonicalEmail: a.canonicalEmail,
        entityName: a.entityName,
        phoneNumber: a.phoneNumber ?? null,
        propertyRole: a.propertyRole,
        streets: a.streets,
        contributingEntityIds: sortedIds(a.contributingEntityIds),
      })
    }),
    "",
    "=== Aggregates: all phone-only buckets (merged rows flagged) ===",
    ...phoneOnlyLines,
    "",
    "=== People upsert outcomes (created = new Google contact, updated = matched existing) ===",
    ...upsertOutcomeLines,
    "",
  ].join("\n")
}
