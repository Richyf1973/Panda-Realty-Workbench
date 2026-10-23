"use client"

import { useMemo } from "react"
import { useQueries } from "@tanstack/react-query"

import {
  ADMIN_ENTITY_RELATION_FILTER_OPTIONS_STALE_MS,
  adminEntityRelationFilterOptionsQueryKey,
  fetchAdminEntityRelationFilterOptions,
  serializeRelationFilterOptionsQueryExtras,
} from "../../admin-entity-relation-filter-options-query"
import {
  collectAdminRelationOptionPreloadSpecs,
  relationOptionPreloadQueryIndexForListRel,
  relationOptionPreloadQueryIndexForManyForm,
} from "../../admin-entity-relation-option-preload-specs"
import { adminEntityRelationOptionLabel } from "../../admin-entity-relation-filter-option-label"
import { adminEntityColumnShowsManyRelationForm } from "../../admin-entity-many-relation-form"
import type {
  AdminEntityColumn,
  AdminEntityDefinition,
  AdminEntityListManyRelationFilterSpec,
  AdminEntityListRelationFilterSpec,
} from "../../admin-entity-types"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import { useAdminClientRegistry } from "../../admin-client-registry-context"

type RelationOptionEntry = {
  options: { value: string; label: string }[]
  optionsPending: boolean
}

/**
 * Runs preloaded relation option queries for the list toolbar filters and CRUD FK/many selects,
 * and derives `crudListRelationFieldOptions` from the query results.
 *
 * Returns the raw query arrays so the caller can also derive `listRelationFilterRows`.
 */
export function useAdminEntityRelationOptionData({
  slug,
  cfg,
  createCols,
  patchCols,
  listRelationFilterSpecsAll,
  listManyRelationFilterSpecs,
  scopedRelationFilterSpecs,
  listYearMonthFilterEnabled,
  listYearMonthFilterParam,
  listYearMonthPeriod,
}: {
  slug: AdminEntitySlug
  cfg: AdminEntityDefinition
  createCols: readonly AdminEntityColumn[]
  patchCols: readonly AdminEntityColumn[]
  listRelationFilterSpecsAll: readonly AdminEntityListRelationFilterSpec[]
  listManyRelationFilterSpecs: readonly AdminEntityListManyRelationFilterSpec[]
  scopedRelationFilterSpecs: readonly AdminEntityListRelationFilterSpec[]
  listYearMonthFilterEnabled: boolean
  listYearMonthFilterParam: string
  listYearMonthPeriod: string
}) {
  const { adminEntities, loadAdminEntityDefinition } = useAdminClientRegistry()

  const relationOptionPreloadSpecs = useMemo(
    () =>
      collectAdminRelationOptionPreloadSpecs({
        slug,
        cfg,
        adminEntities,
        listRelationFilterSpecsAll,
        listManyRelationFilterSpecs,
        includeCrudFormRelationColumns: true,
      }),
    [adminEntities, cfg, listManyRelationFilterSpecs, listRelationFilterSpecsAll, slug],
  )

  const relationFilterOptionsQueries = useQueries({
    queries: relationOptionPreloadSpecs.map((spec) => ({
      queryKey: adminEntityRelationFilterOptionsQueryKey(
        spec.relatedSlug,
        undefined,
        undefined,
        spec.extrasSerialized,
      ),
      enabled: relationOptionPreloadSpecs.length > 0,
      staleTime: ADMIN_ENTITY_RELATION_FILTER_OPTIONS_STALE_MS,
      queryFn: () =>
        fetchAdminEntityRelationFilterOptions(
          spec.relatedSlug,
          loadAdminEntityDefinition,
          spec.fetchOptions,
        ),
    })),
  })

  const scopedRelationFilterOptionsQueries = useQueries({
    queries: scopedRelationFilterSpecs.map((spec) => {
      const col = cfg.columns.find((c) => c.key === spec.columnKey)
      const relSlug = col?.listRelation?.relatedEntitySlug as AdminEntitySlug | undefined
      const period = listYearMonthPeriod.trim()
      const enabled =
        listYearMonthFilterEnabled && period !== "" && relSlug != null
      return {
        queryKey: adminEntityRelationFilterOptionsQueryKey(
          relSlug ?? "__missing-related-slug__",
          undefined,
          enabled && relSlug
            ? { param: listYearMonthFilterParam, value: period }
            : undefined,
          serializeRelationFilterOptionsQueryExtras(),
        ),
        enabled,
        staleTime: ADMIN_ENTITY_RELATION_FILTER_OPTIONS_STALE_MS,
        queryFn: () => {
          if (!relSlug) {
            throw new Error(
              "[scopedRelationFilterOptionsQueries] missing listRelation.relatedEntitySlug",
            )
          }
          return fetchAdminEntityRelationFilterOptions(relSlug, loadAdminEntityDefinition, {
            reportingPeriodScopeParam: listYearMonthFilterParam,
            reportingPeriodScopeValue: period,
          })
        },
      }
    }),
  })

  const crudListRelationFieldOptions = useMemo(() => {
    const byKey: Record<string, RelationOptionEntry> = {}

    const ingest = (cols: readonly AdminEntityColumn[]) => {
      for (const col of cols) {
        const listRel = col.listRelation
        if (!listRel) continue
        if (listRel.crudFormUiVariant === "asyncSearch") continue
        const relSlug = listRel.relatedEntitySlug as AdminEntitySlug
        const qIdx = relationOptionPreloadQueryIndexForListRel(
          relationOptionPreloadSpecs,
          listRel,
        )
        const q = qIdx >= 0 ? relationFilterOptionsQueries[qIdx] : undefined
        const rawItems = (q?.data?.list.items ?? []) as Record<string, unknown>[]
        const idKey = q?.data?.idKey ?? ""
        const relCfgForLabels = adminEntities[relSlug]
        const relatedColumns = relCfgForLabels?.columns
        const options = rawItems
          .map((row) => {
            const id = row[idKey]
            if (id == null) return null
            const value = String(id)
            const label = adminEntityRelationOptionLabel(row, listRel.labelColumnKeys, relatedColumns)
            const namePart = label.trim() !== "" ? label.trim() : value
            const displayLabel =
              listRel.crudAsyncSearchCompoundIdAndLabel === true
                ? `${value} - ${namePart}`
                : namePart.length > 0
                  ? namePart
                  : value
            return { value, label: displayLabel }
          })
          .filter((x): x is { value: string; label: string } => x != null)
        byKey[col.key] = { options, optionsPending: q?.isPending ?? false }
      }
    }

    const ingestMany = (cols: readonly AdminEntityColumn[]) => {
      for (const col of cols) {
        const many = col.listManyRelation
        if (!many || !adminEntityColumnShowsManyRelationForm(slug, col, adminEntities)) continue
        const relSlug = many.relatedEntitySlug as AdminEntitySlug
        const qIdx = relationOptionPreloadQueryIndexForManyForm(
          relationOptionPreloadSpecs,
          relSlug,
        )
        const q = qIdx >= 0 ? relationFilterOptionsQueries[qIdx] : undefined
        const rawItems = (q?.data?.list.items ?? []) as Record<string, unknown>[]
        const idKey = q?.data?.idKey ?? ""
        const relCfgForLabels = adminEntities[relSlug]
        const relatedColumns = relCfgForLabels?.columns
        const options = rawItems
          .map((row) => {
            const id = row[idKey]
            if (id == null) return null
            const value = String(id)
            const label = adminEntityRelationOptionLabel(row, many.labelColumnKeys, relatedColumns)
            return { value, label: label.length > 0 ? label : value }
          })
          .filter((x): x is { value: string; label: string } => x != null)
        byKey[col.key] = { options, optionsPending: q?.isPending ?? false }
      }
    }

    ingest(createCols)
    ingest(patchCols)
    ingestMany(createCols)
    ingestMany(patchCols)
    return byKey
  }, [
    adminEntities,
    createCols,
    patchCols,
    relationOptionPreloadSpecs,
    relationFilterOptionsQueries,
    slug,
  ])

  return {
    relationOptionPreloadSpecs,
    relationFilterOptionsQueries,
    scopedRelationFilterOptionsQueries,
    crudListRelationFieldOptions,
  }
}
