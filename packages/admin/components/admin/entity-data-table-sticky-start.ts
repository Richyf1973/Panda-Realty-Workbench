"use client"

import type { CSSProperties } from "react"
import type { Table as TanStackTable } from "@tanstack/react-table"

import {
  computeStickyStartPlan,
  listColumnBoundsStyle,
  ROW_LINKS_COLUMN_ID,
  STICKY_BODY_SURFACE_CLASS,
  stickyLeftCellClassName,
  type EntityTableColumnMeta,
} from "./entity-data-table-helpers"

type StickyStartSection = "header" | "body" | "footer"

export type StickyStartDecorators = {
  /** Sticky-left className for a frozen column in a table section, else undefined. */
  stickyStartClass: (
    columnId: string,
    section: StickyStartSection,
  ) => string | undefined
  /** Column width bounds merged with the sticky-left `left` offset (+ fixed width for row-links). */
  stickyStartStyle: (
    columnId: string,
    meta: EntityTableColumnMeta | undefined,
  ) => CSSProperties | undefined
  /** Total px width of the frozen-left band (0 when freezing is disabled). */
  frozenLeftWidth: number
}

/**
 * Builds the frozen (sticky-left) cell decorators for {@link EntityDataTable}. Returns no-op
 * decorators (pass-through style, no class) when freezing is disabled or the key is absent.
 */
export function useStickyStartDecorators<TData>({
  table,
  stickyStartColumnKey,
  stickyStartRowLinksWidthPx,
}: {
  table: TanStackTable<TData>
  stickyStartColumnKey: string | undefined
  stickyStartRowLinksWidthPx: number | undefined
}): StickyStartDecorators {
  const plan = computeStickyStartPlan({
    orderedLeaf: table.getVisibleLeafColumns().map((column) => ({
      id: column.id,
      meta: column.columnDef.meta as EntityTableColumnMeta | undefined,
    })),
    stickyStartColumnKey,
    rowLinksWidthPx: stickyStartRowLinksWidthPx,
  })

  const stickyStartClass = (
    columnId: string,
    section: StickyStartSection,
  ): string | undefined => {
    const entry = plan?.get(columnId)
    if (!entry) return undefined
    if (section === "body") {
      return stickyLeftCellClassName({
        zClassName: "z-10",
        surfaceClassName: STICKY_BODY_SURFACE_CLASS,
        isSeam: entry.isSeam,
      })
    }
    return stickyLeftCellClassName({
      zClassName: "z-30",
      surfaceClassName:
        section === "footer" ? "bg-muted/95 backdrop-blur-sm" : "bg-muted",
      isSeam: entry.isSeam,
    })
  }

  const stickyStartStyle = (
    columnId: string,
    meta: EntityTableColumnMeta | undefined,
  ): CSSProperties | undefined => {
    const bounds = listColumnBoundsStyle(meta)
    const entry = plan?.get(columnId)
    if (!entry) return bounds
    return {
      ...bounds,
      left: entry.left,
      ...(columnId === ROW_LINKS_COLUMN_ID
        ? { minWidth: entry.width, maxWidth: entry.width }
        : {}),
    }
  }

  let frozenLeftWidth = 0
  if (plan) {
    for (const entry of plan.values()) {
      frozenLeftWidth = Math.max(frozenLeftWidth, entry.left + entry.width)
    }
  }

  return { stickyStartClass, stickyStartStyle, frozenLeftWidth }
}
