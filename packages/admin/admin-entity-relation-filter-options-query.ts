import {
  adminEntityListUrl,
  stableAdminEntityListQueryString,
  stableAppendWhereHintSegmentsKey,
} from "./admin-entity-admin-list-fetch"
import {
  ADMIN_ENTITY_LIST_MAX_LIMIT,
  type AdminEntityListResponse,
} from "./admin-entity-list-api"
import type { AdminEntityCrudFormSubscribeApi } from "./admin-entity-crud-form-subscribe-api"
import type { AdminEntityDefinition } from "./admin-entity-types"
import { isAdminEntityCrudRelatedCollectionTable } from "./admin-entity-types"
import { readApiErrorMessage } from "./read-api-error"

export type AdminRelationOptionCrudFetchScope =
  | { readonly mode: "unscoped" }
  | {
      readonly mode: "scoped"
      readonly relationFilterSelections: Record<string, string>
    }
  | { readonly mode: "wait" }

/**
 * Decide how to load FK option lists inside `crudRelatedCollections` for a given parent row.
 */
export function relationOptionFetchScopeForCrudInline(
  parentSlug: string,
  relatedSlug: string,
  detailPayload: Record<string, unknown> | undefined,
  adminEntities: Readonly<Record<string, AdminEntityDefinition>>,
  parentCrudForm?: AdminEntityCrudFormSubscribeApi,
): AdminRelationOptionCrudFetchScope {
  const parentCfg = adminEntities[parentSlug]
  const specs = parentCfg?.crudRelationOptionFiltersFromParentDetail
  if (!specs?.length) return { mode: "unscoped" }
  const entry = specs.find((e) => e.relatedEntitySlug === relatedSlug)
  if (!entry) return { mode: "unscoped" }
  const out: Record<string, string> = {}
  for (const sel of entry.selections) {
    if ("fixedRelationFilterValue" in sel) {
      const v = sel.fixedRelationFilterValue.trim()
      if (v !== "") {
        out[sel.relatedListFilterColumnKey] = v
      }
      continue
    }
    const detailRaw =
      detailPayload != null ? detailPayload[sel.parentDetailJsonKey] : undefined
    const detailStr =
      detailRaw == null ? "" : String(detailRaw).trim()
    const formRaw = parentCrudForm?.getFieldValue(sel.parentDetailJsonKey)
    const formStr = formRaw == null ? "" : String(formRaw).trim()
    const s = detailStr !== "" ? detailStr : formStr
    if (s === "") {
      if (sel.optionalWhenEmpty === true) {
        const sent = sel.whenEmptyRelationFilterValue?.trim()
        if (sent != null && sent !== "") {
          out[sel.relatedListFilterColumnKey] = sent
        }
        continue
      }
      return { mode: "wait" }
    }
    out[sel.relatedListFilterColumnKey] = s
  }
  return { mode: "scoped", relationFilterSelections: out }
}

/**
 * Related entity slugs whose option lists are needed for `crudRelatedCollections` inline editors
 * (any `inlineEditableColumnKeys` with `listRelation` on the child entity).
 */
export function adminEntityRelationSlugsForParentCrudRelatedCollections(
  parentCfg: AdminEntityDefinition,
  adminEntities: Readonly<Record<string, AdminEntityDefinition>>,
): string[] {
  const rel = parentCfg.crudRelatedCollections
  if (!rel?.length) return []
  const s = new Set<string>()
  for (const c of rel) {
    if (!isAdminEntityCrudRelatedCollectionTable(c)) continue
    const childCfg = adminEntities[c.childEntitySlug]
    if (!childCfg) continue
    for (const k of c.inlineEditableColumnKeys) {
      const col = childCfg.columns.find((x) => x.key === k)
      if (
        col?.listRelation &&
        col.listRelation.crudFormUiVariant !== "asyncSearch"
      )
        s.add(col.listRelation.relatedEntitySlug)
    }
  }
  return [...s].sort()
}

/** Align with `useQueries` / prefetch for relation FK option lists. */
export const ADMIN_ENTITY_RELATION_FILTER_OPTIONS_STALE_MS = 6 * 60 * 1000

/**
 * Per-page row cap when preloading ALL pages of a relation (`crudRelationPreloadAllPages`). Lets a
 * single request pull the whole option set (e.g. ~1.6k hardsole items) instead of paginating in
 * 100-row pages. The server honors this only for the `relationPreloadAllUtc=1` preload request.
 */
export const ADMIN_ENTITY_RELATION_PRELOAD_ALL_MAX_LIMIT = 5000

/** Query param signalling the server to lift its default list cap for an all-pages relation preload. */
export const ADMIN_ENTITY_RELATION_PRELOAD_ALL_PARAM = "relationPreloadAllUtc"

/** Stable segment for React Query keys / deduping relation-option fetches. */
export function serializeRelationFilterOptionsQueryExtras(opts?: {
  readonly appendWhereHints?: Readonly<Record<string, string>>
  readonly fetchAllPages?: boolean
  readonly limit?: number
}): string {
  const hintsKey = stableAppendWhereHintSegmentsKey(
    (opts?.appendWhereHints ?? {}) as Record<string, string>,
  )
  const limRaw = opts?.limit
  const lim =
    limRaw != null && Number.isFinite(limRaw)
      ? Math.min(Math.max(1, Math.floor(limRaw)), 500)
      : ADMIN_ENTITY_LIST_MAX_LIMIT
  const fa = opts?.fetchAllPages === true ? "1" : "0"
  return `${hintsKey}|${fa}|${lim}`
}

export function adminEntityRelationFilterOptionsQueryKey(
  relatedSlug: string,
  relationFilterSelections?: Record<string, string>,
  reportingPeriodScope?: { param: string; value: string },
  extrasSerialized = "",
) {
  let selectionKey = ""
  if (relationFilterSelections && Object.keys(relationFilterSelections).length > 0) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(relationFilterSelections).sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      qs.set(k, v)
    }
    selectionKey = stableAdminEntityListQueryString(qs)
  }
  const scope = reportingPeriodScope?.value.trim()
  if (scope && reportingPeriodScope) {
    const qs = new URLSearchParams()
    qs.set(reportingPeriodScope.param, scope)
    const sk = stableAdminEntityListQueryString(qs)
    selectionKey = selectionKey ? `${selectionKey}|${sk}` : sk
  }
  return [
    "admin-entity-relation-filter-options",
    relatedSlug,
    selectionKey,
    extrasSerialized,
  ] as const
}

export type AdminEntityRelationFilterOptionsResult = {
  list: AdminEntityListResponse
  idKey: string
}

/**
 * Loads the related admin entity list (max limit, sort by id asc) for select / filter options.
 * Used by list filters, CRUD FK selects, related-collection inline FK selects, and `prefetchQuery`.
 *
 * When `fetchAllPages` is true, paginates through all pages and merges results — use for
 * `preloadedSearch` relations where the full option set may exceed the 100-record max.
 */
export async function fetchAdminEntityRelationFilterOptions(
  relatedSlug: string,
  loadAdminEntityDefinition: (
    slug: string,
  ) => Promise<AdminEntityDefinition>,
  fetchOptions?: {
    relationFilterSelections?: Record<string, string>
    reportingPeriodScopeParam?: string
    reportingPeriodScopeValue?: string
    fetchAllPages?: boolean
    appendWhereHints?: Readonly<Record<string, string>>
    /** Page size for each list request (max 500). */
    limit?: number
  },
): Promise<AdminEntityRelationFilterOptionsResult> {
  const relCfg = await loadAdminEntityDefinition(relatedSlug)
  const idKey = relCfg.idColumn.jsonKey
  const rf = fetchOptions?.relationFilterSelections
  const scopeParam = fetchOptions?.reportingPeriodScopeParam
  const scopeVal = fetchOptions?.reportingPeriodScopeValue?.trim()
  const appendHintsRaw = fetchOptions?.appendWhereHints
  const appendHints =
    appendHintsRaw != null && Object.keys(appendHintsRaw).length > 0
      ? (appendHintsRaw as Record<string, string>)
      : undefined
  const limRaw = fetchOptions?.limit
  const allPages = fetchOptions?.fetchAllPages === true
  const effectiveLimit = Math.min(
    Math.max(
      1,
      limRaw != null && Number.isFinite(limRaw)
        ? Math.floor(limRaw)
        : ADMIN_ENTITY_LIST_MAX_LIMIT,
    ),
    allPages ? ADMIN_ENTITY_RELATION_PRELOAD_ALL_MAX_LIMIT : 500,
  )

  const buildUrl = (page: number) => {
    const base = adminEntityListUrl(
      relCfg.apiBase,
      effectiveLimit,
      { kind: "page", page },
      {
        sort: { columnKey: idKey, direction: "asc" },
        ...(rf && Object.keys(rf).length > 0
          ? { parentListCfg: relCfg, relationFilterSelections: rf }
          : {}),
        ...(scopeParam && scopeVal
          ? {
              reportingPeriodScopeParam: scopeParam,
              reportingPeriodScopeValue: scopeVal,
            }
          : {}),
        ...(appendHints != null ? { appendWhereHints: appendHints } : {}),
      },
    )
    // Opt the server into the raised cap so the whole option set lands in one page.
    return allPages
      ? `${base}&${ADMIN_ENTITY_RELATION_PRELOAD_ALL_PARAM}=1`
      : base
  }

  if (fetchOptions?.fetchAllPages) {
    let page = 1
    let allItems: Record<string, unknown>[] = []
    let lastList: AdminEntityListResponse
    do {
      const res = await fetch(buildUrl(page))
      if (!res.ok) throw new Error(await readApiErrorMessage(res))
      lastList = (await res.json()) as AdminEntityListResponse
      allItems = allItems.concat(lastList.items)
      page++
    } while (lastList.hasNextPage)
    return { list: { ...lastList!, items: allItems }, idKey }
  }

  const res = await fetch(buildUrl(1))
  if (!res.ok) throw new Error(await readApiErrorMessage(res))
  const list = (await res.json()) as AdminEntityListResponse
  return { list, idKey }
}
