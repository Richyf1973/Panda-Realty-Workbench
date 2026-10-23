"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Mail, Phone } from "lucide-react"

import { formatAdminEntityListCellDisplay } from "../../admin-entity-list-display-format"
import type { AdminEntityCrudRelatedEmbedPreviewColumn } from "../../admin-entity-types"
import { sanitizeAdminEntityDecimalAmountInput } from "../../admin-entity-currency-decimal-input"
import {
  adminEntityColumnForRelatedEmbedPreview,
  relatedEmbedPreviewCellAlign,
  relatedInlineMinWidthPxForSpec,
  type RelatedInlineCellColumnMeta,
} from "../../admin-entity-crud-related-inline-helpers"
import {
  formatAdminEntityDecimalAmountFormDisplay,
} from "../../admin-entity-list-numeric-format"
import type { LineRow } from "../../admin-entity-crud-related-collections-draft"
import {
  AdminEntityCrudCurrencyAmountTextInput,
} from "./admin-entity-crud-currency-amount-input"
import { cn } from "@repo/ui/utils"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@repo/ui/input-group"
import { Input } from "@repo/ui/input"

import type { RelatedInlineColumnDefsCtx } from "./related-collection-inline-column-defs"
import { relatedInlineColumnHeaderNode } from "./related-collection-inline-column-defs"

export function buildEmbedPreviewColumn(
  ctx: RelatedInlineColumnDefsCtx,
  pinEndKey: string | undefined,
  pinStartKey: string | undefined,
  ec: AdminEntityCrudRelatedEmbedPreviewColumn,
): ColumnDef<LineRow> {
  const { collection, childCfg, adminEntities, parentSlug } = ctx

  const align = relatedEmbedPreviewCellAlign(adminEntities, ec)
  const minW = relatedInlineMinWidthPxForSpec(
    collection,
    childCfg,
    { kind: "embed", key: ec.key, ec },
    adminEntities,
  )

  return {
    id: `__embed_${ec.key}`,
    header: () => relatedInlineColumnHeaderNode(ec.label, align),
    meta: {
      relatedStickyEnd: pinEndKey != null && pinEndKey === ec.key,
      relatedStickyStart: pinStartKey != null && pinStartKey === ec.key,
      relatedMinWidthPx: minW,
      relatedMaxWidthPx: collection.inlineColumnMaxWidthsPx?.[ec.key],
      cellAlign: align,
    } satisfies RelatedInlineCellColumnMeta,
    cell: ({ row }) => {
      const line = row.original
      const raw = line[ec.embedJsonKey]
      const rawField =
        raw != null && typeof raw === "object" && !Array.isArray(raw)
          ? (raw as Record<string, unknown>)[ec.field]
          : undefined
      const lf = ec.listFormatFrom
      const fmtCol = adminEntityColumnForRelatedEmbedPreview(adminEntities, ec)
      let text =
        lf != null
          ? fmtCol != null
            ? formatAdminEntityListCellDisplay(rawField, fmtCol).trim()
            : rawField == null
              ? ""
              : String(rawField)
          : rawField == null
            ? ""
            : String(rawField)
      const testId = `admin-entity-crud-related-embed--${parentSlug}--${collection.jsonKey}--${ec.key}--${line.clientKey}`
      const inputAlign =
        align === "right"
          ? "text-right tabular-nums"
          : align === "center"
            ? "text-center tabular-nums"
            : "tabular-nums"
      const spanAlign =
        align === "right"
          ? "block min-w-0 truncate text-sm text-end tabular-nums"
          : align === "center"
            ? "block min-w-0 truncate text-sm text-center tabular-nums"
            : "block min-w-0 truncate text-sm"
      const currencySym =
        fmtCol?.valueType === "numeric"
          ? fmtCol.currencySymbol?.trim()
          : undefined
      if (ec.displayAsDisabledInput === true) {
        if (currencySym) {
          const rawStr =
            rawField == null ? "" : String(rawField).trim()
          const embedDecOpts =
            fmtCol?.currencyAmountAllowLeadingMinus === true
              ? { allowLeadingMinus: true as const }
              : undefined
          const displayAmount =
            rawStr === ""
              ? ""
              : formatAdminEntityDecimalAmountFormDisplay(
                  sanitizeAdminEntityDecimalAmountInput(
                    rawStr,
                    embedDecOpts,
                  ),
                  embedDecOpts,
                )
          return (
            <InputGroup className="h-8 w-full">
              <InputGroupAddon>
                <InputGroupText className="tabular-nums text-foreground">
                  {currencySym}
                </InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                disabled
                className="h-8 text-right tabular-nums"
                value={displayAmount}
                aria-label={ec.label}
                data-testid={testId}
              />
            </InputGroup>
          )
        }
        const linkType = ec.listCellLinkType
        if (linkType && text.trim()) {
          const isPhone = linkType === "tel"
          return (
            <div className="relative">
              <Input
                className={cn("h-8 min-w-0 pr-7", inputAlign)}
                disabled
                value={text}
                aria-label={ec.label}
                data-testid={testId}
              />
              <a
                href={`${linkType}:${text.trim()}`}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={isPhone ? "Call" : "Send email"}
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
              >
                {isPhone ? (
                  <Phone className="size-3 shrink-0" />
                ) : (
                  <Mail className="size-3 shrink-0" />
                )}
              </a>
            </div>
          )
        }
        return (
          <Input
            className={cn("h-8 min-w-0", inputAlign)}
            disabled
            value={text}
            aria-label={ec.label}
            data-testid={testId}
          />
        )
      }
      return (
        <span className={spanAlign} data-testid={testId}>
          {text}
        </span>
      )
    },
  }
}
