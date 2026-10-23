"use client"

import type { ColumnDef } from "@tanstack/react-table"

import type { AdminEntityCrudRelatedVirtualColumn } from "../../admin-entity-types"
import { sanitizeAdminEntityDecimalAmountInput } from "../../admin-entity-currency-decimal-input"
import {
  evalRelatedInlineVirtualNumeric,
  relatedInlineRegistryNumericCompareDisplay,
  RELATED_INLINE_MIN_WIDTH_PX_CURRENCY,
  type RelatedInlineCellColumnMeta,
} from "../../admin-entity-crud-related-inline-helpers"
import {
  formatAdminEntityNumericListCell,
} from "../../admin-entity-list-numeric-format"
import type { LineRow } from "../../admin-entity-crud-related-collections-draft"
import {
  AdminEntityCrudCurrencyAmountTextInput,
} from "./admin-entity-crud-currency-amount-input"
import { cn } from "@repo/ui/utils"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
} from "@repo/ui/input-group"

import type { RelatedInlineColumnDefsCtx } from "./related-collection-inline-column-defs"
import { relatedInlineColumnHeaderNode } from "./related-collection-inline-column-defs"

export function buildVirtualColumn(
  ctx: RelatedInlineColumnDefsCtx,
  pinEndKey: string | undefined,
  pinStartKey: string | undefined,
  vc: AdminEntityCrudRelatedVirtualColumn,
): ColumnDef<LineRow> {
  const {
    collection,
    parentSlug,
    relationNumericMapsRef,
    detailPayloadRef,
    evalRelatedInlineVirtualRegistryNumericRef,
  } = ctx

  return {
    id: `__virtual_${vc.key}`,
    meta: {
      relatedStickyEnd: pinEndKey != null && pinEndKey === vc.key,
      relatedStickyStart: pinStartKey != null && pinStartKey === vc.key,
      relatedMinWidthPx:
        collection.inlineColumnMinWidthsPx?.[vc.key] ??
        (vc.currencySymbol?.trim()
          ? RELATED_INLINE_MIN_WIDTH_PX_CURRENCY
          : undefined),
      relatedMaxWidthPx: collection.inlineColumnMaxWidthsPx?.[vc.key],
      cellAlign: "right",
    } satisfies RelatedInlineCellColumnMeta,
    header: () => relatedInlineColumnHeaderNode(vc.label, "right"),
    cell: ({ row }) => {
      const line = row.original
      const n = evalRelatedInlineVirtualNumeric(
        vc,
        line,
        relationNumericMapsRef.current,
        detailPayloadRef.current,
        evalRelatedInlineVirtualRegistryNumericRef.current,
      )
      const { className: compareClass, dataVsLine } =
        relatedInlineRegistryNumericCompareDisplay(vc, n, line)
      const sym = vc.currencySymbol?.trim()
      const testId = `admin-entity-crud-related-virtual-cell--${parentSlug}--${collection.jsonKey}--${vc.key}--${line.clientKey}`
      const dataVsAttr =
        dataVsLine === "neutral" ? undefined : dataVsLine

      if (sym) {
        const plain =
          n == null || !Number.isFinite(n)
            ? ""
            : sanitizeAdminEntityDecimalAmountInput(String(n)) || String(n)
        return (
          <div
            className={cn("w-full min-w-0", compareClass || undefined)}
            data-testid={testId}
            data-line-total-vs-rounded={dataVsAttr}
          >
            <InputGroup className="h-8 w-full">
              <InputGroupAddon>
                <InputGroupText className="tabular-nums">{sym}</InputGroupText>
              </InputGroupAddon>
              <AdminEntityCrudCurrencyAmountTextInput
                className="h-8 text-right tabular-nums"
                value={plain}
                onChange={() => {}}
                onBlur={() => {}}
                readOnly
                inputMode="decimal"
                aria-label={vc.label}
              />
            </InputGroup>
          </div>
        )
      }

      const text =
        n == null
          ? ""
          : formatAdminEntityNumericListCell(String(n), {
              currencySymbol: vc.currencySymbol,
            })
      return (
        <span
          className={`block text-end tabular-nums${compareClass ? ` ${compareClass}` : ""}`}
          data-testid={testId}
          data-line-total-vs-rounded={dataVsAttr}
        >
          {text}
        </span>
      )
    },
  }
}
