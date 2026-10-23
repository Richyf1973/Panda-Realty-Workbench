"use client"

import { useState, type ReactNode } from "react"
import {
  flexRender,
  type Cell,
  type Row,
  type Table as TanStackTable,
} from "@tanstack/react-table"

import type { AdminEntityTableRow } from "../../admin-entity-admin-types"
import type {
  AdminEntityListMobileCardField,
  AdminEntityListMobileCardResolvedGroup,
} from "../../admin-entity-list-mobile-card-fields"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type { AdminEntityListRowHighlight } from "../../admin-entity-types"
import {
  formatAdminEntityDecimalAmountFormDisplay,
  formatAdminEntityNumericListCell,
} from "../../admin-entity-list-numeric-format"
import { rowHighlightClassName, rowHighlightLabels } from "./entity-data-table-helpers"
import { AdminListRowRenderModeProvider } from "../../admin-list-row-render-mode-context"
import { Button } from "@repo/ui/button"
import { ClientOnly } from "@repo/ui/client-only"
import { Switch } from "@repo/ui/switch"
import { cn } from "@repo/ui/utils"

type EntityDataTableMobileCardsProps = {
  table: TanStackTable<AdminEntityTableRow>
  entitySlug: AdminEntitySlug
  fields: readonly AdminEntityListMobileCardField[]
  titleColumnKey: string
  /** Body sections; omit for a single flat label/value list (minus title). */
  groups?: readonly AdminEntityListMobileCardResolvedGroup[]
  listHideRowActions?: boolean
  /** Tighter spacing for very small viewports. */
  compactChrome?: boolean
  /** Even tighter outer padding when the entity sets `listCompactListCardDense`. */
  compactListCardDense?: boolean
  /** Omit uppercase label above the title cell (value only). */
  hideTitleFieldLabel?: boolean
  /** When set with {@link titleRowOpensEditDialog}, title + Open use this handler (same as list Edit). */
  onMobileCardOpenRow?: (row: AdminEntityTableRow) => void
  /** From entity `listMobileCard.titleRowOpensEditDialog`. */
  titleRowOpensEditDialog?: boolean
  /** Opt-in whole-card highlight driven by a boolean field on each row's original data. */
  listRowHighlight?: AdminEntityListRowHighlight
}

function cellForColumn<TData>(
  row: Row<TData>,
  columnId: string,
): Cell<TData, unknown> | undefined {
  return row.getVisibleCells().find((c) => c.column.id === columnId)
}

function adminMobileCardRawValueIsEmpty(raw: unknown): boolean {
  if (raw == null) return true
  if (typeof raw === "string") return raw.trim() === ""
  return false
}

function shouldOmitMobileCardField(
  row: Row<AdminEntityTableRow>,
  f: AdminEntityListMobileCardField,
): boolean {
  if (f.omitRowWhenEmpty !== true) return false
  return adminMobileCardRawValueIsEmpty(row.original[f.columnKey])
}

function parseDecimalForLineTotal(raw: unknown): number | null {
  if (raw == null) return null
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null
  }
  const s = String(raw).trim()
  if (s === "") return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function mobileCardUnitDisplayText(
  original: AdminEntityTableRow,
  unitKey: string,
  unitFromRelatedEmbed?:
    | { readonly embedJsonKey: string; readonly relatedFieldKey: string }
    | undefined,
): string {
  const direct = original[unitKey]
  if (!adminMobileCardRawValueIsEmpty(direct)) {
    return String(direct).trim()
  }
  if (unitFromRelatedEmbed) {
    const emb = original[unitFromRelatedEmbed.embedJsonKey]
    if (emb && typeof emb === "object" && !Array.isArray(emb)) {
      const v = (emb as Record<string, unknown>)[
        unitFromRelatedEmbed.relatedFieldKey
      ]
      if (!adminMobileCardRawValueIsEmpty(v)) return String(v).trim()
    }
  }
  return ""
}

function formatMobileQtyUnitLine(
  original: AdminEntityTableRow,
  qtyKey: string,
  unitKey: string,
  unitFromRelatedEmbed?:
    | { readonly embedJsonKey: string; readonly relatedFieldKey: string }
    | undefined,
): string {
  const qRaw = original[qtyKey]
  const unit = mobileCardUnitDisplayText(
    original,
    unitKey,
    unitFromRelatedEmbed,
  )
  if (qRaw == null || (typeof qRaw === "string" && qRaw.trim() === "")) {
    return unit || "—"
  }
  const qStr = typeof qRaw === "number" ? String(qRaw) : String(qRaw).trim()
  const formatted = formatAdminEntityDecimalAmountFormDisplay(qStr)
  return unit ? `${formatted} ${unit}` : formatted
}

function lineTotalAmountDisplay(
  original: AdminEntityTableRow,
  f: AdminEntityListMobileCardField,
  qtyKey: string,
): ReactNode {
  const qty = parseDecimalForLineTotal(original[qtyKey])
  const raw = original[f.columnKey]
  const val = parseDecimalForLineTotal(raw)
  if (qty == null || val == null) {
    return formatAdminEntityNumericListCell(raw, {
      currencySymbol: f.currencySymbol,
    })
  }
  const product = qty * val
  if (!Number.isFinite(product)) {
    return formatAdminEntityNumericListCell(raw, {
      currencySymbol: f.currencySymbol,
    })
  }
  return formatAdminEntityNumericListCell(product.toFixed(2), {
    currencySymbol: f.currencySymbol,
  })
}

function mobileCardDdClass(
  f: AdminEntityListMobileCardField,
  layout: "rows" | "grid2" | "flat",
): string {
  const alignClass =
    f.cellAlign === "right"
      ? "text-right"
      : f.cellAlign === "center"
        ? "text-center"
        : null
  if (f.currencySymbol != null) {
    return cn("whitespace-nowrap tabular-nums font-medium", alignClass)
  }
  if (layout === "grid2") {
    return cn(
      "min-w-0 wrap-break-word font-medium [overflow-wrap:anywhere]",
      alignClass,
    )
  }
  if (layout === "flat") {
    return cn(
      "min-w-0 wrap-break-word font-medium [overflow-wrap:anywhere]",
      alignClass,
    )
  }
  /** Grouped `rows`: text wraps (e.g. long descriptions); currency uses the branch above. */
  return cn(
    "min-w-0 wrap-break-word font-medium [overflow-wrap:anywhere]",
    alignClass,
  )
}

function mobileCardLabelAlignClass(f: AdminEntityListMobileCardField): string | null {
  return f.cellAlign === "right"
    ? "text-right"
    : f.cellAlign === "center"
      ? "text-center"
      : null
}

/** `rows` layout: right-align currency values so decimals line up when a label is shown. */
function mobileCardRowsDdClass(f: AdminEntityListMobileCardField): string {
  return mobileCardDdClass(f, "rows")
}

export function EntityDataTableMobileCards({
  table,
  entitySlug,
  fields,
  titleColumnKey,
  groups,
  listHideRowActions = false,
  compactChrome = false,
  compactListCardDense = false,
  hideTitleFieldLabel = false,
  onMobileCardOpenRow,
  titleRowOpensEditDialog = false,
  listRowHighlight,
}: EntityDataTableMobileCardsProps) {
  const rows = table.getRowModel().rows
  const detailFields = fields.filter((f) => f.columnKey !== titleColumnKey)
  const titleField = fields.find((f) => f.columnKey === titleColumnKey)
  const useGroups = groups != null && groups.length > 0
  const [lineTotalsByRowId, setLineTotalsByRowId] = useState<
    Record<string, boolean>
  >({})

  const titleOpensEdit =
    titleRowOpensEditDialog === true && typeof onMobileCardOpenRow === "function"

  return (
    <AdminListRowRenderModeProvider mode="mobile-card">
    <div
      className={cn(
        "flex min-w-0 flex-col",
        compactChrome
          ? cn(
              "gap-1.5 px-1.5",
              compactListCardDense ? "py-0.5" : "py-1",
            )
          : "gap-3 px-4 py-2",
      )}
      data-testid={`admin-entity-mobile-card-list--${entitySlug}`}
    >
      {rows.map((row) => {
        const titleCell = cellForColumn(row, titleColumnKey)
        const actionsCell = listHideRowActions
          ? undefined
          : cellForColumn(row, "actions")
        const actionsInTitleRow =
          Boolean(actionsCell && titleField && titleCell)
        const visibleDetailFields = detailFields.filter(
          (f) => !shouldOmitMobileCardField(row, f),
        )

        return (
          <article
            key={row.id}
            className={cn(
              "rounded-lg border border-border/80 bg-card/80 shadow-sm",
              compactChrome ? "p-2" : "p-4",
              rowHighlightClassName(row.original, listRowHighlight),
            )}
            data-testid={`admin-entity-mobile-card--${entitySlug}--${row.id}`}
            data-row-highlight-labels={rowHighlightLabels(row.original, listRowHighlight)}
          >
            {titleField && titleCell ? (
              <div
                className={cn(
                  "border-b border-border/60",
                  hideTitleFieldLabel
                    ? compactChrome
                      ? "pb-1.5"
                      : "pb-2"
                    : compactChrome
                      ? "pb-2"
                      : "pb-3",
                )}
                data-testid={`admin-entity-mobile-card-title--${entitySlug}--${row.id}`}
              >
                {titleOpensEdit ? (
                  <div className="flex min-w-0 items-start justify-between gap-1.5 sm:gap-2">
                    <div className="min-w-0 flex-1">
                      {hideTitleFieldLabel ? null : (
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {titleField.label}
                        </p>
                      )}
                      <button
                        type="button"
                        className={cn(
                          "block min-w-0 w-full text-left font-semibold text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          compactChrome ? "text-sm leading-tight" : "text-base leading-snug",
                          hideTitleFieldLabel
                            ? null
                            : compactChrome
                              ? "mt-0.5"
                              : "mt-1",
                        )}
                        data-testid={`admin-entity-mobile-card-title-open--${entitySlug}--${row.id}`}
                        onClick={() => onMobileCardOpenRow(row.original)}
                        {...(hideTitleFieldLabel && titleField
                          ? { "aria-label": titleField.label }
                          : {})}
                      >
                        {flexRender(
                          titleCell.column.columnDef.cell,
                          titleCell.getContext(),
                        )}
                      </button>
                    </div>
                    <div className="flex shrink-0 items-start gap-1 sm:gap-1.5">
                      {actionsCell ? (
                        <div
                          data-testid={`admin-entity-mobile-card-actions--${entitySlug}--${row.id}`}
                        >
                          {flexRender(
                            actionsCell.column.columnDef.cell,
                            actionsCell.getContext(),
                          )}
                        </div>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size={compactChrome ? "sm" : "default"}
                        className={cn(
                          "shrink-0 self-start",
                          compactChrome
                            ? "h-7 min-h-7 px-2 text-[0.6875rem] leading-none"
                            : "h-8 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm",
                        )}
                        data-testid={`admin-entity-mobile-card-open--${entitySlug}--${row.id}`}
                        onClick={() => onMobileCardOpenRow(row.original)}
                      >
                        Open
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {hideTitleFieldLabel ? null : (
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {titleField.label}
                        </p>
                      )}
                      {typeof onMobileCardOpenRow === "function" ? (
                        <button
                          type="button"
                          className={cn(
                            "block min-w-0 w-full text-left font-semibold text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                            compactChrome ? "text-sm leading-tight" : "text-base leading-snug",
                            hideTitleFieldLabel
                              ? null
                              : compactChrome
                                ? "mt-0.5"
                                : "mt-1",
                          )}
                          data-testid={`admin-entity-mobile-card-title-open--${entitySlug}--${row.id}`}
                          onClick={() => onMobileCardOpenRow(row.original)}
                          aria-label={
                            hideTitleFieldLabel && titleField
                              ? `Open ${titleField.label}`
                              : undefined
                          }
                        >
                          {flexRender(
                            titleCell.column.columnDef.cell,
                            titleCell.getContext(),
                          )}
                        </button>
                      ) : (
                        <div
                          className={cn(
                            "font-semibold text-foreground",
                            compactChrome ? "leading-tight" : "leading-snug",
                            hideTitleFieldLabel
                              ? null
                              : compactChrome
                                ? "mt-0.5"
                                : "mt-1",
                            compactChrome ? "text-sm" : "text-base",
                          )}
                          {...(hideTitleFieldLabel && titleField
                            ? { "aria-label": titleField.label }
                            : {})}
                        >
                          {flexRender(
                            titleCell.column.columnDef.cell,
                            titleCell.getContext(),
                          )}
                        </div>
                      )}
                    </div>
                    {actionsCell ? (
                      <div
                        className="shrink-0 self-start"
                        data-testid={`admin-entity-mobile-card-actions--${entitySlug}--${row.id}`}
                      >
                        {flexRender(
                          actionsCell.column.columnDef.cell,
                          actionsCell.getContext(),
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}

            {useGroups && groups ? (
              <div
                className={cn(
                  "flex min-w-0 flex-col",
                  titleField ? (compactChrome ? "mt-2" : "mt-3") : null,
                  compactChrome ? "gap-2" : "gap-4",
                )}
                data-testid={`admin-entity-mobile-card-groups--${entitySlug}--${row.id}`}
              >
                {groups.map((group, gi) => {
                  if (
                    group.layout === "collectionSummary" &&
                    group.mobileCollectionSummary != null
                  ) {
                    const { crField, dateField, uncollectedText } =
                      group.mobileCollectionSummary
                    const crRaw = row.original[crField.columnKey]
                    const dateRaw = row.original[dateField.columnKey]
                    const collected =
                      !adminMobileCardRawValueIsEmpty(crRaw) ||
                      !adminMobileCardRawValueIsEmpty(dateRaw)
                    return (
                      <section
                        key={`g-${gi}-${group.heading ?? "collection"}`}
                        className="min-w-0"
                        data-testid={`admin-entity-mobile-card-group--${entitySlug}--${row.id}--${gi}`}
                      >
                        {group.heading ? (
                          <h3
                            className={cn(
                              "border-b border-border/50 font-medium text-muted-foreground",
                              compactChrome
                                ? "mb-1.5 pb-0.5 text-[0.65rem] uppercase tracking-wide"
                                : "mb-2.5 pb-1.5 text-xs uppercase tracking-wide",
                            )}
                          >
                            {group.heading}
                          </h3>
                        ) : null}
                        {collected ? (
                          <dl
                            className={cn(
                              "grid gap-x-3 text-sm",
                              compactChrome ? "gap-y-1" : "gap-y-2",
                              group.heading ? "mt-0" : null,
                            )}
                          >
                            {[crField, dateField].map((f) => {
                              const cell = cellForColumn(row, f.columnKey)
                              if (!cell) return null
                              return (
                                <div
                                  key={f.columnKey}
                                  className={cn(
                                    "grid grid-cols-[minmax(0,7.5rem)_1fr] items-start",
                                    compactChrome ? "gap-1.5" : "gap-2",
                                  )}
                                  data-testid={`admin-entity-mobile-card-row--${entitySlug}--${row.id}--${f.columnKey}`}
                                >
                                  {f.hideLabel ? null : (
                                    <dt
                                      className={cn(
                                        "wrap-break-word text-muted-foreground",
                                        compactChrome &&
                                          "text-xs leading-tight",
                                        mobileCardLabelAlignClass(f),
                                      )}
                                    >
                                      {f.label}
                                    </dt>
                                  )}
                                  <dd
                                    className={cn(
                                      "min-w-0",
                                      compactChrome
                                        ? "text-xs leading-tight"
                                        : "text-sm",
                                      mobileCardRowsDdClass(f),
                                    )}
                                    {...(f.hideLabel
                                      ? { "aria-label": f.label }
                                      : {})}
                                  >
                                    {flexRender(
                                      cell.column.columnDef.cell,
                                      cell.getContext(),
                                    )}
                                  </dd>
                                </div>
                              )
                            })}
                          </dl>
                        ) : (
                          <p
                            className={cn(
                              "text-muted-foreground",
                              compactChrome
                                ? "text-xs leading-tight"
                                : "text-sm",
                            )}
                            data-testid={`admin-entity-mobile-card-collection-uncollected--${entitySlug}--${row.id}`}
                          >
                            {uncollectedText}
                          </p>
                        )}
                      </section>
                    )
                  }

                  const visibleFields = group.fields.filter(
                    (f) => !shouldOmitMobileCardField(row, f),
                  )
                  if (visibleFields.length === 0 && !group.mobileQtyUnitLine) {
                    return null
                  }

                  const qtyUnit = group.mobileQtyUnitLine
                  const lineToggleKeys = group.mobileLineTotalsToggleAmountKeys
                  const lineTotalsMode = lineTotalsByRowId[row.id] === true

                  return (
                    <section
                      key={`g-${gi}-${group.heading ?? gi}`}
                      className="min-w-0"
                      data-testid={`admin-entity-mobile-card-group--${entitySlug}--${row.id}--${gi}`}
                    >
                      {group.heading ? (
                        <h3
                          className={cn(
                            "border-b border-border/50 font-medium text-muted-foreground",
                            compactChrome
                              ? "mb-1.5 pb-0.5 text-[0.65rem] uppercase tracking-wide"
                              : "mb-2.5 pb-1.5 text-xs uppercase tracking-wide",
                          )}
                        >
                          {group.heading}
                        </h3>
                      ) : null}
                      {group.layout === "grid2" ? (
                        <dl
                          className={cn(
                            "grid grid-cols-2 text-sm",
                            compactChrome
                              ? "gap-x-2 gap-y-1.5"
                              : "gap-x-3 gap-y-2.5",
                          )}
                        >
                          {visibleFields.map((f) => {
                            const cell = cellForColumn(row, f.columnKey)
                            if (!cell) return null
                            return (
                              <div
                                key={f.columnKey}
                                className="min-w-0"
                                data-testid={`admin-entity-mobile-card-row--${entitySlug}--${row.id}--${f.columnKey}`}
                              >
                                {f.hideLabel ? null : (
                                  <dt
                                    className={cn(
                                      "text-muted-foreground",
                                      compactChrome
                                        ? "text-[0.65rem] font-medium uppercase tracking-wide"
                                        : "text-xs font-medium uppercase tracking-wide",
                                      mobileCardLabelAlignClass(f),
                                    )}
                                  >
                                    {f.label}
                                  </dt>
                                )}
                                <dd
                                  className={cn(
                                    f.hideLabel ? null : "mt-0.5",
                                    compactChrome
                                      ? "text-xs leading-tight"
                                      : "text-sm",
                                    mobileCardDdClass(f, "grid2"),
                                  )}
                                  {...(f.hideLabel
                                    ? { "aria-label": f.label }
                                    : {})}
                                >
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext(),
                                  )}
                                </dd>
                              </div>
                            )
                          })}
                        </dl>
                      ) : (
                        <>
                          {lineToggleKeys != null &&
                          lineToggleKeys.length > 0 &&
                          qtyUnit != null ? (
                            <div
                              className={cn(
                                "flex items-center justify-end border-b border-border/40",
                                compactChrome
                                  ? "mb-1.5 gap-1.5 pb-1.5"
                                  : "mb-2 gap-2 pb-2",
                              )}
                              data-testid={`admin-entity-mobile-card-line-totals-switch-wrap--${entitySlug}--${row.id}`}
                            >
                              <span
                                className={cn(
                                  "text-muted-foreground",
                                  compactChrome
                                    ? "text-[0.65rem]"
                                    : "text-xs",
                                )}
                              >
                                Unit
                              </span>
                              <ClientOnly
                                fallback={
                                  <span
                                    aria-hidden
                                    className={cn(
                                      "inline-block shrink-0 rounded-full bg-muted/40",
                                      compactChrome
                                        ? "h-[14px] w-[24px]"
                                        : "h-[18.4px] w-[32px]",
                                    )}
                                  />
                                }
                              >
                                <Switch
                                  size={compactChrome ? "sm" : "default"}
                                  checked={lineTotalsMode}
                                  onCheckedChange={(c) =>
                                    setLineTotalsByRowId((prev) => ({
                                      ...prev,
                                      [row.id]: c === true,
                                    }))
                                  }
                                  aria-label="Switch between unit prices and line totals"
                                  data-testid={`admin-entity-mobile-card-line-totals-switch--${entitySlug}--${row.id}`}
                                />
                              </ClientOnly>
                              <span
                                className={cn(
                                  "text-muted-foreground",
                                  compactChrome
                                    ? "text-[0.65rem]"
                                    : "text-xs",
                                )}
                              >
                                Line
                              </span>
                            </div>
                          ) : null}
                          {qtyUnit != null ? (
                            <div
                              className={cn(
                                "text-right font-medium tabular-nums text-foreground",
                                compactChrome
                                  ? "mb-1 text-xs leading-tight"
                                  : "mb-2 text-sm",
                              )}
                              data-testid={`admin-entity-mobile-card-qty-unit--${entitySlug}--${row.id}`}
                            >
                              {formatMobileQtyUnitLine(
                                row.original,
                                qtyUnit.qtyKey,
                                qtyUnit.unitKey,
                                qtyUnit.unitFromRelatedEmbed,
                              )}
                            </div>
                          ) : null}
                          <dl
                            className={cn(
                              "grid gap-x-3 text-sm",
                              compactChrome ? "gap-y-1" : "gap-y-2",
                              group.heading ? "mt-0" : null,
                            )}
                          >
                            {visibleFields.map((f) => {
                              const cell = cellForColumn(row, f.columnKey)
                              if (!cell) return null
                              const showLineTotal =
                                lineTotalsMode === true &&
                                lineToggleKeys != null &&
                                lineToggleKeys.includes(f.columnKey) &&
                                f.currencySymbol != null &&
                                qtyUnit != null
                              const stackedLabel =
                                f.labelStackedAbove === true && !f.hideLabel
                              return (
                                <div
                                  key={f.columnKey}
                                  className={
                                    f.hideLabel
                                      ? "min-w-0"
                                      : stackedLabel
                                        ? "min-w-0"
                                        : cn(
                                            "grid grid-cols-[minmax(0,7.5rem)_1fr] items-start",
                                            compactChrome ? "gap-1.5" : "gap-2",
                                          )
                                  }
                                  data-testid={`admin-entity-mobile-card-row--${entitySlug}--${row.id}--${f.columnKey}`}
                                >
                                  {f.hideLabel ? null : stackedLabel ? (
                                    <dt
                                      className={cn(
                                        "text-muted-foreground",
                                        compactChrome
                                          ? "text-[0.65rem] font-medium uppercase tracking-wide"
                                          : "text-xs font-medium uppercase tracking-wide",
                                      )}
                                    >
                                      {f.label}
                                    </dt>
                                  ) : (
                                    <dt
                                      className={cn(
                                        "wrap-break-word text-muted-foreground",
                                        compactChrome &&
                                          "text-xs leading-tight",
                                        mobileCardLabelAlignClass(f),
                                      )}
                                    >
                                      {f.label}
                                    </dt>
                                  )}
                                  <dd
                                    className={cn(
                                      "min-w-0",
                                      stackedLabel && !f.hideLabel
                                        ? compactChrome
                                          ? "mt-0.5 text-xs leading-tight"
                                          : "mt-0.5 text-sm"
                                        : compactChrome
                                          ? "text-xs leading-tight"
                                          : "text-sm",
                                      mobileCardRowsDdClass(f),
                                    )}
                                    {...(f.hideLabel
                                      ? { "aria-label": f.label }
                                      : {})}
                                    {...(showLineTotal
                                      ? {
                                          "data-testid": `admin-entity-mobile-card-line-total-amount--${entitySlug}--${row.id}--${f.columnKey}`,
                                        }
                                      : {})}
                                  >
                                    {showLineTotal
                                      ? lineTotalAmountDisplay(
                                          row.original,
                                          f,
                                          qtyUnit.qtyKey,
                                        )
                                      : flexRender(
                                          cell.column.columnDef.cell,
                                          cell.getContext(),
                                        )}
                                  </dd>
                                </div>
                              )
                            })}
                          </dl>
                        </>
                      )}
                    </section>
                  )
                })}
              </div>
            ) : visibleDetailFields.length > 0 ? (
              <dl
                className={cn(
                  "grid gap-x-3 text-sm",
                  compactChrome ? "gap-y-1" : "gap-y-2",
                  titleField ? (compactChrome ? "mt-2" : "mt-3") : null,
                )}
              >
                {visibleDetailFields.map((f) => {
                  const cell = cellForColumn(row, f.columnKey)
                  if (!cell) return null
                  const stackedLabel =
                    f.labelStackedAbove === true && !f.hideLabel
                  return (
                    <div
                      key={f.columnKey}
                      className={
                        f.hideLabel
                          ? "min-w-0"
                          : stackedLabel
                            ? "min-w-0"
                            : cn(
                                "grid grid-cols-[minmax(0,7.5rem)_1fr] items-start",
                                compactChrome ? "gap-1.5" : "gap-2",
                              )
                      }
                      data-testid={`admin-entity-mobile-card-row--${entitySlug}--${row.id}--${f.columnKey}`}
                    >
                      {f.hideLabel ? null : stackedLabel ? (
                        <dt
                          className={cn(
                            "text-muted-foreground",
                            compactChrome
                              ? "text-[0.65rem] font-medium uppercase tracking-wide"
                              : "text-xs font-medium uppercase tracking-wide",
                            mobileCardLabelAlignClass(f),
                          )}
                        >
                          {f.label}
                        </dt>
                      ) : (
                        <dt
                          className={cn(
                            "wrap-break-word text-muted-foreground",
                            compactChrome && "text-xs leading-tight",
                            mobileCardLabelAlignClass(f),
                          )}
                        >
                          {f.label}
                        </dt>
                      )}
                      <dd
                        className={cn(
                          "min-w-0",
                          stackedLabel && !f.hideLabel
                            ? compactChrome
                              ? "mt-0.5 text-xs leading-tight"
                              : "mt-0.5 text-sm"
                            : compactChrome
                              ? "text-xs leading-tight"
                              : "text-sm",
                          mobileCardDdClass(f, "flat"),
                        )}
                        {...(f.hideLabel ? { "aria-label": f.label } : {})}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </dd>
                    </div>
                  )
                })}
              </dl>
            ) : null}

            {actionsCell && !actionsInTitleRow ? (
              <div
                className={cn(
                  "flex justify-end border-t border-border/60",
                  compactChrome ? "pt-2" : "pt-3",
                  (titleField ||
                    detailFields.length > 0 ||
                    (useGroups && (groups?.length ?? 0) > 0)) &&
                    (compactChrome ? "mt-2" : "mt-3"),
                )}
                data-testid={`admin-entity-mobile-card-actions--${entitySlug}--${row.id}`}
              >
                {flexRender(
                  actionsCell.column.columnDef.cell,
                  actionsCell.getContext(),
                )}
              </div>
            ) : null}
          </article>
        )
      })}
    </div>
    </AdminListRowRenderModeProvider>
  )
}
