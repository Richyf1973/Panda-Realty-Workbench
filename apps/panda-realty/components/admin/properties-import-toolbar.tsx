"use client"

import { useCallback, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@repo/ui/button"
import {
  CheckCircle2,
  Download,
  Loader2,
  MapPin,
  PlusCircle,
  RefreshCw,
  XCircle,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/tooltip"
import type { PropertyImportRow } from "@/workers/xlsx-import.worker"

type ImportState =
  | { phase: "idle" }
  | { phase: "parsing" }
  | {
      phase: "uploading"
      chunkIndex: number
      totalChunks: number
      rowsProcessed: number
    }
  | {
      phase: "done"
      inserted: number
      skippedExisting: number
      importMode: "insert_only" | "upsert"
      failed: number
      errors: Array<{ address: string; reason: string }>
      skipped: number
    }
  | { phase: "error"; message: string }

interface PropertiesImportToolbarProps {
  onListRefetch: () => void
  adminUiMutationsDisabled?: boolean
}

async function uploadChunk(
  rows: PropertyImportRow[],
  mode: "insert_only" | "upsert",
): Promise<{
  inserted: number
  updated: number
  skippedExisting: number
  failed: number
  errors: Array<{ address: string; reason: string }>
}> {
  const res = await fetch("/api/admin/properties/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows, mode }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Server error ${res.status}: ${text}`)
  }
  return res.json()
}

function downloadErrorReport(
  errors: Array<{ address: string; reason: string }>,
) {
  const header = "Address,Reason"
  const csvRows = errors.map(
    (e) =>
      `"${e.address.replace(/"/g, '""')}","${e.reason.replace(/"/g, '""')}"`,
  )
  const csv = [header, ...csvRows].join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "import-errors.csv"
  a.click()
  URL.revokeObjectURL(url)
}

export function PropertiesImportToolbar({
  onListRefetch,
  adminUiMutationsDisabled,
}: PropertiesImportToolbarProps) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingImportModeRef = useRef<"insert_only" | "upsert">("upsert")
  const [state, setState] = useState<ImportState>({ phase: "idle" })
  const [syncBusy, setSyncBusy] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  const importParseOrUploadBusy =
    state.phase === "parsing" || state.phase === "uploading"

  const handleSyncOwnerAddresses = useCallback(async () => {
    setSyncError(null)
    setSyncBusy(true)
    try {
      const res = await fetch("/api/admin/properties/sync-owner-addresses", {
        method: "POST",
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Server error ${res.status}`)
      }
      await res.json().catch(() => null)
      onListRefetch()
    } catch (err) {
      setSyncError(
        err instanceof Error ? err.message : "Sync owner addresses failed",
      )
    } finally {
      setSyncBusy(false)
    }
  }, [onListRefetch])

  const handleFile = useCallback(
    async (file: File) => {
      const importMode = pendingImportModeRef.current
      setState({ phase: "parsing" })

      const worker = new Worker(
        new URL("../../workers/xlsx-import.worker.ts", import.meta.url),
      )

      // Collect all chunks from the worker first, then upload sequentially
      const chunks: PropertyImportRow[][] = []
      let workerSkipped = 0

      worker.onmessage = async (e: MessageEvent) => {
        const msg = e.data as
          | {
              type: "chunk"
              rows: PropertyImportRow[]
              chunkIndex: number
              totalChunks: number
            }
          | { type: "done"; totalRows: number; skipped: number }
          | { type: "error"; message: string }

        if (msg.type === "chunk") {
          chunks.push(msg.rows)
        } else if (msg.type === "done") {
          workerSkipped = msg.skipped
          worker.terminate()

          // Now upload chunks sequentially
          if (chunks.length === 0) {
            setState({
              phase: "done",
              inserted: 0,
              skippedExisting: 0,
              importMode,
              failed: 0,
              errors: [],
              skipped: workerSkipped,
            })
            return
          }

          let totalInserted = 0
          let totalSkippedExisting = 0
          let totalFailed = 0
          const allErrors: Array<{ address: string; reason: string }> = []

          try {
            for (let i = 0; i < chunks.length; i++) {
              setState({
                phase: "uploading",
                chunkIndex: i,
                totalChunks: chunks.length,
                rowsProcessed: i * 1_000,
              })

              const result = await uploadChunk(chunks[i], importMode)
              totalInserted += result.inserted
              totalSkippedExisting += result.skippedExisting ?? 0
              totalFailed += result.failed
              allErrors.push(...result.errors)
            }

            setState({
              phase: "done",
              inserted: totalInserted,
              skippedExisting: totalSkippedExisting,
              importMode,
              failed: totalFailed,
              errors: allErrors,
              skipped: workerSkipped,
            })
            onListRefetch()
            // Auto-sync suburbs so the Suburbs grid reflects newly imported property suburbs
            fetch("/api/admin/suburbs/sync", { method: "POST" })
              .then(() =>
                Promise.all([
                  queryClient.invalidateQueries({ queryKey: ["admin", "suburbs"] }),
                  queryClient.invalidateQueries({
                    queryKey: ["hint-filter-options", "/api/admin/suburbs/options"],
                  }),
                ]),
              )
              .catch(() => {
                // Non-critical — suburbs sync can be triggered manually if needed
              })
          } catch (err) {
            setState({
              phase: "error",
              message:
                err instanceof Error ? err.message : "Upload failed",
            })
          }
        } else if (msg.type === "error") {
          worker.terminate()
          setState({ phase: "error", message: msg.message })
        }
      }

      worker.onerror = (err) => {
        worker.terminate()
        setState({ phase: "error", message: err.message || "Worker error" })
      }

      worker.postMessage({ type: "parse", file })
    },
    [onListRefetch],
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) void handleFile(file)
      // Reset input so re-selecting the same file triggers onChange
      e.target.value = ""
    },
    [handleFile],
  )

  const progressPercent =
    state.phase === "uploading" && state.totalChunks > 0
      ? Math.round((state.chunkIndex / state.totalChunks) * 100)
      : 0

  return (
    <div className="flex flex-col gap-2" data-testid="properties-import-toolbar">
      <div className="flex flex-wrap items-center gap-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                Boolean(adminUiMutationsDisabled) ||
                syncBusy ||
                importParseOrUploadBusy
              }
              onClick={() => void handleSyncOwnerAddresses()}
              data-testid="properties-sync-owner-addresses-button"
            >
              {syncBusy ? (
                <Loader2 className="mr-1.5 size-4 shrink-0 animate-spin" aria-hidden />
              ) : (
                <MapPin className="mr-1.5 size-4 shrink-0" aria-hidden />
              )}
              Sync owner addresses
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm">
          <div className="block max-w-sm text-left text-pretty">
            <ul className="list-disc space-y-1 pl-3">
              <li>
                Copies each property&apos;s <strong>street address</strong> into{" "}
                <strong>blank</strong> Owner 1–3 address fields only.
              </li>
              <li>Does not overwrite owner addresses you have already filled in.</li>
              <li>
                Runs on the server in batches; no Save needed. Safe to run again after
                imports.
              </li>
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="sr-only"
        onChange={handleInputChange}
        data-testid="properties-import-file-input"
      />

      {state.phase === "idle" && (
        <>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={Boolean(adminUiMutationsDisabled) || syncBusy}
            onClick={() => {
              pendingImportModeRef.current = "insert_only"
              inputRef.current?.click()
            }}
            data-testid="properties-import-button--insert-only"
          >
            <PlusCircle className="mr-1.5 size-4 shrink-0" aria-hidden />
            Import new only
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={Boolean(adminUiMutationsDisabled) || syncBusy}
            onClick={() => {
              pendingImportModeRef.current = "upsert"
              inputRef.current?.click()
            }}
            data-testid="properties-import-button--upsert"
          >
            <RefreshCw className="mr-1.5 size-4 shrink-0" aria-hidden />
            Import & update existing
          </Button>
        </>
      )}

      {state.phase === "parsing" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Parsing file…
        </div>
      )}

      {state.phase === "uploading" && (
        <div className="flex min-w-[280px] flex-col gap-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Uploading chunk {state.chunkIndex + 1} / {state.totalChunks}
            {" "}({state.rowsProcessed.toLocaleString()} rows)
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {state.phase === "done" && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden />
            {state.importMode === "insert_only" ? (
              <>
                Import complete: {state.inserted.toLocaleString()} inserted
                {state.skippedExisting > 0 &&
                  `, ${state.skippedExisting.toLocaleString()} already existed (not updated)`}
              </>
            ) : (
              <>
                Import complete: {state.inserted.toLocaleString()} rows processed
              </>
            )}
            {state.skipped > 0 && `, ${state.skipped} skipped`}
            {state.failed > 0 && `, ${state.failed} failed`}
          </div>
          {state.errors.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => downloadErrorReport(state.errors)}
            >
              <Download className="mr-1 size-3.5" />
              Error report
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setState({ phase: "idle" })}
          >
            Import another
          </Button>
        </div>
      )}

      {state.phase === "error" && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-sm text-destructive">
            <XCircle className="size-4 shrink-0" />
            {state.message}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setState({ phase: "idle" })}
          >
            Try again
          </Button>
        </div>
      )}
      </div>
      {syncError ? (
        <p className="text-sm text-destructive" role="alert">
          {syncError}
        </p>
      ) : null}
    </div>
  )
}
