"use client"

import type { CSSProperties } from "react"

import type { AdminCellAlign, AdminEntityListRowHighlight } from "../../admin-entity-types"
import { cn } from "@repo/ui/utils"

export type EntityTableColumnMeta = {
  cellAlign?: AdminCellAlign
  listColumnMinWidthPx?: number
  listColumnMaxWidthPx?: number
  listColumnWrapMaxWidthPx?: number
  listColumnWrapMaxLines?: number
  /** Footer `<td colSpan={n}>` when `n > 1` (e.g. "Period total" across ID + Period columns). */
  footerColSpan?: number
}

export const TABLE_CLASS =
  "w-max min-w-full caption-bottom border-collapse text-sm"

export const STICKY_RIGHT_SEAM_CLASS =
  "border-l border-border/80 [box-shadow:inset_1px_0_0_0_var(--border),-16px_0_18px_-18px_rgb(0_0_0_/_0.95)]"

export const STICKY_LEFT_SEAM_CLASS =
  "border-r border-border/80 [box-shadow:inset_-1px_0_0_0_var(--border),16px_0_18px_-18px_rgb(0_0_0_/_0.95)]"

/** Opaque surface for a pinned **body** cell (card bg + hover tint) so scrolled content is hidden. */
export const STICKY_BODY_SURFACE_CLASS =
  "bg-card group-hover:bg-[color-mix(in_oklch,var(--muted)_30%,var(--card))]"

export function listColumnWrapClampClass(lines: number | undefined): string {
  const n = lines ?? 2
  if (n <= 1) return "line-clamp-1"
  if (n === 3) return "line-clamp-3"
  if (n >= 4) return "line-clamp-4"
  return "line-clamp-2"
}

export function listColumnBoundsStyle(
  meta: EntityTableColumnMeta | undefined,
): CSSProperties | undefined {
  if (!meta) return undefined
  const {
    listColumnMinWidthPx: min,
    listColumnMaxWidthPx: max,
    listColumnWrapMaxWidthPx: wrapMax,
  } = meta
  if (wrapMax != null) {
    return {
      ...(min != null ? { minWidth: min } : {}),
      maxWidth: wrapMax,
    }
  }
  if (min == null && max == null) return undefined
  return {
    ...(min != null ? { minWidth: min } : {}),
    ...(max != null ? { maxWidth: max } : {}),
  }
}

export function listColumnBoundsCellClassName(
  meta: EntityTableColumnMeta | undefined,
): string | undefined {
  if (meta?.listColumnWrapMaxWidthPx != null) {
    return cn(
      "overflow-hidden whitespace-normal break-words",
      listColumnWrapClampClass(meta.listColumnWrapMaxLines),
    )
  }
  return meta?.listColumnMaxWidthPx != null
    ? "overflow-hidden text-ellipsis whitespace-nowrap"
    : undefined
}

export function alignClassForColumn(column: {
  id: string
  columnDef: { meta?: unknown }
}): string {
  if (column.id === "actions") return "text-right"
  const meta = column.columnDef.meta as EntityTableColumnMeta | undefined
  const a = meta?.cellAlign ?? "left"
  if (a === "center") return "text-center"
  if (a === "right") return "text-right"
  return "text-left"
}

/**
 * Returns the highlight className for a row. The primary `field` wins; when it is falsy and an
 * optional `warningField` is truthy, the lower-priority `warningClassName` is applied instead.
 */
export function rowHighlightClassName(
  rowOriginal: unknown,
  highlight: AdminEntityListRowHighlight | undefined,
): string | undefined {
  if (!highlight) return undefined
  const record = rowOriginal as Record<string, unknown>
  if (record[highlight.field]) return highlight.className
  if (highlight.warningField && record[highlight.warningField]) return highlight.warningClassName
  return undefined
}

/** Returns the `data-row-highlight-labels` value (joined when array) for a highlighted row. */
export function rowHighlightLabels(
  rowOriginal: unknown,
  highlight: AdminEntityListRowHighlight | undefined,
): string | undefined {
  if (!highlight) return undefined
  const record = rowOriginal as Record<string, unknown>
  if (record[highlight.field] && highlight.labelsField) {
    return joinLabels(record[highlight.labelsField])
  }
  if (highlight.warningField && record[highlight.warningField] && highlight.warningLabelsField) {
    return joinLabels(record[highlight.warningLabelsField])
  }
  return undefined
}

function joinLabels(value: unknown): string | undefined {
  if (Array.isArray(value)) return value.join(", ")
  return value != null ? String(value) : undefined
}

/** Identifier of the shared leading row-links column (external icon links). */
export const ROW_LINKS_COLUMN_ID = "row-links"

/** Fallback width (px) for a frozen column whose fixed width could not be resolved from meta. */
export const STICKY_START_FALLBACK_WIDTH_PX = 120

export type StickyStartEntry = {
  /** Cumulative left offset (px) = sum of widths of all preceding frozen columns. */
  left: number
  /** Fixed width (px) applied to this frozen cell (only needed for the row-links column). */
  width: number
  /** True for the last frozen column — receives the right-edge seam. */
  isSeam: boolean
}

/** Resolves a frozen column's fixed width from its meta (min===max) or the row-links override. */
function stickyStartColumnWidth(
  columnId: string,
  meta: EntityTableColumnMeta | undefined,
  rowLinksWidthPx: number | undefined,
): number {
  if (columnId === ROW_LINKS_COLUMN_ID) {
    return rowLinksWidthPx ?? STICKY_START_FALLBACK_WIDTH_PX
  }
  return (
    meta?.listColumnMaxWidthPx ??
    meta?.listColumnMinWidthPx ??
    STICKY_START_FALLBACK_WIDTH_PX
  )
}

/**
 * Computes the sticky-left plan for the leading columns up to **and including**
 * `stickyStartColumnKey`. `orderedLeaf` must be the visible leaf columns in render order. Returns a
 * map keyed by column id, or `null` when freezing is disabled or the key is not among the columns.
 */
export function computeStickyStartPlan({
  orderedLeaf,
  stickyStartColumnKey,
  rowLinksWidthPx,
}: {
  orderedLeaf: readonly {
    id: string
    meta: EntityTableColumnMeta | undefined
  }[]
  stickyStartColumnKey: string | undefined
  rowLinksWidthPx: number | undefined
}): Map<string, StickyStartEntry> | null {
  if (!stickyStartColumnKey) return null
  const boundary = orderedLeaf.findIndex((c) => c.id === stickyStartColumnKey)
  if (boundary < 0) return null

  const plan = new Map<string, StickyStartEntry>()
  let left = 0
  for (let i = 0; i <= boundary; i += 1) {
    const col = orderedLeaf[i]!
    const width = stickyStartColumnWidth(col.id, col.meta, rowLinksWidthPx)
    plan.set(col.id, { left, width, isSeam: i === boundary })
    left += width
  }
  return plan
}

/** Class + style for a frozen (sticky-left) cell, mirroring {@link stickyRightCellClassName}. */
export function stickyLeftCellClassName({
  surfaceClassName,
  zClassName,
  isSeam,
}: {
  surfaceClassName: string
  zClassName: string
  isSeam: boolean
}): string {
  return cn(
    "sticky whitespace-nowrap",
    zClassName,
    surfaceClassName,
    isSeam && STICKY_LEFT_SEAM_CLASS,
  )
}

export function stickyRightCellClassName({
  surfaceClassName,
  zClassName,
  isHeader = false,
  preserveBackdropBlur = false,
}: {
  surfaceClassName: string
  zClassName: string
  isHeader?: boolean
  preserveBackdropBlur?: boolean
}): string {
  return cn(
    "sticky right-0 whitespace-nowrap",
    zClassName,
    isHeader && "w-[1%]",
    preserveBackdropBlur && "backdrop-blur-sm",
    surfaceClassName,
    STICKY_RIGHT_SEAM_CLASS,
  )
}
