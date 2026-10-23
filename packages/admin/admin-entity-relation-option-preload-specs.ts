import { adminEntityFormColumnsInOrder } from "./admin-entity-form-column-order"
import { adminEntityColumnShowsManyRelationForm } from "./admin-entity-many-relation-form"
import {
  fetchAdminEntityRelationFilterOptions,
  serializeRelationFilterOptionsQueryExtras,
} from "./admin-entity-relation-filter-options-query"
import type { AdminEntitySlug } from "./admin-entity-slug-client"
import type {
  AdminEntityColumn,
  AdminEntityDefinition,
  AdminEntityListManyRelationFilterSpec,
  AdminEntityListRelationFilterSpec,
} from "./admin-entity-types"

type ListRelationNonAsync = NonNullable<AdminEntityColumn["listRelation"]>

export function listRelPreloadFetchOptions(listRel: ListRelationNonAsync): {
  appendWhereHints?: Record<string, string>
  fetchAllPages: boolean
  limit?: number
} {
  if (listRel.crudFormUiVariant === "asyncSearch") {
    return { fetchAllPages: false }
  }
  const hints = listRel.crudRelationPreloadAppendWhereHints
  const norm =
    hints != null && Object.keys(hints).length > 0
      ? { ...hints }
      : undefined
  const out: {
    appendWhereHints?: Record<string, string>
    fetchAllPages: boolean
    limit?: number
  } = {
    fetchAllPages: listRel.crudRelationPreloadAllPages === true,
  }
  if (norm != null) out.appendWhereHints = norm
  const lim = listRel.crudRelationPreloadFetchLimit
  if (lim != null && Number.isFinite(lim)) out.limit = lim
  return out
}

export function fetchOptionsFromPreloadExtras(extras: {
  appendWhereHints?: Record<string, string>
  fetchAllPages: boolean
  limit?: number
}): Parameters<typeof fetchAdminEntityRelationFilterOptions>[2] {
  return {
    ...(extras.appendWhereHints != null
      ? { appendWhereHints: extras.appendWhereHints }
      : {}),
    ...(extras.fetchAllPages ? { fetchAllPages: true } : {}),
    ...(extras.limit != null ? { limit: extras.limit } : {}),
  }
}

export type AdminRelationOptionPreloadSpec = {
  readonly key: string
  readonly relatedSlug: AdminEntitySlug
  readonly fetchOptions: Parameters<
    typeof fetchAdminEntityRelationFilterOptions
  >[2]
  readonly extrasSerialized: string
}

/**
 * Deduped relation-list prefetch specs for React Query (list toolbar filters + CRUD FK / many
 * selects). Keys must stay aligned with {@link serializeRelationFilterOptionsQueryExtras}.
 */
export function collectAdminRelationOptionPreloadSpecs(input: {
  readonly slug: AdminEntitySlug
  readonly cfg: AdminEntityDefinition
  readonly adminEntities: Readonly<Record<string, AdminEntityDefinition>>
  readonly listRelationFilterSpecsAll: readonly AdminEntityListRelationFilterSpec[]
  readonly listManyRelationFilterSpecs: readonly AdminEntityListManyRelationFilterSpec[]
  /** When false, only list-toolbar + many-filter specs are collected (unused today). */
  readonly includeCrudFormRelationColumns: boolean
}): AdminRelationOptionPreloadSpec[] {
  const {
    slug,
    cfg,
    adminEntities,
    listRelationFilterSpecsAll,
    listManyRelationFilterSpecs,
    includeCrudFormRelationColumns,
  } = input

  const byKey = new Map<string, AdminRelationOptionPreloadSpec>()
  const addSpec = (
    relSlug: AdminEntitySlug,
    extras: ReturnType<typeof listRelPreloadFetchOptions> | { fetchAllPages: false },
  ) => {
    const fo = fetchOptionsFromPreloadExtras(extras)
    const extrasSerialized = serializeRelationFilterOptionsQueryExtras(extras)
    const key = `${relSlug}|${extrasSerialized}`
    if (!byKey.has(key)) {
      byKey.set(key, {
        key,
        relatedSlug: relSlug,
        fetchOptions: fo,
        extrasSerialized,
      })
    }
  }

  for (const spec of listRelationFilterSpecsAll) {
    const col = cfg.columns.find((c) => c.key === spec.columnKey)
    const listRel = col?.listRelation
    if (!listRel) continue
    if (spec.uiVariant === "asyncSearch") continue
    addSpec(listRel.relatedEntitySlug as AdminEntitySlug, listRelPreloadFetchOptions(listRel))
  }

  for (const spec of listManyRelationFilterSpecs) {
    const col = cfg.columns.find((c) => c.key === spec.manyRelationColumnKey)
    const many = col?.listManyRelation
    if (!many) continue
    if (!adminEntityColumnShowsManyRelationForm(slug, col, adminEntities)) continue
    addSpec(many.relatedEntitySlug as AdminEntitySlug, { fetchAllPages: false })
  }

  if (includeCrudFormRelationColumns) {
    for (const mode of ["create", "patch"] as const) {
      const cols = adminEntityFormColumnsInOrder(cfg, mode)
      for (const col of cols) {
        const listRel = col.listRelation
        if (!listRel) continue
        if (listRel.crudFormUiVariant === "asyncSearch") continue
        addSpec(
          listRel.relatedEntitySlug as AdminEntitySlug,
          listRelPreloadFetchOptions(listRel),
        )
      }
      for (const col of cols) {
        const many = col.listManyRelation
        if (
          !many ||
          !adminEntityColumnShowsManyRelationForm(slug, col, adminEntities)
        )
          continue
        addSpec(many.relatedEntitySlug as AdminEntitySlug, { fetchAllPages: false })
      }
    }
  }

  return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key))
}

export function relationOptionPreloadQueryIndexForListRel(
  specs: readonly AdminRelationOptionPreloadSpec[],
  listRel: ListRelationNonAsync,
): number {
  const relSlug = listRel.relatedEntitySlug as AdminEntitySlug
  const extras = listRelPreloadFetchOptions(listRel)
  const sk = `${relSlug}|${serializeRelationFilterOptionsQueryExtras(extras)}`
  return specs.findIndex((s) => s.key === sk)
}

export function relationOptionPreloadQueryIndexForManyForm(
  specs: readonly AdminRelationOptionPreloadSpec[],
  relatedSlug: AdminEntitySlug,
): number {
  const extras = { fetchAllPages: false as const }
  const sk = `${relatedSlug}|${serializeRelationFilterOptionsQueryExtras(extras)}`
  return specs.findIndex((s) => s.key === sk)
}
