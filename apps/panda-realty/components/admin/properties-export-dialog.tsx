"use client"

import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Loader2,
  TriangleAlert,
  XCircle,
} from "lucide-react"

import { Button } from "@repo/ui/button"
import { Checkbox } from "@repo/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog"
import { cn } from "@repo/ui/utils"

import { EXPORT_MAX, EXPORT_WARN } from "./properties-export-toolbar-config"
import type { ExportColumn, ExportPhase } from "./properties-export-toolbar.types"
import type { FilterLine } from "./properties-export-filter-lines"

export interface PropertiesExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  phase: ExportPhase
  filterLines: FilterLine[]
  hasActiveListFilters: boolean
  columns: ExportColumn[]
  enabledCount: number
  moveColumn: (index: number, dir: "up" | "down") => void
  toggleColumn: (index: number, enabled: boolean) => void
  selectAll: () => void
  deselectAll: () => void
  handleDownload: (fmt: "xlsx" | "pdf") => void
  downloadDisabled: boolean
}

export function PropertiesExportDialog({
  open,
  onOpenChange,
  phase,
  filterLines,
  hasActiveListFilters,
  columns,
  enabledCount,
  moveColumn,
  toggleColumn,
  selectAll,
  deselectAll,
  handleDownload,
  downloadDisabled,
}: PropertiesExportDialogProps) {
  const count = phase.phase === "ready" ? phase.count : null
  const overLimit = count !== null && count > EXPORT_MAX
  const nearLimit = count !== null && count > EXPORT_WARN && !overLimit

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col gap-0 p-0 max-h-[90vh]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle>Export Properties</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">Export summary</p>

            {phase.phase === "preparing" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin shrink-0" />
                <span>Counting matching properties…</span>
              </div>
            )}

            {(phase.phase === "ready" ||
              phase.phase === "exporting" ||
              phase.phase === "done") && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-sm font-semibold tabular-nums">
                    {count?.toLocaleString()} propert{count === 1 ? "y" : "ies"}
                  </span>
                  {phase.phase === "done" && (
                    <span className="flex items-center gap-1 text-sm text-green-600">
                      <CheckCircle2 className="size-4" aria-hidden />
                      Download started
                    </span>
                  )}
                </div>

                {nearLimit && (
                  <p className="flex items-center gap-1.5 text-sm text-amber-600">
                    <TriangleAlert className="size-4 shrink-0" aria-hidden />
                    Large export — may take a moment to generate.
                  </p>
                )}

                {overLimit && (
                  <p className="flex items-center gap-1.5 text-sm text-destructive">
                    <XCircle className="size-4 shrink-0" aria-hidden />
                    Exceeds the {EXPORT_MAX.toLocaleString()}-row limit. Narrow your
                    filters to continue.
                  </p>
                )}
              </div>
            )}

            {phase.phase === "error" && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <XCircle className="size-4 shrink-0" aria-hidden />
                {phase.message}
              </p>
            )}
          </div>

          {hasActiveListFilters && filterLines.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-foreground">Active filters</p>
              <ul className="flex flex-col gap-1">
                {filterLines.map((line, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {line.label}:
                    </span>{" "}
                    {line.value}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                Columns{" "}
                <span className="font-normal text-muted-foreground">
                  ({enabledCount} selected)
                </span>
              </p>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={selectAll}
                >
                  Select all
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={deselectAll}
                >
                  Deselect all
                </Button>
              </div>
            </div>

            <div className="rounded-md border border-border overflow-y-auto max-h-72">
              {columns.map((col, i) => (
                <div
                  key={col.key}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm",
                    i !== columns.length - 1 && "border-b border-border/60",
                  )}
                >
                  <Checkbox
                    id={`export-col-${col.key}`}
                    checked={col.enabled}
                    onCheckedChange={(v) => toggleColumn(i, v === true)}
                  />
                  <label
                    htmlFor={`export-col-${col.key}`}
                    className="flex-1 cursor-pointer select-none truncate"
                  >
                    {col.label}
                  </label>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={() => moveColumn(i, "up")}
                      disabled={i === 0}
                      aria-label={`Move ${col.label} up`}
                      tabIndex={-1}
                    >
                      <ArrowUp className="size-3" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={() => moveColumn(i, "down")}
                      disabled={i === columns.length - 1}
                      aria-label={`Move ${col.label} down`}
                      tabIndex={-1}
                    >
                      <ArrowDown className="size-3" aria-hidden />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="mx-0 mb-0 px-6 py-4 border-t border-border shrink-0 flex-row justify-between sm:justify-between gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm">
              Cancel
            </Button>
          </DialogClose>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={downloadDisabled}
              onClick={() => handleDownload("xlsx")}
              data-testid="properties-export-xlsx-button"
            >
              {phase.phase === "done" ? (
                <>
                  <CheckCircle2 className="mr-1.5 size-4 shrink-0" aria-hidden />
                  Download started
                </>
              ) : (
                <>
                  <FileSpreadsheet className="mr-1.5 size-4 shrink-0" aria-hidden />
                  Export as XLSX
                </>
              )}
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={downloadDisabled}
              onClick={() => handleDownload("pdf")}
              data-testid="properties-export-pdf-button"
            >
              {phase.phase === "done" ? (
                <>
                  <CheckCircle2 className="mr-1.5 size-4 shrink-0" aria-hidden />
                  Download started
                </>
              ) : (
                <>
                  <FileText className="mr-1.5 size-4 shrink-0" aria-hidden />
                  Export as PDF
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
