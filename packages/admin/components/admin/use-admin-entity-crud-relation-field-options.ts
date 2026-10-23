"use client"

import { useQueries } from "@tanstack/react-query"
import { useMemo } from "react"

import { adminEntityFormColumnsInOrder } from "../../admin-entity-form-column-order"
import {
  ADMIN_ENTITY_RELATION_FILTER_OPTIONS_STALE_MS,
  adminEntityRelationFilterOptionsQueryKey,
  fetchAdminEntityRelationFilterOptions,
  type AdminEntityRelationFilterOptionsResult,
} from "../../admin-entity-relation-filter-options-query"
import { adminEntityRelationOptionLabel } from "../../admin-entity-relation-filter-option-label"
import {
  collectAdminRelationOptionPreloadSpecs,
  listRelPreloadFetchOptions,
  relationOptionPreloadQueryIndexForListRel,
  relationOptionPreloadQueryIndexForManyForm,
} from "../../admin-entity-relation-option-preload-specs"
import { adminEntityColumnShowsManyRelationForm } from "../../admin-entity-many-relation-form"
import { useAdminClientRegistry } from "../../admin-client-registry-context"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type { AdminEntityColumn } from "../../admin-entity-types"

type ListRelationNonAsync = NonNullable<AdminEntityColumn["listRelation"]>

/**
 * Relation dropdown options for one entity’s create + patch CRUD columns (same data as the main
 * admin list hook, without list URL / table state).
 */
export function useAdminEntityCrudRelationFieldOptions(slug: AdminEntitySlug) {
  const { adminEntities, loadAdminEntityDefinition } = useAdminClientRegistry()
  const cfg = adminEntities[slug]

  const createCols = useMemo(
    () => adminEntityFormColumnsInOrder(cfg, "create"),
    [cfg],
  )
  const patchCols = useMemo(
    () => adminEntityFormColumnsInOrder(cfg, "patch"),
    [cfg],
  )

  const relationOptionPreloadSpecs = useMemo(
    () =>
      collectAdminRelationOptionPreloadSpecs({
        slug,
        cfg,
        adminEntities,
        listRelationFilterSpecsAll: [],
        listManyRelationFilterSpecs: [],
        includeCrudFormRelationColumns: true,
      }),
    [adminEntities, cfg, slug],
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

  return useMemo(() => {
    const byKey: Record<
      string,
      {
        options: { value: string; label: string }[]
        optionsPending: boolean
        rawListRows?: Record<string, unknown>[]
      }
    > = {}
    const queryForListRel = (listRel: ListRelationNonAsync) => {
      const qIdx = relationOptionPreloadQueryIndexForListRel(
        relationOptionPreloadSpecs,
        listRel,
      )
      return qIdx >= 0 ? relationFilterOptionsQueries[qIdx] : undefined
    }
    const ingest = (cols: readonly AdminEntityColumn[]) => {
      for (const col of cols) {
        const listRel = col.listRelation
        if (!listRel) continue
        if (listRel.crudFormUiVariant === "asyncSearch") continue
        const relSlug = listRel.relatedEntitySlug as AdminEntitySlug
        const q = queryForListRel(listRel)
        const relData = q?.data as AdminEntityRelationFilterOptionsResult | undefined
        const rawItems = (relData?.list.items ?? []) as Record<
          string,
          unknown
        >[]
        const idKey = relData?.idKey ?? ""
        const relCfgForLabels = adminEntities[relSlug]
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
        byKey[col.key] = {
          options: optionsBase,
          optionsPending: q?.isPending ?? false,
          // Expose preloaded rows so a custom form body can read embedded fields (description,
          // unit, …) for the selected FK without a per-select GET /api/admin/<rel>/<id>.
          rawListRows: rawItems,
        }
      }
    }
    const ingestMany = (cols: readonly AdminEntityColumn[]) => {
      for (const col of cols) {
        const many = col.listManyRelation
        if (
          !many ||
          !adminEntityColumnShowsManyRelationForm(slug, col, adminEntities)
        )
          continue
        const relSlug = many.relatedEntitySlug as AdminEntitySlug
        const qIdx = relationOptionPreloadQueryIndexForManyForm(
          relationOptionPreloadSpecs,
          relSlug,
        )
        const q = qIdx >= 0 ? relationFilterOptionsQueries[qIdx] : undefined
        const relData = q?.data as AdminEntityRelationFilterOptionsResult | undefined
        const rawItems = (relData?.list.items ?? []) as Record<
          string,
          unknown
        >[]
        const idKey = relData?.idKey ?? ""
        const relCfgForLabels = adminEntities[relSlug]
        const relatedColumns = relCfgForLabels?.columns
        const optionsBase = rawItems
          .map((row) => {
            const id = row[idKey]
            if (id == null) return null
            const value = String(id)
            const label = adminEntityRelationOptionLabel(
              row,
              many.labelColumnKeys,
              relatedColumns,
            )
            return { value, label: label.length > 0 ? label : value }
          })
          .filter((x): x is { value: string; label: string } => x != null)
        byKey[col.key] = {
          options: optionsBase,
          optionsPending: q?.isPending ?? false,
        }
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
    relationFilterOptionsQueries,
    relationOptionPreloadSpecs,
    slug,
  ])
}
