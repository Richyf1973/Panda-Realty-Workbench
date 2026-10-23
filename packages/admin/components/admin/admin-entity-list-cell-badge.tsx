"use client"

import type { ReactNode } from "react"
import { cn } from "@repo/ui/utils"

import {
  adminEntityListDayCountBadgeClassName,
  formatAdminEntitySignedDayCountLabel,
  parseAdminEntityListDayCountInteger,
} from "../../admin-entity-list-day-count-label"
import type { AdminCellAlign, AdminEntityColumn } from "../../admin-entity-types"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"

type BadgeCellParams = {
  field: AdminEntityColumn
  raw: unknown
  rowId: string
  slug: AdminEntitySlug
  cellAlign: AdminCellAlign
}

export function renderBadgeCell({
  field,
  raw,
  rowId,
  slug,
  cellAlign,
}: BadgeCellParams): ReactNode | null {
  const justify =
    cellAlign === "right"
      ? "justify-end"
      : cellAlign === "center"
        ? "justify-center"
        : "justify-start"

  if (field.listDayCountBadgeBands && field.valueType === "integer") {
    const n = parseAdminEntityListDayCountInteger(raw)
    if (n == null) {
      return (
        <span
          className={cn(
            "flex w-full text-muted-foreground",
            justify,
            cellAlign === "right" && "tabular-nums",
          )}
          data-testid={`admin-entity-row-cell--${slug}--${rowId}--${field.key}`}
        >
          —
        </span>
      )
    }
    return (
      <span
        className={cn("inline-flex w-full", justify)}
        data-testid={`admin-entity-row-cell--${slug}--${rowId}--${field.key}`}
      >
        <span
          className={cn(
            "inline-flex max-w-full items-center justify-center rounded-md border px-2.5 py-0.5 text-center text-xs font-semibold leading-none tracking-tight",
            adminEntityListDayCountBadgeClassName(n, field.listDayCountBadgeBands),
          )}
        >
          {formatAdminEntitySignedDayCountLabel(n)}
        </span>
      </span>
    )
  }

  if (field.listIntegerBadgeBands && field.valueType === "integer") {
    const { greenFrom, orangeFrom } = field.listIntegerBadgeBands
    const n = parseAdminEntityListDayCountInteger(raw)
    if (n == null) {
      return (
        <span
          className={cn(
            "flex w-full text-muted-foreground",
            justify,
            cellAlign === "right" && "tabular-nums",
          )}
          data-testid={`admin-entity-row-cell--${slug}--${rowId}--${field.key}`}
        >
          —
        </span>
      )
    }
    const badgeClass =
      n >= greenFrom
        ? "border-transparent bg-emerald-600/15 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-50"
        : n >= orangeFrom
          ? "border-transparent bg-amber-500/20 text-amber-950 dark:bg-amber-400/20 dark:text-amber-50"
          : "border-transparent bg-destructive/15 text-destructive dark:bg-destructive/25 dark:text-destructive-foreground"
    return (
      <span
        className={cn("inline-flex w-full", justify)}
        data-testid={`admin-entity-row-cell--${slug}--${rowId}--${field.key}`}
      >
        <span
          className={cn(
            "inline-flex max-w-full items-center justify-center rounded-md border px-2.5 py-0.5 text-center text-xs font-semibold leading-none tracking-tight",
            badgeClass,
          )}
        >
          {n}
        </span>
      </span>
    )
  }

  return null
}
