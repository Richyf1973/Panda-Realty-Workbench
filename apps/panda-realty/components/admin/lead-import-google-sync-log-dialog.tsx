"use client"

import { Button } from "@repo/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog"
import { cn } from "@repo/ui/utils"

import type {
  GoogleContactsPatchAllResultRow,
  GoogleContactsPatchAllTimingsSummary,
  GoogleContactsUpsertTimingsRow,
} from "@/lib/google-contacts-patch-all-result-types"

export type LeadImportGoogleSyncLogDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  results: GoogleContactsPatchAllResultRow[]
  resultsTruncated?: boolean
  resultsOmitted?: number
  timingsSummary?: GoogleContactsPatchAllTimingsSummary
}

function formatContributors(row: GoogleContactsPatchAllResultRow): string {
  const parts: string[] = []
  const contributingEntityIds = row.contributingEntityIds ?? []
  const contributingOwners = row.contributingOwners ?? []
  if (contributingEntityIds.length > 0) {
    parts.push(`entities: ${contributingEntityIds.join(", ")}`)
  }
  if (contributingOwners.length > 0) {
    parts.push(
      `owners: ${contributingOwners
        .map((o) => `#${o.propertyListId} slot ${o.slot}`)
        .join("; ")}`,
    )
  }
  return parts.length > 0 ? parts.join(" · ") : "—"
}

function formatParentEntityNames(row: GoogleContactsPatchAllResultRow): string | null {
  const names =
    row.parentEntityNames?.filter((name) => typeof name === "string" && name.trim().length > 0) ??
    []
  if (names.length === 0) return null
  return names.join("; ")
}

function fmtMs(ms: number | undefined): string {
  if (typeof ms !== "number") return "—"
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`
  return `${Math.round(ms)}ms`
}

function formatRowTimings(t: GoogleContactsUpsertTimingsRow | undefined): string {
  if (!t) return "—"
  const parts: string[] = []
  if (typeof t.searchEmailMs === "number") parts.push(`s/email ${fmtMs(t.searchEmailMs)}`)
  if (typeof t.searchPhoneMs === "number") parts.push(`s/phone ${fmtMs(t.searchPhoneMs)}`)
  if (typeof t.writeMs === "number") parts.push(`${t.writeKind ?? "write"} ${fmtMs(t.writeMs)}`)
  parts.push(`audit ${fmtMs(t.auditMs)}`)
  parts.push(`total ${fmtMs(t.totalMs)}`)
  return parts.join(" · ")
}

function TimingsSummaryPanel({ summary }: { summary: GoogleContactsPatchAllTimingsSummary }) {
  const cells: Array<{ label: string; value: string }> = [
    { label: "Total", value: fmtMs(summary.totalMs) },
    { label: "Auth", value: fmtMs(summary.authMs) },
    { label: "DB fetch", value: fmtMs(summary.fetchDbMs) },
    { label: "Aggregate", value: fmtMs(summary.aggregateMs) },
    { label: "Upsert loop", value: `${fmtMs(summary.upsertLoopMs)} (${summary.upsertCount})` },
    { label: "Google search Σ", value: fmtMs(summary.googleSearchMsTotal) },
    { label: "Google write Σ", value: fmtMs(summary.googleWriteMsTotal) },
    { label: "Audit DB Σ", value: fmtMs(summary.auditWriteMsTotal) },
    { label: "p50", value: fmtMs(summary.p50Ms) },
    { label: "p95", value: fmtMs(summary.p95Ms) },
    { label: "max", value: fmtMs(summary.maxMs) },
  ]
  return (
    <div className="mb-3 rounded-md border border-border/60 bg-muted/30 p-3">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Timings
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
        {cells.map((c) => (
          <div key={c.label} className="flex items-baseline justify-between gap-2">
            <span className="text-muted-foreground">{c.label}</span>
            <span className="font-mono">{c.value}</span>
          </div>
        ))}
      </div>
      {summary.slowest.length > 0 && (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer text-muted-foreground">
            Slowest {summary.slowest.length} upsert{summary.slowest.length === 1 ? "" : "s"}
          </summary>
          <ul className="mt-1 space-y-0.5 font-mono">
            {summary.slowest.map((s, i) => (
              <li key={`${s.mergeKind}-${s.mergeKey}-${i}`} className="break-all">
                <span className="text-muted-foreground">#{i + 1}</span>{" "}
                <span>{fmtMs(s.totalMs)}</span>{" "}
                <span className="text-muted-foreground">{s.outcome}</span>{" "}
                <span>
                  {s.mergeKind}: {s.displayLabel}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

export function LeadImportGoogleSyncLogDialog({
  open,
  onOpenChange,
  results,
  resultsTruncated,
  resultsOmitted,
  timingsSummary,
}: LeadImportGoogleSyncLogDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-4xl flex max-h-[90vh] flex-col gap-0 p-0"
        data-testid="lead-import-google-sync-log-dialog"
      >
        <DialogHeader className="border-b border-border shrink-0 px-6 pb-4 pt-6">
          <DialogTitle>Google Contacts sync log</DialogTitle>
          {resultsTruncated && resultsOmitted != null && resultsOmitted > 0 && (
            <p className="text-sm font-normal text-muted-foreground">
              Showing the first {results.length} upserts. {resultsOmitted} omitted from the API
              response (cap).
            </p>
          )}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3">
          {timingsSummary && <TimingsSummaryPanel summary={timingsSummary} />}
          <table className="w-full caption-bottom text-sm">
            <thead className="sticky top-0 bg-background border-b">
              <tr className="text-left">
                <th className="pb-2 pr-3 font-medium">Merge key</th>
                <th className="pb-2 pr-3 font-medium">Outcome</th>
                <th className="pb-2 pr-3 font-medium">Timings</th>
                <th className="pb-2 pr-3 font-medium">Error</th>
                <th className="pb-2 font-medium">Contributors</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row, i) => {
                const parentEntityNames = formatParentEntityNames(row)
                return (
                  <tr
                    key={`${row.mergeKind}-${row.mergeKey}-${i}`}
                    className={cn(
                      "border-b border-border/60 align-top",
                      row.outcome === "failed" && "text-destructive",
                    )}
                  >
                    <td className="py-2 pr-3 font-mono text-xs whitespace-pre-wrap break-all">
                      <div>
                        <span className="text-muted-foreground">{row.mergeKind}</span>
                        {": "}
                        {row.displayLabel}
                      </div>
                      {row.contactDisplayName && row.contactDisplayName !== row.displayLabel && (
                        <div className="mt-1 font-sans text-sm text-foreground">
                          {row.contactDisplayName}
                        </div>
                      )}
                      {parentEntityNames && (
                        <div className="mt-1 font-sans text-xs text-muted-foreground">
                          Parent: {parentEntityNames}
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-3 capitalize">{row.outcome}</td>
                    <td className="py-2 pr-3 font-mono text-xs whitespace-pre-wrap">
                      {formatRowTimings(row.timings)}
                    </td>
                    <td className="py-2 pr-3 whitespace-pre-wrap break-words">
                      {row.error ?? "—"}
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">{formatContributors(row)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {results.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No upsert rows recorded.</p>
          )}
        </div>
        <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
