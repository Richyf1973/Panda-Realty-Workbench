"use client"

import type { ColumnDef } from "@tanstack/react-table"

import type { AdminEntityColumn } from "../../admin-entity-types"
import {
  RELATED_INLINE_MIN_WIDTH_PX_CURRENCY,
  RELATED_INLINE_MIN_WIDTH_PX_PLAIN_NUMERIC,
  resolveRelatedInlineReadonlyColumnAlign,
  type RelatedInlineCellColumnMeta,
} from "../../admin-entity-crud-related-inline-helpers"
import {
  formatAdminEntityNumericListCell,
} from "../../admin-entity-list-numeric-format"
import { parseAdminEntityListDayCountInteger } from "../../admin-entity-list-day-count-label"
import type { LineRow } from "../../admin-entity-crud-related-collections-draft"
import { cn } from "@repo/ui/utils"

import type { RelatedInlineColumnDefsCtx } from "./related-collection-inline-column-defs"
import { relatedInlineColumnHeaderNode } from "./related-collection-inline-column-defs"

export function buildReadonlyColumn(
  ctx: RelatedInlineColumnDefsCtx,
  pinEndKey: string | undefined,
  pinStartKey: string | undefined,
  key: string,
): ColumnDef<LineRow> {
  const { childCfg, collection, parentSlug } = ctx

  const col = childCfg.columns.find((c) => c.key === key) as
    | AdminEntityColumn
    | undefined
  const label = collection.inlineColumnLabelOverrides?.[key] ?? col?.label ?? key
  const readonlyAlign = resolveRelatedInlineReadonlyColumnAlign(col)
  const minW =
    collection.inlineColumnMinWidthsPx?.[key] ??
    (col?.valueType === "numeric" && col.currencySymbol
      ? RELATED_INLINE_MIN_WIDTH_PX_CURRENCY
      : col?.valueType === "numeric" || col?.valueType === "integer"
        ? RELATED_INLINE_MIN_WIDTH_PX_PLAIN_NUMERIC
        : undefined)
  const maxW = collection.inlineColumnMaxWidthsPx?.[key]

  return {
    id: `__readonly_${key}`,
    meta: {
      relatedStickyEnd: pinEndKey != null && pinEndKey === key,
      relatedStickyStart: pinStartKey != null && pinStartKey === key,
      relatedMinWidthPx: minW,
      relatedMaxWidthPx: maxW,
      cellAlign: readonlyAlign,
    } satisfies RelatedInlineCellColumnMeta,
    header: () => relatedInlineColumnHeaderNode(label, readonlyAlign),
    cell: ({ row }) => {
      const line = row.original
      const testId = `admin-entity-crud-related-readonly-cell--${parentSlug}--${collection.jsonKey}--${key}--${line.clientKey}`
      if (col?.listIntegerBadgeBands && col.valueType === "integer") {
        const { greenFrom, orangeFrom } = col.listIntegerBadgeBands
        const n = parseAdminEntityListDayCountInteger(line[key])
        const justify =
          col.cellAlign === "right"
            ? "justify-end"
            : col.cellAlign === "center"
              ? "justify-center"
              : "justify-start"
        if (n == null) {
          return (
            <span
              className={cn("flex w-full text-muted-foreground tabular-nums", justify)}
              data-testid={testId}
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
          <span className={cn("inline-flex w-full", justify)} data-testid={testId}>
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
      const value =
        typeof line[key] === "string"
          ? (line[key] as string)
          : String(line[key] ?? "")
      const text =
        value.trim() === ""
          ? ""
          : col?.valueType === "numeric" || col?.valueType === "integer"
            ? formatAdminEntityNumericListCell(value, {
                currencySymbol: col?.currencySymbol,
                allowLeadingMinus:
                  col?.currencyAmountAllowLeadingMinus === true,
              })
            : value
      return (
        <span
          className="block text-end tabular-nums"
          data-testid={testId}
        >
          {text}
        </span>
      )
    },
  } satisfies ColumnDef<LineRow>
}
