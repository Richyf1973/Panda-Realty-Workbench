import type { CSSProperties } from "react"

import {
  evalRelatedVirtualProduct,
  type AdminRelatedRelationNumericMaps,
} from "./admin-entity-crud-related-virtual"
import type { LineRow } from "./admin-entity-crud-related-collections-draft"
import { adminEntityListRelationUsesCrudAsyncSearch } from "./admin-entity-list-relation-crud-async"
import {
  formatAdminEntityNumericListCell,
} from "./admin-entity-list-numeric-format"
import {
  adminEntityColumnTreatsAsBoolean,
  resolveAdminEntityCellAlign,
} from "./admin-entity-list-cell"
import type {
  AdminCellAlign,
  AdminEntityColumn,
  AdminEntityCrudRelatedCollectionTable,
  AdminEntityCrudRelatedEmbedPreviewColumn,
  AdminEntityCrudRelatedVirtualColumn,
  AdminEntityCrudRelatedVirtualColumnFactor,
  AdminEntityDefinition,
} from "./admin-entity-types"
export function defaultTabValueFromJsonKey(jsonKey: string): string {
  return jsonKey
    .replace(/([A-Z])/g, "-$1")
    .toLowerCase()
    .replace(/^-/, "")
}

export function relatedInlineDateStringCalendarRequired(
  col: AdminEntityColumn,
  variant: "create" | "edit",
): boolean {
  if (variant === "create") return !col.optionalOnCreate
  if (col.crudEditReadOnly === true) return false
  return !col.patchEmptyClears
}

export function formatRelatedCollectionFooterSum(
  columnKey: string,
  total: number,
  childCfg: AdminEntityDefinition,
): string {
  const col = childCfg.columns.find((c) => c.key === columnKey)
  if (!col) {
    return formatAdminEntityNumericListCell(String(total))
  }
  if (col.valueType === "integer") {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
      useGrouping: true,
    }).format(Math.round(total))
  }
  return formatAdminEntityNumericListCell(String(total), {
    currencySymbol: col.currencySymbol,
    allowLeadingMinus: col.currencyAmountAllowLeadingMinus === true,
  })
}

export function formatRelatedCollectionFooterSumVirtual(
  total: number,
  currencySymbol?: string,
): string {
  return formatAdminEntityNumericListCell(String(total), {
    currencySymbol: currencySymbol?.trim() || undefined,
  })
}

export function parseRelatedEmbedPreviewNumericField(
  line: LineRow,
  ec: AdminEntityCrudRelatedEmbedPreviewColumn,
): number | null {
  const raw = line[ec.embedJsonKey]
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return null
  }
  const fieldVal = (raw as Record<string, unknown>)[ec.field]
  const s =
    typeof fieldVal === "string"
      ? fieldVal.trim()
      : String(fieldVal ?? "").trim()
  if (s === "") return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export function formatRelatedCollectionFooterSumEmbed(
  adminEntities: Readonly<Record<string, AdminEntityDefinition>>,
  ec: AdminEntityCrudRelatedEmbedPreviewColumn,
  total: number,
): string {
  const fmtCol = adminEntityColumnForRelatedEmbedPreview(adminEntities, ec)
  if (fmtCol?.valueType === "integer") {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
      useGrouping: true,
    }).format(Math.round(total))
  }
  return formatAdminEntityNumericListCell(String(total), {
    currencySymbol: fmtCol?.currencySymbol,
    allowLeadingMinus: fmtCol?.currencyAmountAllowLeadingMinus === true,
  })
}
export function relatedInlineDisplayAmountsEqualCents(a: number, b: number): boolean {
  return Math.round(a * 100) === Math.round(b * 100)
}

export function relatedInlineRegistryNumericCompareDisplay(
  vc: AdminEntityCrudRelatedVirtualColumn,
  computed: number | null,
  line: LineRow,
): { className: string; dataVsLine: "match" | "mismatch" | "neutral" } {
  if (vc.kind !== "registryInlineNumeric") {
    return { className: "", dataVsLine: "neutral" }
  }
  const colKey = vc.compareComputedNumericToLineColumnKey
  if (colKey == null || colKey === "") {
    return { className: "", dataVsLine: "neutral" }
  }
  if (computed == null || !Number.isFinite(computed)) {
    return { className: "", dataVsLine: "neutral" }
  }
  const raw = line[colKey]
  const s =
    typeof raw === "string"
      ? raw.trim()
      : String(raw ?? "").trim()
  if (s === "") {
    return { className: "", dataVsLine: "neutral" }
  }
  const other = Number(s)
  if (!Number.isFinite(other)) {
    return { className: "", dataVsLine: "neutral" }
  }
  const match = relatedInlineDisplayAmountsEqualCents(computed, other)
  return {
    className: match
      ? (vc.compareMatchClassName ?? "text-green-600 dark:text-green-400")
      : (vc.compareMismatchClassName ?? "text-red-600 dark:text-red-400"),
    dataVsLine: match ? "match" : "mismatch",
  }
}

export function relatedVirtualFactors(
  virtuals: readonly AdminEntityCrudRelatedVirtualColumn[],
): AdminEntityCrudRelatedVirtualColumnFactor[] {
  const out: AdminEntityCrudRelatedVirtualColumnFactor[] = []
  for (const vc of virtuals) {
    if (vc.kind !== "product") continue
    out.push(vc.factorLeft, vc.factorRight)
  }
  return out
}

export function evalRelatedInlineVirtualNumeric(
  vc: AdminEntityCrudRelatedVirtualColumn,
  line: LineRow,
  relationNumericMaps: AdminRelatedRelationNumericMaps,
  detailPayload: Record<string, unknown> | undefined,
  registryEval?: (registryKey: string, line: LineRow) => number | null,
): number | null {
  if (vc.kind === "product") {
    return evalRelatedVirtualProduct(
      vc,
      line,
      relationNumericMaps,
      detailPayload,
    )
  }
  if (vc.kind === "registryInlineNumeric") {
    const n = registryEval?.(vc.registryKey, line)
    return n != null && Number.isFinite(n) ? n : null
  }
  return null
}

/** Stable fallbacks so effect/memo deps do not churn when collection omits optional arrays. */
export const EMPTY_INLINE_READONLY_KEYS: readonly string[] = []
export const EMPTY_INLINE_VIRTUAL_COLUMNS: readonly AdminEntityCrudRelatedVirtualColumn[] = []
export const EMPTY_FOOTER_SUM_KEYS: readonly string[] = []

export type RelatedInlineTableColumnSpec =
  | { kind: "editable"; key: string }
  | {
      kind: "virtual"
      key: string
      vc: AdminEntityCrudRelatedVirtualColumn
    }
  | { kind: "readonly"; key: string }
  | {
      kind: "embed"
      key: string
      ec: AdminEntityCrudRelatedEmbedPreviewColumn
    }

export function defaultRelatedInlineTableColumnSpecs(
  editable: readonly string[],
  virtuals: readonly AdminEntityCrudRelatedVirtualColumn[],
  readonlyKeys: readonly string[],
  embedColumns: readonly AdminEntityCrudRelatedEmbedPreviewColumn[],
): RelatedInlineTableColumnSpec[] {
  return [
    ...editable.map((key) => ({ kind: "editable" as const, key })),
    ...virtuals.map((vc) => ({
      kind: "virtual" as const,
      key: vc.key,
      vc,
    })),
    ...readonlyKeys.map((key) => ({ kind: "readonly" as const, key })),
    ...embedColumns.map((ec) => ({
      kind: "embed" as const,
      key: ec.key,
      ec,
    })),
  ]
}

/** Apply `inlineTableColumnOrder`: listed keys first (stable for unlisted tail). */
export function orderRelatedInlineTableColumnSpecs(
  defaultSpecs: RelatedInlineTableColumnSpec[],
  explicit: readonly string[] | undefined,
): RelatedInlineTableColumnSpec[] {
  if (explicit == null || explicit.length === 0) return defaultSpecs
  const idx = new Map(explicit.map((k, i) => [k, i]))
  return [...defaultSpecs].sort((a, b) => {
    const ia = idx.get(a.key)
    const ib = idx.get(b.key)
    if (ia !== undefined && ib !== undefined) return ia - ib
    if (ia !== undefined) return -1
    if (ib !== undefined) return 1
    return defaultSpecs.indexOf(a) - defaultSpecs.indexOf(b)
  })
}

/** Fits formatted PHP amounts like `₱ 999,999.99` in inline table cells without clipping. */
export const RELATED_INLINE_MIN_WIDTH_PX_CURRENCY = 148
export const RELATED_INLINE_MIN_WIDTH_PX_PLAIN_NUMERIC = 80
export const RELATED_INLINE_MIN_WIDTH_PX_ASYNC_RELATION = 168
export const RELATED_INLINE_MIN_WIDTH_PX_RELATION_SELECT = 140
export const RELATED_INLINE_MIN_WIDTH_PX_EMBED_INPUT = 168
export const RELATED_INLINE_MIN_WIDTH_PX_EMBED_TEXT = 120

export function adminEntityColumnForRelatedEmbedPreview(
  adminEntities: Readonly<Record<string, AdminEntityDefinition>>,
  ec: AdminEntityCrudRelatedEmbedPreviewColumn,
): AdminEntityColumn | undefined {
  const lf = ec.listFormatFrom
  if (lf == null) return undefined
  const relCfg = adminEntities[lf.entitySlug] as AdminEntityDefinition | undefined
  return relCfg?.columns.find((c) => c.key === lf.columnKey) as
    | AdminEntityColumn
    | undefined
}

export function relatedEmbedPreviewCellAlign(
  adminEntities: Readonly<Record<string, AdminEntityDefinition>>,
  ec: AdminEntityCrudRelatedEmbedPreviewColumn,
): AdminCellAlign {
  if (ec.cellAlign != null) return ec.cellAlign
  const fmtCol = adminEntityColumnForRelatedEmbedPreview(adminEntities, ec)
  if (fmtCol?.cellAlign != null) return fmtCol.cellAlign
  if (fmtCol?.valueType === "numeric" || fmtCol?.valueType === "integer") {
    return "right"
  }
  return "left"
}

/**
 * Sticky actions column width is **`--related-inline-actions-col`** (set on the table wrapper). Width is
 * derived from icon-slot counts via {@link computeRelatedInlineActionsColumnCalc}.
 */
export const RELATED_INLINE_STICKY_ACTIONS_DIM_CLASS =
  "w-[var(--related-inline-actions-col)] min-w-[var(--related-inline-actions-col)] max-w-[var(--related-inline-actions-col)]" as const

export const RELATED_INLINE_STICKY_BEFORE_ACTIONS_RIGHT_CLASS =
  "right-[var(--related-inline-actions-col)]" as const

/** Solid strip slightly left of the cell masks characters bleeding through the sticky seam. */
export const RELATED_INLINE_STICKY_ACTIONS_MASK_MUTED =
  "[box-shadow:inset_1px_0_0_0_var(--border),-3px_0_0_0_var(--muted)]" as const
export const RELATED_INLINE_STICKY_ACTIONS_MASK_CARD =
  "[box-shadow:inset_1px_0_0_0_var(--border),-3px_0_0_0_var(--card)]" as const

export type RelatedInlineCellColumnMeta = {
  relatedStickyEnd?: boolean
  relatedStickyStart?: boolean
  relatedStickyActions?: boolean
  relatedMinWidthPx?: number
  relatedMaxWidthPx?: number
  /** Matches {@link EntityDataTable} / body cell alignment for this column. */
  cellAlign?: AdminCellAlign
}

/**
 * Horizontal alignment for related-inline **editable** columns — matches the control rendered in
 * cells (e.g. integer text inputs are right-aligned; integer **select** controls stay left).
 */
export function resolveRelatedInlineEditableColumnAlign(
  col: AdminEntityColumn | undefined,
): AdminCellAlign {
  if (!col) return "left"
  if (adminEntityColumnTreatsAsBoolean(col)) return "center"
  if (col.valueType === "numeric") return "right"
  if (col.valueType === "integer" && !col.listRelation) {
    const intOpts = col.integerFormOptions
    if (
      intOpts != null &&
      intOpts.length > 0 &&
      col.integerInputAllowLeadingMinus !== true
    ) {
      return "left"
    }
    return "right"
  }
  return resolveAdminEntityCellAlign(col)
}

/**
 * Horizontal alignment for related-inline **readonly** columns — matches formatted numeric spans
 * and badge bands (uses entity `cellAlign` when badges apply).
 */
export function resolveRelatedInlineReadonlyColumnAlign(
  col: AdminEntityColumn | undefined,
): AdminCellAlign {
  if (!col) return "left"
  if (col.listIntegerBadgeBands && col.valueType === "integer") {
    return resolveAdminEntityCellAlign(col)
  }
  if (col.valueType === "numeric" || col.valueType === "integer") {
    return "right"
  }
  return resolveAdminEntityCellAlign(col)
}

export function relatedInlineCellMetaToStyle(
  m: RelatedInlineCellColumnMeta | undefined,
): CSSProperties | undefined {
  const min = m?.relatedMinWidthPx
  const max = m?.relatedMaxWidthPx
  if (min == null && max == null) return undefined
  return {
    ...(min != null ? { minWidth: min } : {}),
    ...(max != null ? { maxWidth: max } : {}),
  }
}

export function defaultRelatedEditableMinWidthPx(
  col: AdminEntityColumn | undefined,
): number | undefined {
  if (!col) return undefined
  if (col.valueType === "numeric" && col.currencySymbol) {
    return RELATED_INLINE_MIN_WIDTH_PX_CURRENCY
  }
  if (col.valueType === "numeric") {
    return RELATED_INLINE_MIN_WIDTH_PX_PLAIN_NUMERIC
  }
  if (col.valueType === "integer" && !col.listRelation) {
    return RELATED_INLINE_MIN_WIDTH_PX_PLAIN_NUMERIC
  }
  if (col.listRelation && adminEntityListRelationUsesCrudAsyncSearch(col)) {
    return RELATED_INLINE_MIN_WIDTH_PX_ASYNC_RELATION
  }
  if (col.listRelation) {
    return RELATED_INLINE_MIN_WIDTH_PX_RELATION_SELECT
  }
  return undefined
}

export function relatedInlineMaxWidthPxForSpec(
  collection: AdminEntityCrudRelatedCollectionTable,
  spec: RelatedInlineTableColumnSpec,
): number | undefined {
  const o = collection.inlineColumnMaxWidthsPx
  if (o == null) return undefined
  switch (spec.kind) {
    case "editable":
      return o[spec.key]
    case "virtual":
      return o[spec.vc.key]
    case "readonly":
      return o[spec.key]
    case "embed":
      return o[spec.ec.key]
  }
}

export function relatedInlineColumnBoundsStyleForSpec(
  collection: AdminEntityCrudRelatedCollectionTable,
  childCfg: AdminEntityDefinition,
  spec: RelatedInlineTableColumnSpec,
  adminEntities: Readonly<Record<string, AdminEntityDefinition>>,
): CSSProperties | undefined {
  const minW = relatedInlineMinWidthPxForSpec(
    collection,
    childCfg,
    spec,
    adminEntities,
  )
  const maxW = relatedInlineMaxWidthPxForSpec(collection, spec)
  if (minW == null && maxW == null) return undefined
  return {
    ...(minW != null ? { minWidth: minW } : {}),
    ...(maxW != null ? { maxWidth: maxW } : {}),
  }
}

export function relatedInlineMinWidthPxForSpec(
  collection: AdminEntityCrudRelatedCollectionTable,
  childCfg: AdminEntityDefinition,
  spec: RelatedInlineTableColumnSpec,
  adminEntities: Readonly<Record<string, AdminEntityDefinition>>,
): number | undefined {
  const o = collection.inlineColumnMinWidthsPx
  switch (spec.kind) {
    case "editable": {
      if (o?.[spec.key] != null) return o[spec.key]
      const col = childCfg.columns.find((c) => c.key === spec.key)
      return defaultRelatedEditableMinWidthPx(col)
    }
    case "virtual": {
      if (o?.[spec.vc.key] != null) return o[spec.vc.key]
      if (spec.vc.currencySymbol?.trim()) {
        return RELATED_INLINE_MIN_WIDTH_PX_CURRENCY
      }
      return undefined
    }
    case "readonly": {
      if (o?.[spec.key] != null) return o[spec.key]
      const col = childCfg.columns.find((c) => c.key === spec.key)
      if (col?.valueType === "numeric" && col.currencySymbol) {
        return RELATED_INLINE_MIN_WIDTH_PX_CURRENCY
      }
      if (col?.valueType === "numeric" || col?.valueType === "integer") {
        return RELATED_INLINE_MIN_WIDTH_PX_PLAIN_NUMERIC
      }
      return undefined
    }
    case "embed": {
      if (o?.[spec.ec.key] != null) return o[spec.ec.key]
      const fmtCol = adminEntityColumnForRelatedEmbedPreview(
        adminEntities,
        spec.ec,
      )
      if (fmtCol?.valueType === "numeric" && fmtCol.currencySymbol) {
        return RELATED_INLINE_MIN_WIDTH_PX_CURRENCY
      }
      if (fmtCol?.valueType === "numeric" || fmtCol?.valueType === "integer") {
        return RELATED_INLINE_MIN_WIDTH_PX_PLAIN_NUMERIC
      }
      if (spec.ec.displayAsDisabledInput === true) {
        return RELATED_INLINE_MIN_WIDTH_PX_EMBED_INPUT
      }
      return RELATED_INLINE_MIN_WIDTH_PX_EMBED_TEXT
    }
  }
}

/** Default **true**: inline grid on parent create; opt out with `inlineTableOnCreate: false`. */
export function adminEntityRelatedInlineTableOnCreate(
  collection: AdminEntityCrudRelatedCollectionTable,
): boolean {
  return collection.inlineTableOnCreate !== false
}

export function escapeDataTestIdForAttributeSelector(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value)
  }
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

export function relatedInlineRowDataTestId(args: {
  parentSlug: string
  collectionJsonKey: string
  line: LineRow
  idKey: string
}): string {
  const savedId = args.line[args.idKey]
  const isSaved =
    typeof savedId === "number"
      ? Number.isFinite(savedId)
      : typeof savedId === "string" && /^\d+$/.test(String(savedId).trim())
  return isSaved
    ? `admin-entity-crud-related-row--${args.parentSlug}--${args.collectionJsonKey}--saved--${String(savedId)}`
    : `admin-entity-crud-related-row--${args.parentSlug}--${args.collectionJsonKey}--draft--${String(args.line.clientKey)}`
}

/**
 * After `GET …/:id` embed hydration, `setLines` re-renders the row; the focused control (e.g. Qty) can
 * lose focus. Only restore when focus was already inside a row we are patching.
 */
export function relatedInlineRowMatchesEmbedPatch(
  rowTestId: string,
  patchedClientKeys: ReadonlySet<string>,
  linesSnapshot: LineRow[],
  entityIdColumnKey: string,
  parentSlug: string,
  collectionJsonKey: string,
): boolean {
  const prefix = `admin-entity-crud-related-row--${parentSlug}--${collectionJsonKey}--`
  if (!rowTestId.startsWith(prefix)) return false
  const rest = rowTestId.slice(prefix.length)
  const draft = /^draft--(.+)$/.exec(rest)
  if (draft) return patchedClientKeys.has(draft[1]!)
  const saved = /^saved--(.+)$/.exec(rest)
  if (saved) {
    const sid = saved[1]!
    for (const l of linesSnapshot) {
      if (String(l[entityIdColumnKey] ?? "").trim() !== sid) continue
      return patchedClientKeys.has(l.clientKey)
    }
  }
  return false
}

export type RelatedInlineEmbedFocusRestoreHint = {
  rowTestId: string
  ariaLabel: string | null
  dataTestId: string | null
}

export function scheduleRelatedInlineFocusRestoreAfterEmbed(
  hint: RelatedInlineEmbedFocusRestoreHint,
): void {
  let restored = false
  const tryOnce = () => {
    if (restored) return
    const row = document.querySelector(
      `[data-testid="${escapeDataTestIdForAttributeSelector(hint.rowTestId)}"]`,
    )
    if (!(row instanceof HTMLElement)) return
    let candidate: HTMLElement | null = null
    if (hint.dataTestId) {
      const inner = row.querySelector(
        `[data-testid="${escapeDataTestIdForAttributeSelector(hint.dataTestId)}"]`,
      )
      if (inner instanceof HTMLElement) candidate = inner
    }
    if (candidate == null && hint.ariaLabel) {
      const labelled = row.querySelectorAll<HTMLElement>("[aria-label]")
      for (const el of labelled) {
        if (el.getAttribute("aria-label") === hint.ariaLabel) {
          candidate = el
          break
        }
      }
    }
    if (candidate == null || !candidate.isConnected) return
    if (candidate.hasAttribute("disabled")) return
    const active = document.activeElement
    if (
      active instanceof HTMLElement &&
      (active === candidate || candidate.contains(active))
    ) {
      restored = true
      return
    }
    try {
      candidate.focus({ preventScroll: true })
    } catch {
      candidate.focus()
    }
    const focusedNow = document.activeElement
    if (
      focusedNow instanceof HTMLElement &&
      (focusedNow === candidate || candidate.contains(focusedNow))
    ) {
      restored = true
    }
  }
  queueMicrotask(tryOnce)
  window.requestAnimationFrame(() => {
    tryOnce()
    window.requestAnimationFrame(() => {
      tryOnce()
      window.requestAnimationFrame(tryOnce)
    })
  })
  /** React commit can lag the fetch `.then`; retry briefly so Qty regains focus after row repaint. */
  for (const ms of [0, 32, 96, 200, 400]) {
    window.setTimeout(tryOnce, ms)
  }
}
