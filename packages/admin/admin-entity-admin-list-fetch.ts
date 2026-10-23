import { parseAdminEntityBooleanListFilterFromCfg } from "./admin-entity-list-boolean-filter-parse"
import { parseAdminEntityManyRelationListFiltersFromCfg } from "./admin-entity-list-many-relation-filter-parse"
import { parseAdminEntityRelationListFiltersFromCfg } from "./admin-entity-list-relation-filter-parse"
import { normalizeAdminEntityYearMonthPeriodString } from "./admin-entity-list-year-month-period-parse"
import { parseAdminEntityListDateRangeFiltersFromCfg } from "./admin-entity-list-date-range-filter-parse"
import { effectiveListDateRangeFilterSpecs } from "./admin-entity-list-date-range-specs"
import { parseAdminEntityYearMonthListFilterFromCfg } from "./admin-entity-list-year-month-filter-parse"
import { relationFilterStoredValues } from "./admin-entity-relation-filter-value"
import {
  parseAdminEntityListSortParamsFromCfg,
  type PrimaryListSort,
} from "./admin-entity-list-sort-params"
import type {
  AdminEntityDefinition,
  AdminEntityListAppendWhereHintFilter,
} from "./admin-entity-types"

type EntityRegistry = Readonly<Record<string, AdminEntityDefinition>>

export type ListFetchInput =
  | { kind: "page"; page: number }
  | { kind: "cursorNext"; after: string }
  | { kind: "cursorPrev"; before: string }

export function defaultAdminEntityListPrimarySortFromCfg(
  cfg: AdminEntityDefinition,
): PrimaryListSort {
  const first = cfg.listOrderBy[0]
  if (first) {
    return { columnKey: first.columnKey, direction: first.direction }
  }
  return { columnKey: cfg.idColumn.jsonKey, direction: "asc" }
}

export function adminEntityListAppendWhereHintSpecs(
  cfg: AdminEntityDefinition,
): readonly AdminEntityListAppendWhereHintFilter[] {
  const multi = cfg.listAppendWhereHintFilters
  if (multi != null && multi.length > 0) return multi
  const single = cfg.listAppendWhereHintFilter
  return single ? [single] : []
}

export function emptyAdminEntityListAppendWhereHintSegments(
  cfg: AdminEntityDefinition,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const spec of adminEntityListAppendWhereHintSpecs(cfg)) {
    const p = spec.queryParam.trim()
    if (p !== "") out[p] = ""
  }
  return out
}

export function parseAdminEntityListAppendWhereHintSegments(
  cfg: AdminEntityDefinition,
  searchParams: URLSearchParams,
): Record<string, string> {
  const out = emptyAdminEntityListAppendWhereHintSegments(cfg)
  for (const spec of adminEntityListAppendWhereHintSpecs(cfg)) {
    const param = spec.queryParam.trim()
    if (param === "") continue
    const raw = (searchParams.get(param) ?? "").trim()
    if (raw === "") {
      out[param] = ""
      continue
    }
    if (spec.uiStyle === "numeric-range") {
      out[param] = raw // free-form "min|max"; no static options to validate against
    } else if (spec.uiStyle === "date-range") {
      out[param] = raw // free-form "YYYY-MM-DD|YYYY-MM-DD"; no static options to validate against
    } else if (spec.fetchOptionsPath) {
      out[param] = raw // options are dynamic; skip static validation
    } else if (spec.multiSelect) {
      const allowed = new Set(spec.options.map((o) => o.value))
      const valid = raw.split(",").map((s) => s.trim()).filter((s) => allowed.has(s))
      out[param] = valid.join(",")
    } else if (spec.options.length === 0) {
      out[param] = raw // free-form text; no static options to validate against
    } else {
      const allowed = new Set(spec.options.map((o) => o.value))
      out[param] = allowed.has(raw) ? raw : ""
    }
  }
  return out
}

/** Stable dependency key for React / query keys (order-independent). */
export function stableAppendWhereHintSegmentsKey(
  segments: Record<string, string>,
): string {
  const keys = Object.keys(segments).sort()
  return keys.map((k) => `${k}=${segments[k] ?? ""}`).join("|")
}

/** Stable string for comparing list query state (order-independent). */
export function stableAdminEntityListQueryString(qs: URLSearchParams): string {
  return [...qs.entries()]
    .sort(([ak, av], [bk, bv]) => {
      const c = ak.localeCompare(bk)
      return c !== 0 ? c : av.localeCompare(bv)
    })
    .map(
      ([k, v]) =>
        `${encodeURIComponent(k)}=${encodeURIComponent(v)}`,
    )
    .join("&")
}

export function buildAdminEntityListSearchParams(
  limit: number,
  input: ListFetchInput,
  options?: {
    search?: string
    /** Query param name from entity `listBooleanFilter` (default: column key). */
    booleanFilterParam?: string
    booleanFilterValue?: boolean
    /** Server-side list ordering (must match active table sort). */
    sort?: { columnKey: string; direction: "asc" | "desc" }
    /** `listYearMonthFilter` query param name + canonical `YYYY-MM` value. */
    yearMonthFilterParam?: string
    yearMonthPeriod?: string
    /**
     * Multi date-range toolbar state: keys are `listDateRangeFilter(s)[].columnKey`.
     * Requires `parentListCfg` (same entity) so param names resolve.
     */
    listDateRanges?: Record<string, { from: string; to: string }>
    /**
     * Entity whose `listRelationFilters` / `listManyRelationFilters` define which
     * query params to append (the listing entity, not the related table).
     */
    parentListCfg?: AdminEntityDefinition
    /**
     * Keys are `listRelationFilters[].columnKey` and
     * `listManyRelationFilters[].manyRelationColumnKey`; empty values are omitted.
     */
    relationFilterSelections?: Record<string, string>
    /**
     * When listing a related entity that uses `listScopeByReportingPeriodInRelated`, pass canonical
     * `YYYY-MM` so option lists match the parent reporting period.
     */
    reportingPeriodScopeParam?: string
    reportingPeriodScopeValue?: string
    /** Keys are append-where `queryParam`s; omit empty values. Overrides legacy single-param when same key. */
    appendWhereHints?: Record<string, string>
    /** From `listAppendWhereHintFilter`; omit param when `value` is empty. */
    appendWhereHintParam?: string
    appendWhereHintValue?: string
  },
): URLSearchParams {
  const qs = new URLSearchParams()
  qs.set("limit", String(limit))
  if (input.kind === "page") qs.set("page", String(input.page))
  else if (input.kind === "cursorNext") qs.set("cursorAfter", input.after)
  else qs.set("cursorBefore", input.before)
  const s = (options?.search ?? "").trim()
  if (s) qs.set("search", s)
  const bfParam = options?.booleanFilterParam
  if (bfParam && options?.booleanFilterValue !== undefined) {
    qs.set(bfParam, options.booleanFilterValue ? "true" : "false")
  }
  const sort = options?.sort
  if (sort) {
    qs.set("sortKey", sort.columnKey)
    qs.set("sortDir", sort.direction)
  }
  const ymParam = options?.yearMonthFilterParam
  const ymPeriod = (options?.yearMonthPeriod ?? "").trim()
  if (ymParam && ymPeriod !== "") {
    qs.set(ymParam, ymPeriod)
  }
  const drCfg = options?.parentListCfg
  const drState = options?.listDateRanges
  if (drCfg && drState) {
    for (const spec of effectiveListDateRangeFilterSpecs(drCfg)) {
      const v = drState[spec.columnKey]
      if (!v) continue
      const f = v.from.trim()
      const t = v.to.trim()
      if (f === "" || t === "") continue
      qs.set(spec.fromQueryParam ?? "dateFrom", f)
      qs.set(spec.toQueryParam ?? "dateTo", t)
    }
  }
  const scopeParam = options?.reportingPeriodScopeParam
  const scopeVal = (options?.reportingPeriodScopeValue ?? "").trim()
  if (scopeParam && scopeVal !== "") {
    qs.set(scopeParam, scopeVal)
  }
  const listCfg = options?.parentListCfg
  const relSel = options?.relationFilterSelections
  if (listCfg && relSel) {
    for (const spec of listCfg.listRelationFilters ?? []) {
      const param = spec.queryParam ?? spec.columnKey
      const multi = spec.multiSelect === true
      const stored = (relSel[spec.columnKey] ?? "").trim()
      if (stored === "") continue
      const parts = relationFilterStoredValues(multi, stored)
      if (parts.length === 0) continue
      if (multi) {
        for (const p of parts) {
          qs.append(param, p)
        }
      } else {
        qs.set(param, parts[0]!)
      }
    }
    for (const spec of listCfg.listManyRelationFilters ?? []) {
      const param = spec.queryParam ?? spec.manyRelationColumnKey
      const multi = spec.multiSelect === true
      const stored = (relSel[spec.manyRelationColumnKey] ?? "").trim()
      if (stored === "") continue
      const parts = relationFilterStoredValues(multi, stored)
      if (parts.length === 0) continue
      if (multi) {
        for (const p of parts) {
          qs.append(param, p)
        }
      } else {
        qs.set(param, parts[0]!)
      }
    }
  }
  const mergedHints: Record<string, string> = {
    ...(options?.appendWhereHints ?? {}),
  }
  const legParam = (options?.appendWhereHintParam ?? "").trim()
  const legVal = (options?.appendWhereHintValue ?? "").trim()
  if (legParam !== "" && legVal !== "" && mergedHints[legParam] === undefined) {
    mergedHints[legParam] = legVal
  }
  for (const [k, v] of Object.entries(mergedHints)) {
    const pk = k.trim()
    const pv = (v ?? "").trim()
    if (pk !== "" && pv !== "") qs.set(pk, pv)
  }
  return qs
}

/**
 * Validated segment for the first append-where hint spec, or `""` for “all”.
 * Prefer {@link parseAdminEntityListAppendWhereHintSegments} when multiple groups exist.
 */
export function parseAdminEntityListAppendWhereHintSegment(
  cfg: AdminEntityDefinition,
  searchParams: URLSearchParams,
): string {
  const specs = adminEntityListAppendWhereHintSpecs(cfg)
  const first = specs[0]
  if (!first) return ""
  const param = first.queryParam.trim()
  if (param === "") return ""
  const segs = parseAdminEntityListAppendWhereHintSegments(cfg, searchParams)
  return segs[param] ?? ""
}

/** Record for `ListAdminEntityPageOptions.appendListWhereHints` (empty → no hints). */
export function adminEntityListAppendWhereHintsFromSearchParams(
  cfg: AdminEntityDefinition,
  searchParams: URLSearchParams,
): Record<string, string> {
  const segs = parseAdminEntityListAppendWhereHintSegments(cfg, searchParams)
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(segs)) {
    const t = (v ?? "").trim()
    if (t !== "") out[k] = t
  }
  return out
}

export const ADMIN_ENTITY_LIST_LAYOUT_PARAM = "listLayout"

export function parseAdminEntityListLayoutFromSearchParams(
  cfg: AdminEntityDefinition,
  searchParams: URLSearchParams,
): "table" | "grid" {
  if (!cfg.listGrid) return "table"
  const raw = (searchParams.get(ADMIN_ENTITY_LIST_LAYOUT_PARAM) ?? "")
    .trim()
    .toLowerCase()
  if (raw === "grid" || raw === "table") return raw
  return cfg.listGrid.defaultMode === "grid" ? "grid" : "table"
}

export type ParsedAdminEntityListUrlState = {
  limit: number
  page: number
  search: string
  primarySort: PrimaryListSort | undefined
  booleanSegment: "all" | "true" | "false"
  /**
   * Relation-style list filters: `listRelationFilters[].columnKey` and
   * `listManyRelationFilters[].manyRelationColumnKey` (empty string = no filter).
   */
  relationFilterSelections: Record<string, string>
  /** Normalized `YYYY-MM` when `listYearMonthFilter` is active; empty = all periods. */
  yearMonthPeriod: string
  /**
   * Active list date ranges keyed by `listDateRangeFilter(s)[].columnKey`.
   */
  listDateRanges: Record<string, { from: string; to: string }>
  /**
   * Keys are append-where `queryParam` names; values are active option or `""` for “all”.
   */
  listAppendWhereHintSegments: Record<string, string>
  /** Desktop list layout when `cfg.listGrid` is set; otherwise `table`. */
  listLayout: "table" | "grid"
}

/**
 * Optional admin list URL deep link: open the entity edit dialog for a row on load.
 * Ignored by list parsing / API requests — consumed by the admin entity client hook.
 */
export const ADMIN_ENTITY_URL_OPEN_EDIT_PARAM = "openEdit"

/**
 * When `true` / `1`, the dialog opened via {@link ADMIN_ENTITY_URL_OPEN_EDIT_PARAM} is read-only
 * (`crossPageFormLocked`), same as viewing a related row without `allowCrossPageAdminEdit`.
 */
export const ADMIN_ENTITY_URL_DIALOG_VIEW_ONLY_PARAM = "dialogViewOnly"

export function parseAdminEntityUrlOpenEditDialog(
  searchParams: URLSearchParams,
): { rowId: string; viewOnly: boolean } | null {
  const rowId = (
    searchParams.get(ADMIN_ENTITY_URL_OPEN_EDIT_PARAM) ?? ""
  ).trim()
  if (rowId === "") return null
  const raw = (
    searchParams.get(ADMIN_ENTITY_URL_DIALOG_VIEW_ONLY_PARAM) ?? ""
  )
    .trim()
    .toLowerCase()
  const viewOnly = raw === "1" || raw === "true" || raw === "yes"
  return { rowId, viewOnly }
}

export function parseAdminEntityListFromSearchParams(
  cfg: AdminEntityDefinition,
  searchParams: URLSearchParams,
  pageSizeOptions: readonly number[],
  entityRegistry: EntityRegistry,
): ParsedAdminEntityListUrlState {
  const limitRaw = searchParams.get("limit")
  let limit = pageSizeOptions[0]
  if (limitRaw != null && limitRaw !== "") {
    const n = Number.parseInt(limitRaw, 10)
    if (
      Number.isFinite(n) &&
      (pageSizeOptions as readonly number[]).includes(n)
    ) {
      limit = n
    }
  }
  const pageRaw = searchParams.get("page")
  let page = 1
  if (pageRaw != null && pageRaw !== "") {
    const n = Number.parseInt(pageRaw, 10)
    if (Number.isFinite(n) && n >= 1) page = n
  }
  const searchRaw = searchParams.get("search")
  const search = searchRaw != null ? searchRaw.trim() : ""
  const primarySort = parseAdminEntityListSortParamsFromCfg(cfg, searchParams)
  const bool = parseAdminEntityBooleanListFilterFromCfg(cfg, searchParams)
  const booleanSegment: ParsedAdminEntityListUrlState["booleanSegment"] =
    bool === true ? "true" : bool === false ? "false" : "all"
  const rel = parseAdminEntityRelationListFiltersFromCfg(cfg, searchParams)
  const many = parseAdminEntityManyRelationListFiltersFromCfg(
    cfg,
    searchParams,
    entityRegistry,
  )
  const relationFilterSelections: Record<string, string> = {
    ...rel.selections,
    ...many.selections,
  }
  const ymParsed = parseAdminEntityYearMonthListFilterFromCfg(cfg, searchParams)
  const yearMonthPeriod =
    ymParsed != null
      ? normalizeAdminEntityYearMonthPeriodString(
          ymParsed.year,
          ymParsed.month,
        )
      : ""
  const parsedDr = parseAdminEntityListDateRangeFiltersFromCfg(
    cfg,
    searchParams,
  )
  const listDateRanges: Record<string, { from: string; to: string }> = {}
  for (const r of parsedDr) {
    listDateRanges[r.columnKey] = { from: r.from, to: r.to }
  }
  const listAppendWhereHintSegments =
    parseAdminEntityListAppendWhereHintSegments(cfg, searchParams)
  const listLayout = parseAdminEntityListLayoutFromSearchParams(
    cfg,
    searchParams,
  )
  return {
    limit,
    page,
    search,
    primarySort,
    booleanSegment,
    relationFilterSelections,
    yearMonthPeriod,
    listDateRanges,
    listAppendWhereHintSegments,
    listLayout,
  }
}

/** Same canonical query string the list GET uses, for URL sync / bookmarking. */
export function stableAdminEntityListStateQueryString(input: {
  cfg: AdminEntityDefinition
  limit: number
  page: number
  search: string
  sort: PrimaryListSort
  booleanFilterParam?: string
  booleanSegment: ParsedAdminEntityListUrlState["booleanSegment"]
  relationFilterSelections: Record<string, string>
  yearMonthFilterParam?: string
  yearMonthPeriod: string
  listAppendWhereHintFilterEnabled?: boolean
  listAppendWhereHintSegments?: Record<string, string>
  listDateRanges?: Record<string, { from: string; to: string }>
  listLayout?: "table" | "grid"
}): string {
  const ymSpec = input.cfg.listYearMonthFilter
  const ymParam = input.yearMonthFilterParam ?? ymSpec?.queryParam ?? "reportedPeriod"
  const awEnabled = input.listAppendWhereHintFilterEnabled === true
  const awSegs = awEnabled ? (input.listAppendWhereHintSegments ?? {}) : {}
  const appendWhereHints: Record<string, string> = {}
  if (awEnabled) {
    for (const [k, v] of Object.entries(awSegs)) {
      const t = (v ?? "").trim()
      if (t !== "") appendWhereHints[k] = t
    }
  }
  const qs = buildAdminEntityListSearchParams(
    input.limit,
    { kind: "page", page: input.page },
    {
      search: input.search || undefined,
      booleanFilterParam: input.booleanFilterParam,
      booleanFilterValue:
        input.booleanSegment === "all"
          ? undefined
          : input.booleanSegment === "true",
      sort: input.sort,
      ...(ymSpec
        ? {
            yearMonthFilterParam: ymParam,
            yearMonthPeriod: input.yearMonthPeriod.trim(),
          }
        : {}),
      ...(input.listDateRanges &&
      Object.keys(input.listDateRanges).length > 0
        ? { listDateRanges: input.listDateRanges }
        : {}),
      parentListCfg: input.cfg,
      relationFilterSelections: input.relationFilterSelections,
      ...(Object.keys(appendWhereHints).length > 0 ? { appendWhereHints } : {}),
    },
  )
  if (input.cfg.listGrid) {
    qs.set(
      ADMIN_ENTITY_LIST_LAYOUT_PARAM,
      input.listLayout === "grid" ? "grid" : "table",
    )
  }
  return stableAdminEntityListQueryString(qs)
}

/**
 * Canonical list-query key for `window.location.search` (e.g. `"?page=2&limit=50"` or `""`),
 * using the same parsing rules as the admin URL-read layout effect.
 */
export function stableAdminEntityListQueryFromLocationSearch(
  cfg: AdminEntityDefinition,
  locationSearch: string,
  pageSizeOptions: readonly number[],
  listBooleanFilterEnabled: boolean,
  listBooleanFilterParam: string | undefined,
  listYearMonthFilterEnabled: boolean,
  listYearMonthFilterParam: string | undefined,
  listAppendWhereHintFilterEnabled: boolean,
  entityRegistry: EntityRegistry,
): string {
  const raw = locationSearch.startsWith("?")
    ? locationSearch.slice(1)
    : locationSearch
  const parsed = parseAdminEntityListFromSearchParams(
    cfg,
    new URLSearchParams(raw),
    pageSizeOptions,
    entityRegistry,
  )
  const effectiveSort =
    parsed.primarySort ?? defaultAdminEntityListPrimarySortFromCfg(cfg)
  return stableAdminEntityListStateQueryString({
    cfg,
    limit: parsed.limit,
    page: parsed.page,
    search: parsed.search,
    sort: effectiveSort,
    booleanFilterParam: listBooleanFilterEnabled
      ? listBooleanFilterParam
      : undefined,
    booleanSegment: parsed.booleanSegment,
    relationFilterSelections: parsed.relationFilterSelections,
    yearMonthFilterParam: listYearMonthFilterEnabled
      ? listYearMonthFilterParam
      : undefined,
    yearMonthPeriod: parsed.yearMonthPeriod,
    listDateRanges: parsed.listDateRanges,
    listAppendWhereHintFilterEnabled,
    listAppendWhereHintSegments: listAppendWhereHintFilterEnabled
      ? parsed.listAppendWhereHintSegments
      : undefined,
    listLayout: parsed.listLayout,
  })
}

export function adminEntityListUrl(
  apiBase: string,
  limit: number,
  input: ListFetchInput,
  options?: {
    search?: string
    booleanFilterParam?: string
    booleanFilterValue?: boolean
    sort?: { columnKey: string; direction: "asc" | "desc" }
    yearMonthFilterParam?: string
    yearMonthPeriod?: string
    reportingPeriodScopeParam?: string
    reportingPeriodScopeValue?: string
    listDateRanges?: Record<string, { from: string; to: string }>
    parentListCfg?: AdminEntityDefinition
    relationFilterSelections?: Record<string, string>
    appendWhereHints?: Record<string, string>
    appendWhereHintParam?: string
    appendWhereHintValue?: string
  },
): string {
  const qs = buildAdminEntityListSearchParams(limit, input, options)
  return `${apiBase}?${qs.toString()}`
}

export function paginationWindow(
  current: number,
  total: number,
): (number | "gap")[] {
  if (total <= 9) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | "gap")[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) pages.push("gap")
  for (let p = start; p <= end; p++) pages.push(p)
  if (end < total - 1) pages.push("gap")
  pages.push(total)
  return pages
}
