"use client"

import { useQueries } from "@tanstack/react-query"
import { useMemo } from "react"

import { adminEntityFormColumnsInOrder } from "../../admin-entity-form-column-order"
import {
  ADMIN_ENTITY_RELATION_FILTER_OPTIONS_STALE_MS,
  adminEntityRelationFilterOptionsQueryKey,
  fetchAdminEntityRelationFilterOptions,
  serializeRelationFilterOptionsQueryExtras,
  type AdminEntityRelationFilterOptionsResult,
} from "../../admin-entity-relation-filter-options-query"
import { adminEntityRelationOptionLabel } from "../../admin-entity-relation-filter-option-label"
import type { AdminEntityCrudListRelationFieldOptionsMap } from "../../admin-entity-crud-relation-field-options-types"
import { useAdminClientRegistry } from "../../admin-client-registry-context"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type { AdminEntityColumn } from "../../admin-entity-types"

type ScopeSpec = {
  parentFkColumnKey: string
  relatedSlug: AdminEntitySlug
  relatedFilterColumnKey: string
}

function scopeSpecByFkColumn(
  cols: readonly AdminEntityColumn[],
): Map<string, ScopeSpec> {
  const m = new Map<string, ScopeSpec>()
  for (const col of cols) {
    const lr = col.listRelation
    if (!lr?.crudRelationFilterFromFormColumnKey) continue
    const relatedFilterColumnKey =
      lr.crudRelationFilterRelatedColumnKey ??
      lr.crudRelationFilterFromFormColumnKey
    m.set(col.key, {
      parentFkColumnKey: lr.crudRelationFilterFromFormColumnKey,
      relatedSlug: lr.relatedEntitySlug as AdminEntitySlug,
      relatedFilterColumnKey,
    })
  }
  return m
}

/**
 * Like the list-page relation option map, but overrides FK columns that declare
 * `listRelation.crudRelationFilterFromFormColumnKey` using the current form values.
 */
export function useAdminEntityCrudRelationFieldOptionsMerged(
  slug: AdminEntitySlug,
  mode: "create" | "patch",
  baseOptions: AdminEntityCrudListRelationFieldOptionsMap,
  formValues: Record<string, string>,
): AdminEntityCrudListRelationFieldOptionsMap {
  const { adminEntities, loadAdminEntityDefinition } = useAdminClientRegistry()
  const cfg = adminEntities[slug]

  const formCols = useMemo(
    () => adminEntityFormColumnsInOrder(cfg, mode),
    [cfg, mode],
  )

  const scopeByFkCol = useMemo(() => scopeSpecByFkColumn(formCols), [formCols])

  const scopedRows = useMemo(() => {
    return [...scopeByFkCol.entries()].map(([colKey, spec]) => ({
      colKey,
      spec,
      filterValue: (formValues[spec.parentFkColumnKey] ?? "").trim(),
    }))
  }, [scopeByFkCol, formValues])

  const queries = useQueries({
    queries: scopedRows.map(({ spec, filterValue }) => ({
      queryKey: adminEntityRelationFilterOptionsQueryKey(
        spec.relatedSlug,
        filterValue
          ? { [spec.relatedFilterColumnKey]: filterValue }
          : undefined,
        undefined,
        serializeRelationFilterOptionsQueryExtras(),
      ),
      enabled: filterValue.length > 0,
      staleTime: ADMIN_ENTITY_RELATION_FILTER_OPTIONS_STALE_MS,
      queryFn: () =>
        fetchAdminEntityRelationFilterOptions(
          spec.relatedSlug,
          loadAdminEntityDefinition,
          {
            relationFilterSelections: {
              [spec.relatedFilterColumnKey]: filterValue,
            },
          },
        ),
    })),
  })

  return useMemo(() => {
    const out: AdminEntityCrudListRelationFieldOptionsMap = { ...baseOptions }
    scopedRows.forEach(({ colKey, spec, filterValue }, i) => {
      const col = formCols.find((c) => c.key === colKey)
      const listRel = col?.listRelation
      if (!listRel) return
      if (!filterValue) {
        out[colKey] = {
          options: [],
          optionsPending: false,
        }
        return
      }
      const q = queries[i]
      const relData = q?.data as AdminEntityRelationFilterOptionsResult | undefined
      const rawItems = (relData?.list.items ?? []) as Record<string, unknown>[]
      const idKey = relData?.idKey ?? ""
      const relCfgForLabels = adminEntities[spec.relatedSlug]
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
      out[colKey] = {
        options: optionsBase,
        optionsPending: q?.isPending ?? false,
      }
    })
    return out
  }, [adminEntities, baseOptions, formCols, queries, scopedRows])
}

export function adminEntityCrudRelationSelectDisabledByFormScope(
  col: AdminEntityColumn,
  formValues: Record<string, string>,
): boolean {
  const lr = col.listRelation
  if (!lr?.crudRelationFilterFromFormColumnKey) return false
  return (
    (formValues[lr.crudRelationFilterFromFormColumnKey] ?? "").trim() === ""
  )
}
