import "server-only"

import { asc, getTableColumns, inArray } from "drizzle-orm"
import type { PgColumn } from "drizzle-orm/pg-core"

import { mergeListChildSumsIntoRows } from "./admin-entity-list-child-sum"
import { mergeListRelationEmbedsIntoRows } from "./admin-entity-list-relation-embed-merge"
import type {
  AdminEntityDefinition,
  AdminEntityListServerContext,
  AdminEntityQueryServerContext,
} from "./admin-entity-types"
import { isAdminEntityCrudRelatedCollectionTable } from "./admin-entity-types"
import {
  shapeAdminEntityRowForApi,
  resolveRelatedOrderBy,
  attachNestedCrudCollectionsToShapedChildRows,
} from "./admin-entity-detail-fetch"

export type { DbTransaction, DbExecutor } from "./admin-entity-detail-fetch"

// Re-export detail-fetch public surface so admin-entity-queries.ts can import from here
export {
  shapeAdminEntityRowForApi,
  resolveChildFkValueForRelatedCollection,
  fetchAdminEntityDetailForApiWithExecutor,
  attachNestedCrudCollectionsToShapedChildRows,
} from "./admin-entity-detail-fetch"

/**
 * Merges `crudRelatedCollections` child rows into each list item (same shape as GET detail),
 * using one query per collection for the current page's parent ids. Nested collections on a
 * child entity (e.g. payroll deductions under payroll lines) are loaded in one batched pass for
 * all child rows on the page, then split back per parent. Lets the admin table reuse list
 * payload when opening edit instead of refetching detail.
 */
export async function attachCrudRelatedCollectionsToAdminListItems(
  ctx: AdminEntityListServerContext,
  slug: string,
  items: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  const cfg = ctx.entities[slug] as AdminEntityDefinition | undefined
  const rel = cfg?.crudRelatedCollections
  if (!cfg || !rel?.length || items.length === 0) return items

  const idKey = cfg.idColumn.jsonKey
  const idVT = cfg.idColumn.valueType

  const toInArrayValue = (raw: unknown): string | number | null => {
    if (raw == null || raw === "") return null
    if (idVT === "integer") {
      const n = Number(raw)
      return Number.isFinite(n) ? n : null
    }
    return String(raw)
  }

  const parentIdsForIn = [
    ...new Set(
      items
        .map((it) => toInArrayValue(it[idKey]))
        .filter((v): v is string | number => v != null),
    ),
  ]

  if (parentIdsForIn.length === 0) return items

  const groupKey = (raw: unknown): string => {
    if (idVT === "integer") return String(Number(raw))
    return String(raw)
  }

  const queryLikeCtx = ctx as unknown as AdminEntityQueryServerContext
  const out = items.map((it) => ({ ...it }))

  for (const spec of rel) {
    if (!isAdminEntityCrudRelatedCollectionTable(spec)) continue
    const childSlug = spec.childEntitySlug
    const childTable = ctx.tables[childSlug]
    const childCfg = ctx.entities[childSlug]
    if (!childTable || !childCfg) continue
    const cols = getTableColumns(childTable)
    const fkCol = cols[
      spec.parentFkColumnKey as keyof typeof cols
    ] as PgColumn | undefined
    if (!fkCol) continue
    let orderExprs: ReturnType<typeof asc>[]
    try {
      orderExprs = resolveRelatedOrderBy(cols, spec, childCfg, childSlug)
    } catch {
      continue
    }

    const childRows = await ctx.db
      .select()
      .from(childTable)
      .where(inArray(fkCol, parentIdsForIn as never))
      .orderBy(asc(fkCol), ...orderExprs)

    const mergedChildRows = await mergeListChildSumsIntoRows(
      queryLikeCtx,
      childSlug,
      childRows as Record<string, unknown>[],
      ctx.db,
    )
    const mergedWithEmbeds = await mergeListRelationEmbedsIntoRows(
      queryLikeCtx,
      childSlug,
      mergedChildRows as Record<string, unknown>[],
      ctx.db,
    )

    /**
     * One nested pass for all rows on the page (avoids N round-trips per parent group).
     * Capture the parent FK key from the **unshaped** row before `shapeAdminEntityRowForApi`
     * strips it (FK columns with `list: false, patch: false` are removed during shaping).
     */
    const shapedFlat: Record<string, unknown>[] = []
    const shapedFkKeys: string[] = []
    for (const r of mergedWithEmbeds) {
      const shaped = shapeAdminEntityRowForApi(queryLikeCtx, childSlug, r)
      if (shaped) {
        shapedFkKeys.push(groupKey(r[spec.parentFkColumnKey]))
        shapedFlat.push(shaped)
      }
    }

    const enrichedFlat = await attachNestedCrudCollectionsToShapedChildRows(
      queryLikeCtx,
      ctx.db,
      childSlug,
      shapedFlat,
    )

    const grouped = new Map<string, Record<string, unknown>[]>()
    for (let i = 0; i < enrichedFlat.length; i++) {
      const k = shapedFkKeys[i]!
      const arr = grouped.get(k) ?? []
      arr.push(enrichedFlat[i]!)
      grouped.set(k, arr)
    }

    for (const it of out) {
      const k = groupKey(it[idKey])
      it[spec.jsonKey] = grouped.get(k) ?? []
    }
  }

  return out
}
