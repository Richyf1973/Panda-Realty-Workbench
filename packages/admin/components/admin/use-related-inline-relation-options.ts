import { useQueries } from "@tanstack/react-query"
import { useMemo } from "react"

import {
  ADMIN_ENTITY_RELATION_FILTER_OPTIONS_STALE_MS,
  adminEntityRelationFilterOptionsQueryKey,
  fetchAdminEntityRelationFilterOptions,
  relationOptionFetchScopeForCrudInline,
  serializeRelationFilterOptionsQueryExtras,
} from "../../admin-entity-relation-filter-options-query"
import { adminEntityRelationOptionLabel } from "../../admin-entity-relation-filter-option-label"
import {
  buildRelationNumericLookupMap,
  relationNumericLookupCacheKey,
  type AdminRelatedRelationNumericMaps,
} from "../../admin-entity-crud-related-virtual"
import { relatedVirtualFactors } from "../../admin-entity-crud-related-inline-helpers"
import type { AdminEntityCrudFormSubscribeApi } from "../../admin-entity-crud-form-subscribe-api"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type {
  AdminEntityCrudRelatedCollectionTable,
  AdminEntityDefinition,
} from "../../admin-entity-types"

export function useRelatedInlineRelationOptions({
  childCfg,
  collection,
  parentSlug,
  detailPayload,
  adminEntities,
  parentCrudForm,
  loadAdminEntityDefinition,
}: {
  childCfg: AdminEntityDefinition | undefined
  collection: AdminEntityCrudRelatedCollectionTable
  parentSlug: AdminEntitySlug
  detailPayload: Record<string, unknown> | undefined
  adminEntities: Readonly<Record<string, AdminEntityDefinition>>
  parentCrudForm: AdminEntityCrudFormSubscribeApi | undefined
  loadAdminEntityDefinition: (slug: string) => Promise<AdminEntityDefinition>
}) {
  const relationSlugsForInline = useMemo(() => {
    if (!childCfg) return []
    const s = new Set<string>()
    for (const k of collection.inlineEditableColumnKeys) {
      const col = childCfg.columns.find((c) => c.key === k)
      const lr = col?.listRelation
      if (lr && lr.crudFormUiVariant !== "asyncSearch") s.add(lr.relatedEntitySlug)
    }
    for (const f of relatedVirtualFactors(
      collection.inlineVirtualColumns ?? [],
    )) {
      if (f.kind !== "relationNumeric") continue
      const col = childCfg.columns.find((c) => c.key === f.fkColumnKey)
      const lr = col?.listRelation
      if (lr && lr.crudFormUiVariant !== "asyncSearch") s.add(lr.relatedEntitySlug)
    }
    return [...s]
  }, [childCfg, collection.inlineEditableColumnKeys, collection.inlineVirtualColumns])

  const relationInlineOptionsQueries = useQueries({
    queries: relationSlugsForInline.map((relatedSlug) => {
      const scope = relationOptionFetchScopeForCrudInline(
        parentSlug,
        relatedSlug,
        detailPayload,
        adminEntities,
        parentCrudForm,
      )
      const scopedSelections =
        scope.mode === "scoped" ? scope.relationFilterSelections : undefined
      const fetchAllPages = childCfg?.columns.some(
        (c) =>
          c.listRelation?.relatedEntitySlug === relatedSlug &&
          c.listRelation.crudRelationPreloadAllPages === true,
      )
      const appendHintsCol = childCfg?.columns.find(
        (c) =>
          c.listRelation?.relatedEntitySlug === relatedSlug &&
          c.listRelation.crudRelationPreloadAppendWhereHints != null &&
          Object.keys(c.listRelation.crudRelationPreloadAppendWhereHints).length >
            0,
      )
      const appendWhereHints =
        appendHintsCol?.listRelation?.crudRelationPreloadAppendWhereHints
      const preloadLimit = appendHintsCol?.listRelation?.crudRelationPreloadFetchLimit
      const extras = serializeRelationFilterOptionsQueryExtras({
        appendWhereHints:
          appendWhereHints != null &&
          Object.keys(appendWhereHints).length > 0
            ? { ...appendWhereHints }
            : undefined,
        fetchAllPages,
        ...(preloadLimit != null && Number.isFinite(preloadLimit)
          ? { limit: preloadLimit }
          : {}),
      })
      return {
        queryKey: adminEntityRelationFilterOptionsQueryKey(
          relatedSlug,
          scopedSelections,
          undefined,
          extras,
        ),
        enabled:
          relationSlugsForInline.length > 0 &&
          (scope.mode === "unscoped" || scope.mode === "scoped"),
        staleTime: ADMIN_ENTITY_RELATION_FILTER_OPTIONS_STALE_MS,
        queryFn: () =>
          fetchAdminEntityRelationFilterOptions(
            relatedSlug,
            loadAdminEntityDefinition,
            {
              ...(scopedSelections && Object.keys(scopedSelections).length > 0
                ? { relationFilterSelections: scopedSelections }
                : {}),
              ...(fetchAllPages ? { fetchAllPages: true } : {}),
              ...(appendWhereHints != null &&
              Object.keys(appendWhereHints).length > 0
                ? { appendWhereHints: { ...appendWhereHints } }
                : {}),
              ...(preloadLimit != null && Number.isFinite(preloadLimit)
                ? { limit: preloadLimit }
                : {}),
            },
          ),
      }
    }),
  })

  const parentCfgForRelationScope = adminEntities[parentSlug]
  const relationScopeFormTickle = (() => {
    const specs = parentCfgForRelationScope?.crudRelationOptionFiltersFromParentDetail
    if (!specs?.length) return ""
    const keys = new Set<string>()
    for (const e of specs) {
      for (const s of e.selections) {
        if ("parentDetailJsonKey" in s && s.parentDetailJsonKey !== "") {
          keys.add(s.parentDetailJsonKey)
        }
      }
    }
    return [...keys]
      .sort()
      .map(
        (k) =>
          `${k}=${String(parentCrudForm?.getFieldValue(k) ?? detailPayload?.[k] ?? "")}`,
      )
      .join("\0")
  })()

  const relationAsyncFilterSelectionsByRelatedSlug = useMemo(() => {
    const m: Record<string, Record<string, string>> = {}
    for (const rs of relationSlugsForInline) {
      const sc = relationOptionFetchScopeForCrudInline(
        parentSlug,
        rs,
        detailPayload,
        adminEntities,
        parentCrudForm,
      )
      if (sc.mode === "scoped") m[rs] = sc.relationFilterSelections
    }
    return m
  }, [
    adminEntities,
    detailPayload,
    parentCrudForm,
    parentSlug,
    relationScopeFormTickle,
    relationSlugsForInline,
  ])

  const crudInlineRelationAwaitingParentDetailByRelatedSlug = useMemo(() => {
    const parentCfg = adminEntities[parentSlug]
    const specs = parentCfg?.crudRelationOptionFiltersFromParentDetail
    const out: Record<string, boolean> = {}
    if (!specs?.length) return out
    for (const e of specs) {
      const sc = relationOptionFetchScopeForCrudInline(
        parentSlug,
        e.relatedEntitySlug,
        detailPayload,
        adminEntities,
        parentCrudForm,
      )
      out[e.relatedEntitySlug] = sc.mode === "wait"
    }
    return out
  }, [
    adminEntities,
    detailPayload,
    parentCrudForm,
    parentSlug,
    relationScopeFormTickle,
  ])

  const crudRelatedRelationOptionsByColumnKey = useMemo(() => {
    const byKey: Record<
      string,
      {
        options: { value: string; label: string }[]
        optionsPending: boolean
        rawListRows: Record<string, unknown>[]
      }
    > = {}
    if (!childCfg) return byKey
    for (const k of collection.inlineEditableColumnKeys) {
      const col = childCfg.columns.find((c) => c.key === k)
      const listRel = col?.listRelation
      if (!listRel) continue
      const qIdx = relationSlugsForInline.indexOf(listRel.relatedEntitySlug)
      const q = qIdx >= 0 ? relationInlineOptionsQueries[qIdx] : undefined
      const rawItems = (q?.data?.list.items ?? []) as Record<string, unknown>[]
      const idKey = q?.data?.idKey ?? ""
      const relCfgForLabels = adminEntities[listRel.relatedEntitySlug]
      const relatedColumns = relCfgForLabels?.columns
      const optionsBase = rawItems
        .map((row) => {
          const id = row[idKey]
          if (id == null) return null
          const value = String(id)
          const label = adminEntityRelationOptionLabel(
            row,
            listRel.labelColumnKeys,
            relatedColumns,
          )
          return { value, label: label.length > 0 ? label : value }
        })
        .filter((x): x is { value: string; label: string } => x != null)
      byKey[k] = {
        options: optionsBase,
        optionsPending: q?.isPending ?? false,
        rawListRows: rawItems,
      }
    }
    return byKey
  }, [
    adminEntities,
    childCfg,
    collection.inlineEditableColumnKeys,
    relationInlineOptionsQueries,
    relationSlugsForInline,
  ])

  const relationNumericMaps = useMemo((): AdminRelatedRelationNumericMaps => {
    const maps = new Map<string, Map<string, number>>()
    if (!childCfg) return maps
    const virtuals = collection.inlineVirtualColumns ?? []
    const seen = new Set<string>()
    for (const f of relatedVirtualFactors(virtuals)) {
      if (f.kind !== "relationNumeric") continue
      const cacheKey = relationNumericLookupCacheKey(
        f.fkColumnKey,
        f.relatedNumericColumnKey,
      )
      if (seen.has(cacheKey)) continue
      seen.add(cacheKey)
      const col = childCfg.columns.find((c) => c.key === f.fkColumnKey)
      const lr = col?.listRelation
      if (!lr) continue
      const qIdx = relationSlugsForInline.indexOf(lr.relatedEntitySlug)
      const q = qIdx >= 0 ? relationInlineOptionsQueries[qIdx] : undefined
      const rawItems = (q?.data?.list.items ?? []) as Record<string, unknown>[]
      const relCfg = adminEntities[lr.relatedEntitySlug]
      const idKey = relCfg?.idColumn.jsonKey ?? ""
      if (!idKey) continue
      const inner = buildRelationNumericLookupMap(
        rawItems,
        idKey,
        f.relatedNumericColumnKey,
      )
      maps.set(cacheKey, new Map(inner))
    }
    return maps
  }, [
    adminEntities,
    childCfg,
    collection.inlineVirtualColumns,
    relationInlineOptionsQueries,
    relationSlugsForInline,
  ])

  return {
    crudRelatedRelationOptionsByColumnKey,
    relationNumericMaps,
    relationAsyncFilterSelectionsByRelatedSlug,
    crudInlineRelationAwaitingParentDetailByRelatedSlug,
  }
}
