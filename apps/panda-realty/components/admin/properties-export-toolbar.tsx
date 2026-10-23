"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Download } from "lucide-react"

import { Button } from "@repo/ui/button"

import { formatDateDdMmYyyyCompact } from "@/lib/format-date-ddmmyyyy-compact"

import { PropertiesExportDialog } from "./properties-export-dialog"
import {
  buildFilterSummaryLines,
  type FilterLine,
} from "./properties-export-filter-lines"
import { DEFAULT_COLUMNS, EXPORT_MAX } from "./properties-export-toolbar-config"
import type {
  ExportColumn,
  ExportPhase,
  PropertiesExportToolbarProps,
} from "./properties-export-toolbar.types"

export type { PropertiesExportToolbarProps } from "./properties-export-toolbar.types"

export function PropertiesExportToolbar({
  totalCount: _totalCount,
  hasActiveListFilters,
  adminUiMutationsDisabled,
}: PropertiesExportToolbarProps) {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<ExportPhase>({ phase: "idle" })
  const [columns, setColumns] = useState<ExportColumn[]>(DEFAULT_COLUMNS)
  const [filterLines, setFilterLines] = useState<FilterLine[]>([])
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort()
      return
    }

    const locationSearch =
      typeof window !== "undefined" ? window.location.search : ""
    setFilterLines(buildFilterSummaryLines(locationSearch))
    setPhase({ phase: "preparing" })

    const ctrl = new AbortController()
    abortRef.current = ctrl

    const qs = locationSearch.replace(/^\?/, "")
    fetch(`/api/admin/properties/export?${qs}&countOnly=true`, {
      signal: ctrl.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Server error ${res.status}`)
        return res.json() as Promise<{ count: number }>
      })
      .then(({ count }) => {
        if (!ctrl.signal.aborted) {
          setPhase({ phase: "ready", count })
        }
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return
        const msg =
          err instanceof Error ? err.message : "Could not load export count."
        setPhase({ phase: "error", message: msg })
      })

    return () => ctrl.abort()
  }, [open])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        abortRef.current?.abort()
        setTimeout(() => setPhase({ phase: "idle" }), 200)
      }
      setOpen(next)
    },
    [],
  )

  const moveColumn = useCallback((index: number, dir: "up" | "down") => {
    setColumns((prev) => {
      const next = [...prev]
      const swap = dir === "up" ? index - 1 : index + 1
      if (swap < 0 || swap >= next.length) return prev
      ;[next[index], next[swap]] = [next[swap]!, next[index]!]
      return next
    })
  }, [])

  const toggleColumn = useCallback((index: number, enabled: boolean) => {
    setColumns((prev) =>
      prev.map((c, i) => (i === index ? { ...c, enabled } : c)),
    )
  }, [])

  const selectAll = useCallback(() => {
    setColumns((prev) => prev.map((c) => ({ ...c, enabled: true })))
  }, [])

  const deselectAll = useCallback(() => {
    setColumns((prev) => prev.map((c) => ({ ...c, enabled: false })))
  }, [])

  const handleDownload = useCallback((fmt: "xlsx" | "pdf") => {
    setPhase({ phase: "exporting" })
    const locationSearch =
      typeof window !== "undefined" ? window.location.search : ""
    const qs = locationSearch.replace(/^\?/, "")
    const enabledKeys = columns
      .filter((c) => c.enabled)
      .map((c) => c.key)
      .join(",")
    const baseUrl = `/api/admin/properties/export?${qs}&columns=${encodeURIComponent(enabledKeys)}`
    const url = fmt === "pdf" ? `${baseUrl}&format=pdf` : baseUrl
    const ext = fmt === "pdf" ? "pdf" : "xlsx"
    const a = document.createElement("a")
    a.href = url
    a.download = `properties-export-${formatDateDdMmYyyyCompact(new Date())}.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    setPhase({ phase: "done" })
    setTimeout(() => {
      setOpen(false)
    }, 1500)
  }, [columns])

  const count = phase.phase === "ready" ? phase.count : null
  const overLimit = count !== null && count > EXPORT_MAX
  const enabledCount = columns.filter((c) => c.enabled).length

  const downloadDisabled =
    phase.phase === "preparing" ||
    phase.phase === "exporting" ||
    phase.phase === "done" ||
    overLimit ||
    enabledCount === 0

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={Boolean(adminUiMutationsDisabled)}
        onClick={() => setOpen(true)}
        data-testid="properties-export-button"
      >
        <Download className="mr-1.5 size-4 shrink-0" aria-hidden />
        Export
      </Button>

      <PropertiesExportDialog
        open={open}
        onOpenChange={handleOpenChange}
        phase={phase}
        filterLines={filterLines}
        hasActiveListFilters={hasActiveListFilters}
        columns={columns}
        enabledCount={enabledCount}
        moveColumn={moveColumn}
        toggleColumn={toggleColumn}
        selectAll={selectAll}
        deselectAll={deselectAll}
        handleDownload={handleDownload}
        downloadDisabled={downloadDisabled}
      />
    </>
  )
}
