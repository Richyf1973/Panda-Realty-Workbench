import type {
  GoogleContactsPatchAllSlowestRow,
  GoogleContactsPatchAllTimingsSummary,
} from "@/lib/google-contacts-patch-all-result-types"
import type { GoogleContactsPatchAllTimingEntry } from "@/lib/google-contacts-patch-all-upsert.server"

const SLOWEST_LIMIT = 20

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[idx]
}

export function computePatchAllTimingsSummary(args: {
  totalMs: number
  authMs: number
  fetchDbMs: number
  aggregateMs: number
  upsertLoopMs: number
  entries: readonly GoogleContactsPatchAllTimingEntry[]
}): GoogleContactsPatchAllTimingsSummary {
  const { totalMs, authMs, fetchDbMs, aggregateMs, upsertLoopMs, entries } = args
  const totals: number[] = []
  let auditWriteMsTotal = 0
  let googleSearchMsTotal = 0
  let googleWriteMsTotal = 0
  for (const e of entries) {
    totals.push(e.totalMs)
    auditWriteMsTotal += e.auditMs
    if (typeof e.searchEmailMs === "number") googleSearchMsTotal += e.searchEmailMs
    if (typeof e.searchPhoneMs === "number") googleSearchMsTotal += e.searchPhoneMs
    if (typeof e.writeMs === "number") googleWriteMsTotal += e.writeMs
  }
  const sortedAsc = [...totals].sort((a, b) => a - b)
  const slowest: GoogleContactsPatchAllSlowestRow[] = [...entries]
    .sort((a, b) => b.totalMs - a.totalMs)
    .slice(0, SLOWEST_LIMIT)
    .map((e) => ({
      mergeKind: e.mergeKind,
      mergeKey: e.mergeKey,
      displayLabel: e.displayLabel,
      totalMs: e.totalMs,
      outcome: e.outcome,
    }))

  return {
    totalMs,
    authMs,
    fetchDbMs,
    aggregateMs,
    upsertLoopMs,
    auditWriteMsTotal,
    googleSearchMsTotal,
    googleWriteMsTotal,
    upsertCount: entries.length,
    p50Ms: percentile(sortedAsc, 50),
    p95Ms: percentile(sortedAsc, 95),
    maxMs: sortedAsc.length > 0 ? sortedAsc[sortedAsc.length - 1] : 0,
    slowest,
  }
}
