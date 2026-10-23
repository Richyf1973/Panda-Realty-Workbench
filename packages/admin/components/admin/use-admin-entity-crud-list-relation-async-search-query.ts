"use client"

import * as React from "react"
import type { AdminEntityDefinition } from "../../admin-entity-types"
import type { AdminEntityColumnListRelation } from "../../admin-entity-column-types"
import {
  clampAdminEntityRelationAsyncSearchLimit,
  useAdminEntityDebouncedValue,
  useAdminEntityRelatedListSearchQuery,
  useAdminEntityRelatedRowDetailLabel,
} from "../../admin-entity-relation-async-search-queries"
import {
  buildMergedRelatedListSearchOpts,
  buildRelationSearchOptions,
} from "./admin-entity-crud-list-relation-async-search-helpers"

/**
 * Max preloaded options rendered at once. A fully-preloaded relation may hold thousands of rows;
 * painting them all freezes cmdk for seconds. The user types to narrow below this cap.
 */
const PRELOADED_RENDER_CAP = 50

export type UseRelationListQueryProps = {
  relCfg: AdminEntityDefinition | undefined
  listRel: AdminEntityColumnListRelation
  preloadedOptions: readonly { value: string; label: string }[] | undefined
  open: boolean
  popoverSearch: string
  value: string
  trimmed: string
  relationFilterSelections: Record<string, string> | undefined
  relationSearchListBooleanFilter: { param: string; value: boolean } | undefined
  relationSearchAllowEmptyFetch: boolean | undefined
  excludeRelatedRowIds: readonly string[] | undefined
  eagerFetchSelectedRelationLabel: boolean
  embedMatchesStoredFk: boolean
  allowDetailLabelFetch: boolean
}

/**
 * Owns all the async query + options state for a relation combobox:
 * server list query, label detail fetch, preloaded option filtering, and exact-match check.
 * Extracted from `useAdminEntityCrudListRelationAsyncSearch` to keep that hook under ~300 lines.
 */
export function useRelationListQuery(props: UseRelationListQueryProps) {
  const {
    relCfg,
    listRel,
    preloadedOptions,
    open,
    popoverSearch,
    value,
    trimmed,
    relationFilterSelections,
    relationSearchListBooleanFilter,
    relationSearchAllowEmptyFetch,
    excludeRelatedRowIds,
    eagerFetchSelectedRelationLabel,
    embedMatchesStoredFk,
    allowDetailLabelFetch,
  } = props

  const isPreloaded = preloadedOptions != null
  const trimmedPopoverSearch = popoverSearch.trim()

  const relationFilterOpts =
    relationFilterSelections != null && Object.keys(relationFilterSelections).length > 0
      ? { relationFilterSelections }
      : undefined

  const hasScopedRelationFilters =
    relationFilterOpts?.relationFilterSelections != null &&
    Object.values(relationFilterOpts.relationFilterSelections).some(
      (v) => String(v ?? "").trim() !== "",
    )

  // The preloaded set is the COMPLETE dataset — always filter client-side, never query the server
  // on type — when either the options are scope-filtered by a parent form field
  // (hasScopedRelationFilters) OR the relation explicitly preloads every page
  // (crudRelationPreloadAllPages), e.g. inventory item pickers scoped by an append-where hint.
  const preloadedDatasetIsComplete =
    hasScopedRelationFilters || listRel.crudRelationPreloadAllPages === true
  const usingPreloadedOptions =
    isPreloaded && (preloadedDatasetIsComplete || trimmedPopoverSearch === "")
  const queryingServerFromPreloadedSearch =
    isPreloaded && !preloadedDatasetIsComplete && trimmedPopoverSearch !== ""

  const searchRaw = open ? popoverSearch : ""
  const debouncedSearch = useAdminEntityDebouncedValue(searchRaw, 280)

  const mergedRelatedListSearchOpts = React.useMemo(
    () =>
      buildMergedRelatedListSearchOpts(
        usingPreloadedOptions,
        relationFilterOpts?.relationFilterSelections,
        relationSearchListBooleanFilter,
        relationSearchAllowEmptyFetch,
      ),
    [
      usingPreloadedOptions,
      relationFilterOpts?.relationFilterSelections,
      relationSearchListBooleanFilter,
      relationSearchAllowEmptyFetch,
    ],
  )

  const limit = clampAdminEntityRelationAsyncSearchLimit(listRel.crudAsyncSearchFetchLimit ?? 50)

  const detailLabelFetchEnabled =
    !embedMatchesStoredFk &&
    (open || allowDetailLabelFetch || (eagerFetchSelectedRelationLabel === true && trimmed !== ""))

  const listQuery = useAdminEntityRelatedListSearchQuery(
    relCfg,
    debouncedSearch,
    limit,
    relCfg != null && (!isPreloaded || queryingServerFromPreloadedSearch),
    mergedRelatedListSearchOpts,
  )

  const labelColumnKeys = listRel.labelColumnKeys
  const compoundIdAndLabel = listRel.crudAsyncSearchCompoundIdAndLabel === true

  const labelFromPreloaded = React.useMemo(() => {
    if (!isPreloaded || trimmed === "") return ""
    return preloadedOptions?.find((o) => o.value === trimmed)?.label ?? ""
  }, [isPreloaded, preloadedOptions, trimmed])

  const selectedLabelQuery = useAdminEntityRelatedRowDetailLabel(
    !isPreloaded || labelFromPreloaded === "" ? relCfg : undefined,
    labelColumnKeys,
    value,
    { enabled: detailLabelFetchEnabled },
  )

  const idKey = relCfg?.idColumn.jsonKey ?? ""
  const relatedColumns = relCfg?.columns

  const excludeIdsKey = (excludeRelatedRowIds ?? []).join("\0")
  const excludeIdSet = React.useMemo(
    () => new Set(excludeRelatedRowIds ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [excludeIdsKey],
  )

  const options = React.useMemo(() => {
    const raw = buildRelationSearchOptions(
      usingPreloadedOptions,
      preloadedOptions,
      (listQuery.data?.items ?? []) as Record<string, unknown>[],
      idKey,
      excludeIdSet,
      labelColumnKeys,
      relatedColumns,
      compoundIdAndLabel,
    )
    if (usingPreloadedOptions) {
      const filtered = trimmedPopoverSearch
        ? raw.filter((o) => {
            const lower = trimmedPopoverSearch.toLowerCase()
            return (
              o.label.toLowerCase().includes(lower) ||
              o.value.toLowerCase().includes(lower)
            )
          })
        : raw
      // Cap RENDERED options: a fully-preloaded relation can hold thousands of rows (e.g. all
      // hardsole inventory items). Painting every node freezes the popover for seconds — keep the
      // DOM small and let the user type to narrow (typing filters before this cap applies).
      return filtered.length > PRELOADED_RENDER_CAP
        ? filtered.slice(0, PRELOADED_RENDER_CAP)
        : filtered
    }
    return raw
  }, [
    compoundIdAndLabel,
    excludeIdSet,
    idKey,
    labelColumnKeys,
    listQuery.data?.items,
    preloadedOptions,
    relatedColumns,
    trimmedPopoverSearch,
    usingPreloadedOptions,
  ])

  const createRel = listRel.crudAsyncSearchCreateRelated
  const exactIdMatchForQuery =
    trimmedPopoverSearch !== "" &&
    !createRel?.allowCreateOnExactMatch &&
    options.some(
      (o) =>
        o.value.trim().toLowerCase() === trimmedPopoverSearch.toLowerCase() ||
        o.label.trim().toLowerCase() === trimmedPopoverSearch.toLowerCase(),
    )

  return {
    hasScopedRelationFilters,
    usingPreloadedOptions,
    queryingServerFromPreloadedSearch,
    trimmedPopoverSearch,
    mergedRelatedListSearchOpts,
    debouncedSearch,
    listQuery,
    labelFromPreloaded,
    selectedLabelQuery,
    excludeIdSet,
    options,
    exactIdMatchForQuery,
    idKey,
    relatedColumns,
  }
}
