/** Shared types for `POST /api/admin/google-contacts/patch-all` JSON (safe for client import). */

export const GOOGLE_CONTACTS_PATCH_ALL_RESULTS_MAX = 5000

export type GoogleContactsPatchMergeKind = "email" | "phone"

export type GoogleContactsStoredOutcome = "created" | "updated" | "failed"

export type GoogleContactsContributingOwnerRef = {
  propertyListId: number
  slot: 1 | 2 | 3
}

export type GoogleContactsUpsertTimingsRow = {
  /** Time spent on Google People searchContacts(email) HTTP. Absent when no email lookup ran. */
  searchEmailMs?: number
  /** Time spent on Google People searchContacts(phone) HTTP. Absent when no phone lookup ran. */
  searchPhoneMs?: number
  /** Time spent on the create/update People HTTP. Absent on failures before write. */
  writeMs?: number
  writeKind?: "create" | "update"
  /** Time spent in `applyGoogleContactsSyncAuditBatch` DB transaction. */
  auditMs: number
  /** Total wall-clock time for the single upsert (search + write + audit + overhead). */
  totalMs: number
}

export type GoogleContactsPatchAllResultRow = {
  mergeKind: GoogleContactsPatchMergeKind
  /** Normalized merge key: lowercase email or digit string for phone-only path. */
  mergeKey: string
  /** Human-readable label (original email casing or display phone). */
  displayLabel: string
  /** Human-readable Google contact name used for the upsert. */
  contactDisplayName?: string
  /** Parent entity names for member-derived contacts when available. */
  parentEntityNames?: string[]
  outcome: GoogleContactsStoredOutcome
  error?: string
  contributingEntityIds: number[]
  contributingOwners: GoogleContactsContributingOwnerRef[]
  timings?: GoogleContactsUpsertTimingsRow
}

export type GoogleContactsPatchAllSlowestRow = {
  mergeKind: GoogleContactsPatchMergeKind
  mergeKey: string
  displayLabel: string
  totalMs: number
  outcome: GoogleContactsStoredOutcome
}

export type GoogleContactsPatchAllTimingsSummary = {
  /** Wall-clock from POST entry to JSON serialization start. */
  totalMs: number
  /** `getGmailAccessToken()` cost. */
  authMs: number
  /** Parallel DB fetches (entities + owners + reps). */
  fetchDbMs: number
  /** Pure in-memory aggregation. */
  aggregateMs: number
  /** All four upsert loops combined (the dominant phase). */
  upsertLoopMs: number
  /** Sum of audit DB transaction times across every upsert. */
  auditWriteMsTotal: number
  /** Sum of Google People HTTP search times across every upsert. */
  googleSearchMsTotal: number
  /** Sum of Google People HTTP create/update times across every upsert. */
  googleWriteMsTotal: number
  upsertCount: number
  p50Ms: number
  p95Ms: number
  maxMs: number
  /** Top-N slowest upserts by totalMs (length up to 20). */
  slowest: GoogleContactsPatchAllSlowestRow[]
}
