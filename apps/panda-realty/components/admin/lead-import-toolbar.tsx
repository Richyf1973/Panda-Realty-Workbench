"use client"

import { useEffect, useState } from "react"
import { Button } from "@repo/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/select"
import { Separator } from "@repo/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/tooltip"
import { CheckCircle2, Link2, Loader2, Mail, RefreshCw, XCircle } from "lucide-react"

import { LeadImportGoogleSyncLogDialog } from "@/components/admin/lead-import-google-sync-log-dialog"
import type {
  GoogleContactsPatchAllResultRow,
  GoogleContactsPatchAllTimingsSummary,
} from "@/lib/google-contacts-patch-all-result-types"

type ImportDateRange = "today" | "yesterday" | "this-week" | "last-30" | "last-60"
type SyncDateRange = "today" | "yesterday" | "this-week" | "last-30" | "all"

const IMPORT_DATE_RANGE_LABELS: Record<ImportDateRange, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "this-week": "This week",
  "last-30": "Last 30 days",
  "last-60": "Last 60 days",
}

const SYNC_DATE_RANGE_LABELS: Record<SyncDateRange, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "this-week": "This week",
  "last-30": "Last 30 days",
  all: "All time",
}

type ImportState =
  | { phase: "idle" }
  | { phase: "importing" }
  | { phase: "done"; imported: number; duplicates: number; skipped: number; errors: string[] }
  | { phase: "error"; message: string }

type SyncState =
  | { phase: "idle" }
  | { phase: "syncing" }
  | {
      phase: "done"
      synced: number
      failed: number
      errors: string[]
      results: GoogleContactsPatchAllResultRow[]
      resultsTruncated?: boolean
      resultsOmitted?: number
      exclusionCount?: number
      timingsSummary?: GoogleContactsPatchAllTimingsSummary
    }
  | { phase: "error"; message: string }

interface LeadImportToolbarProps {
  onImported: () => void
  adminUiMutationsDisabled?: boolean
}

export function LeadImportToolbar({
  onImported,
  adminUiMutationsDisabled,
}: LeadImportToolbarProps) {
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null)
  const [importDateRange, setImportDateRange] = useState<ImportDateRange>("today")
  const [syncDateRange, setSyncDateRange] = useState<SyncDateRange>("today")
  const [syncPreviewCount, setSyncPreviewCount] = useState<number | null>(null)
  const [state, setState] = useState<ImportState>({ phase: "idle" })
  const [syncState, setSyncState] = useState<SyncState>({ phase: "idle" })
  const [syncLogOpen, setSyncLogOpen] = useState(false)
  const [syncRequestInProgress, setSyncRequestInProgress] = useState(false)

  useEffect(() => {
    fetch("/api/admin/leads/gmail-status")
      .then((r) => r.json())
      .then((d: { connected: boolean }) => setGmailConnected(d.connected))
      .catch(() => setGmailConnected(false))
  }, [])

  useEffect(() => {
    if (!gmailConnected) return

    fetch(`/api/admin/google-contacts/patch-all/count?dateRange=${syncDateRange}`)
      .then((r) => r.json())
      .then((d: { count: number }) => setSyncPreviewCount(d.count))
      .catch(() => setSyncPreviewCount(null))
  }, [syncDateRange, gmailConnected])

  // Handle ?gmailConnected=1 or ?gmailError=... after OAuth redirect
  useEffect(() => {
    if (typeof window === "undefined") return
    const sp = new URLSearchParams(window.location.search)
    if (sp.get("gmailConnected") === "1") {
      setGmailConnected(true)
      const url = new URL(window.location.href)
      url.searchParams.delete("gmailConnected")
      window.history.replaceState({}, "", url.toString())
    }
    const gmailError = sp.get("gmailError")
    if (gmailError) {
      setState({ phase: "error", message: `Gmail connection failed: ${gmailError}` })
      const url = new URL(window.location.href)
      url.searchParams.delete("gmailError")
      window.history.replaceState({}, "", url.toString())
    }
  }, [])

  const handleImport = async () => {
    setState({ phase: "importing" })
    try {
      const res = await fetch("/api/admin/leads/import-gmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateRange: importDateRange }),
      })
      const data = (await res.json()) as {
        status?: string
        imported?: number
        duplicates?: number
        skipped?: number
        errors?: string[]
        error?: string
      }
      if (!res.ok) {
        setState({ phase: "error", message: data.error ?? `Server error ${res.status}` })
        return
      }
      setState({
        phase: "done",
        imported: data.imported ?? 0,
        duplicates: data.duplicates ?? 0,
        skipped: data.skipped ?? 0,
        errors: data.errors ?? [],
      })
      if ((data.imported ?? 0) > 0) onImported()
    } catch (err) {
      setState({ phase: "error", message: err instanceof Error ? err.message : "Import failed" })
    }
  }

  const reset = () => setState({ phase: "idle" })

  const handleSyncContacts = async () => {
    setSyncLogOpen(false)
    setSyncRequestInProgress(true)
    setSyncState({ phase: "syncing" })
    try {
      const res = await fetch(`/api/admin/google-contacts/patch-all?dateRange=${syncDateRange}`, { method: "POST" })
      const data = (await res.json()) as {
        synced?: number
        failed?: number
        errors?: string[]
        results?: GoogleContactsPatchAllResultRow[]
        resultsTruncated?: boolean
        resultsOmitted?: number
        exclusionCount?: number
        timingsSummary?: GoogleContactsPatchAllTimingsSummary
        error?: string
      }
      if (!res.ok) {
        setSyncState({ phase: "error", message: data.error ?? `Server error ${res.status}` })
        return
      }
      const errors = data.errors ?? []
      const failed = data.failed ?? 0
      setSyncState({
        phase: "done",
        synced: data.synced ?? 0,
        failed,
        errors,
        results: Array.isArray(data.results) ? data.results : [],
        resultsTruncated: data.resultsTruncated,
        resultsOmitted: data.resultsOmitted,
        exclusionCount: data.exclusionCount,
        timingsSummary: data.timingsSummary,
      })
    } catch (err) {
      setSyncState({ phase: "error", message: err instanceof Error ? err.message : "Sync failed" })
    } finally {
      setSyncRequestInProgress(false)
    }
  }

  if (gmailConnected === null) return null

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1" data-testid="lead-import-toolbar">
      {!gmailConnected ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={Boolean(adminUiMutationsDisabled)}
            asChild
          >
            <a href={`/api/auth/google?returnTo=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/admin/properties")}`}>
              <Link2 className="mr-1.5 size-4 shrink-0" aria-hidden />
              Connect Gmail
            </a>
          </Button>
          <span className="text-xs text-muted-foreground">Required to import leads from inbox</span>
        </div>
      ) : (
        <>
          {state.phase === "idle" && (
            <div className="flex flex-wrap items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Mail className="size-4 shrink-0 text-muted-foreground cursor-default" aria-hidden />
                </TooltipTrigger>
                <TooltipContent>Import leads from Gmail</TooltipContent>
              </Tooltip>
              <Select
                value={importDateRange}
                onValueChange={(v) => setImportDateRange(v as ImportDateRange)}
                disabled={Boolean(adminUiMutationsDisabled)}
              >
                <SelectTrigger className="h-8 w-36 text-sm" data-testid="lead-import-date-range-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(IMPORT_DATE_RANGE_LABELS) as [ImportDateRange, string][]).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                disabled={Boolean(adminUiMutationsDisabled)}
                onClick={() => void handleImport()}
                data-testid="lead-import-submit-button"
              >
                Import
              </Button>
            </div>
          )}

          {state.phase === "importing" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Fetching emails from Gmail…
            </div>
          )}

          {state.phase === "done" && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                <span>
                  <strong>{state.imported}</strong> imported
                  {state.duplicates > 0 && <>, {state.duplicates} already existed</>}
                  {state.skipped > 0 && <>, {state.skipped} skipped (no matching property)</>}
                </span>
              </div>

              <Button type="button" variant="ghost" size="sm" onClick={reset}>
                Import again
              </Button>
            </div>
          )}

          {state.phase === "error" && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-sm text-destructive">
                <XCircle className="size-4 shrink-0" aria-hidden />
                {state.message}
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={reset}>
                Try again
              </Button>
            </div>
          )}

          <Separator orientation="vertical" className="h-5 mx-0.5" />

          {syncState.phase === "idle" && (
            <div className="flex flex-wrap items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <RefreshCw className="size-4 shrink-0 text-muted-foreground cursor-default" aria-hidden />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Bulk-sync listing owners (slots 1–3: email or dialable phone) and property-linked CRM
                  parties (email or dialable entities.contact) to Google Contacts. Duplicate emails merge
                  street context. Use <strong>View sync log</strong> after a run to see per-upsert outcomes.
                </TooltipContent>
              </Tooltip>
              <Select
                value={syncDateRange}
                onValueChange={(v) => setSyncDateRange(v as SyncDateRange)}
                disabled={Boolean(adminUiMutationsDisabled)}
              >
                <SelectTrigger className="h-8 w-32 text-sm" data-testid="lead-import-sync-date-range-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(SYNC_DATE_RANGE_LABELS) as [SyncDateRange, string][]).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {syncPreviewCount !== null && (
                <span className="text-xs text-muted-foreground">
                  {syncPreviewCount} contact{syncPreviewCount !== 1 ? "s" : ""} will sync
                </span>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={Boolean(adminUiMutationsDisabled || syncRequestInProgress)}
                onClick={() => void handleSyncContacts()}
                data-testid="lead-import-sync-contacts-button"
              >
                Sync contacts
              </Button>
            </div>
          )}

          {syncState.phase === "syncing" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              <span>Syncing contacts to Google…</span>
            </div>
          )}

          {syncState.phase === "done" && (
            <div className="flex flex-col gap-1.5 sm:max-w-xl">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                  <span>
                    <strong>{syncState.synced}</strong> synced
                    {syncState.failed > 0 && <>, {syncState.failed} failed</>}
                    {syncState.exclusionCount ? ` (${syncState.exclusionCount} excluded — missing data)` : ""}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSyncLogOpen(true)}
                  data-testid="lead-import-google-sync-log-button"
                >
                  View sync log
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSyncLogOpen(false)
                    setSyncState({ phase: "idle" })
                  }}
                >
                  Sync again
                </Button>
              </div>
            </div>
          )}

          {syncState.phase === "error" && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-sm text-destructive">
                <XCircle className="size-4 shrink-0" aria-hidden />
                {syncState.message}
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSyncState({ phase: "idle" })}>
                Try again
              </Button>
            </div>
          )}

          {syncState.phase === "done" && (
            <LeadImportGoogleSyncLogDialog
              open={syncLogOpen}
              onOpenChange={setSyncLogOpen}
              results={syncState.results}
              resultsTruncated={syncState.resultsTruncated}
              resultsOmitted={syncState.resultsOmitted}
              timingsSummary={syncState.timingsSummary}
            />
          )}
        </>
      )}
    </div>
  )
}
