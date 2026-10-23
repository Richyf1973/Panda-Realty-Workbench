"use client"

import { useQuery } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"

import {
  adminEntityListUrl,
  defaultAdminEntityListPrimarySortFromCfg,
} from "./admin-entity-admin-list-fetch"
import {
  ADMIN_ENTITY_LIST_MAX_LIMIT,
  type AdminEntityListResponse,
} from "./admin-entity-list-api"
import { adminEntityRelationOptionLabel } from "./admin-entity-relation-filter-option-label"
import { readApiErrorMessage } from "./read-api-error"
import type { AdminEntityDefinition } from "./admin-entity-types"

export function useAdminEntityDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

export function clampAdminEntityRelationAsyncSearchLimit(raw: number): number {
  if (!Number.isFinite(raw) || raw < 1) return 50
  return Math.min(Math.floor(raw), ADMIN_ENTITY_LIST_MAX_LIMIT)
}

/** Server-backed typeahead for a related admin list (shared cache key with list filters). */
export function useAdminEntityRelatedListSearchQuery(
  relCfg: AdminEntityDefinition | undefined,
  debouncedSearch: string,
  fetchLimit: number,
  enabled: boolean,
  options?: {
    /** When set, merged into list URL like relation-scoped option fetches (`parentListCfg` = `relCfg`). */
    relationFilterSelections?: Record<string, string>
    /**
     * When set, adds `booleanFilterParam` / `booleanFilterValue` to the list URL (same semantics as
     * entity `listBooleanFilter` on the **related** listing, e.g. Panda `isFavorite=true`).
     */
    listBooleanFilter?: { param: string; value: boolean }
    /**
     * When **`true`**, runs the query even if `debouncedSearch` is empty (use with a bounded list
     * — e.g. small `fetchLimit`, relation filters, or known-small catalogs).
     */
    allowEmptySearchFetch?: boolean
  },
) {
  const primarySort = useMemo(
    () =>
      relCfg != null
        ? defaultAdminEntityListPrimarySortFromCfg(relCfg)
        : { columnKey: "id", direction: "asc" as const },
    [relCfg],
  )

  const selectionKey = useMemo(() => {
    const rf = options?.relationFilterSelections
    if (rf == null) return ""
    const keys = Object.keys(rf).sort()
    return keys.map((k) => `${k}=${rf[k] ?? ""}`).join("&")
  }, [options?.relationFilterSelections])

  const hasRelationFilterValues =
    options?.relationFilterSelections != null &&
    Object.values(options.relationFilterSelections).some(
      (v) => String(v ?? "").trim() !== "",
    )

  const listBooleanFilter = options?.listBooleanFilter
  const booleanFilterKey =
    listBooleanFilter != null
      ? `${listBooleanFilter.param}=${listBooleanFilter.value ? "1" : "0"}`
      : ""

  const allowEmptySearchFetch = options?.allowEmptySearchFetch === true

  const shouldFetch =
    enabled &&
    relCfg != null &&
    (debouncedSearch.trim().length > 0 ||
      hasRelationFilterValues ||
      allowEmptySearchFetch)

  return useQuery({
    queryKey: [
      "admin-entity-relation-filter-async-search",
      relCfg?.apiBase ?? "",
      debouncedSearch,
      fetchLimit,
      primarySort.columnKey,
      primarySort.direction,
      selectionKey,
      booleanFilterKey,
      allowEmptySearchFetch ? "1" : "0",
    ] as const,
    enabled: shouldFetch,
    staleTime: 15_000,
    queryFn: async (): Promise<AdminEntityListResponse> => {
      if (relCfg == null) {
        throw new Error("Missing related entity config")
      }
      const rf = options?.relationFilterSelections
      const hasRf = rf != null && Object.keys(rf).length > 0
      const bf = options?.listBooleanFilter
      const url = adminEntityListUrl(
        relCfg.apiBase,
        fetchLimit,
        { kind: "page", page: 1 },
        {
          search: debouncedSearch.trim(),
          sort: primarySort,
          ...(bf != null
            ? {
                booleanFilterParam: bf.param,
                booleanFilterValue: bf.value,
              }
            : {}),
          ...(hasRf
            ? {
                parentListCfg: relCfg,
                relationFilterSelections: rf,
              }
            : {}),
        },
      )
      const res = await fetch(url, { cache: "no-store" })
      if (!res.ok) throw new Error(await readApiErrorMessage(res))
      return res.json() as Promise<AdminEntityListResponse>
    },
  })
}

/** React Query key for {@link useAdminEntityRelatedRowDetailLabel} / row GET label. */
export function adminEntityRelatedRowDetailLabelQueryKey(
  relCfg: AdminEntityDefinition | undefined,
  storedValue: string,
) {
  const idKey = relCfg?.idColumn.jsonKey ?? ""
  const trimmed = storedValue.trim()
  return [
    "admin-entity-relation-filter-async-selected",
    relCfg?.apiBase ?? "",
    idKey,
    trimmed,
  ] as const
}

/** GET `/api/.../:id` and format the relation trigger label (same as hook `queryFn`). */
export async function fetchAdminEntityRelatedRowDetailLabel(
  relCfg: AdminEntityDefinition,
  labelColumnKeys: readonly string[],
  storedValue: string,
): Promise<string> {
  const trimmed = storedValue.trim()
  if (trimmed === "") return trimmed
  const res = await fetch(
    `${relCfg.apiBase}/${encodeURIComponent(trimmed)}`,
    { cache: "no-store" },
  )
  if (!res.ok) return trimmed
  const row = (await res.json()) as Record<string, unknown>
  const label = adminEntityRelationOptionLabel(
    row,
    labelColumnKeys,
    relCfg.columns,
  )
  return label.trim() !== "" ? label : trimmed
}

/** Resolve display label for a stored FK via GET `/api/.../:id` (shared cache key with list filters). */
export function useAdminEntityRelatedRowDetailLabel(
  relCfg: AdminEntityDefinition | undefined,
  labelColumnKeys: readonly string[],
  storedValue: string,
  options?: {
    /**
     * When **`false`**, skips the row GET (e.g. detail embed already supplies the label, or CRUD
     * defers fetch until the user opens the combobox). Defaults to **`true`** when omitted (list
     * filters and classic behavior).
     */
    readonly enabled?: boolean
  },
) {
  const trimmed = storedValue.trim()
  const gate = options?.enabled ?? true

  return useQuery({
    queryKey: adminEntityRelatedRowDetailLabelQueryKey(relCfg, storedValue),
    enabled: relCfg != null && trimmed !== "" && gate,
    staleTime: 60_000,
    queryFn: async (): Promise<string> => {
      if (relCfg == null) return trimmed
      return fetchAdminEntityRelatedRowDetailLabel(
        relCfg,
        labelColumnKeys,
        storedValue,
      )
    },
  })
}
