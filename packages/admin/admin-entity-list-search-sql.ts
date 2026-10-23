import {
  and,
  eq,
  exists,
  getTableColumns,
  or,
  sql,
  type SQL,
} from "drizzle-orm"
import type { PgColumn } from "drizzle-orm/pg-core"

import { escapeAdminEntityIlikePattern } from "./admin-entity-list-search-pattern"
import { adminEntityTableForSlug } from "./admin-entity-list-sql-context"
import type {
  AdminEntityDefinition,
  AdminEntityListServerContext,
} from "./admin-entity-types"

/**
 * Builds the list `search` query fragment (OR of ILIKE on main text columns + optional EXISTS from
 * `listSearch.relatedTextSearch`). Empty `searchTrimmed` → `undefined`.
 */
export function buildAdminEntityListSearchSql(
  ctx: AdminEntityListServerContext,
  slug: string,
  searchTrimmed: string,
): SQL | undefined {
  if (searchTrimmed === "") return undefined
  const cfg = ctx.entities[slug] as AdminEntityDefinition
  const spec = cfg.listSearch
  if (!spec) return undefined
  const table = adminEntityTableForSlug(ctx.tables, slug)
  const cols = getTableColumns(table)
  const pattern = `%${escapeAdminEntityIlikePattern(searchTrimmed)}%`
  const words = searchTrimmed.split(/\s+/).filter(Boolean)
  const wordSplitSet = new Set(spec.wordSplitColumnKeys ?? [])
  const branches: SQL[] = []

  for (const columnKey of spec.columnKeys) {
    const meta = cfg.columns.find((c) => c.key === columnKey)
    const col = cols[columnKey as keyof typeof cols] as PgColumn | undefined
    if (!meta || col == null) continue
    if (meta.valueType !== "text") continue
    if (wordSplitSet.has(columnKey) && words.length > 1) {
      const wordClauses = words.map((w) => {
        const p = `%${escapeAdminEntityIlikePattern(w)}%`
        return sql`${col} ILIKE ${p} ESCAPE '\\'`
      })
      branches.push(and(...wordClauses)!)
    } else {
      branches.push(sql`${col} ILIKE ${pattern} ESCAPE '\\'`)
    }
  }

  for (const relSpec of spec.relatedTextSearch ?? []) {
    const fkCol = cols[relSpec.fkColumnKey as keyof typeof cols] as
      | PgColumn
      | undefined
    if (fkCol == null) continue
    const relTable = adminEntityTableForSlug(
      ctx.tables,
      relSpec.relatedEntitySlug,
    )
    const relCfg = ctx.entities[
      relSpec.relatedEntitySlug
    ] as AdminEntityDefinition | undefined
    if (!relCfg) continue
    const relCols = getTableColumns(relTable)

    let joinOnRelatedAndMain: SQL | undefined
    if (relSpec.relatedFkToParentColumnKey) {
      const relParentFk = relCols[
        relSpec.relatedFkToParentColumnKey as keyof typeof relCols
      ] as PgColumn | undefined
      if (relParentFk == null) continue
      joinOnRelatedAndMain = eq(relParentFk, fkCol)
    } else {
      const relPkKey = relCfg.idColumn.jsonKey
      const relPkCol = relCols[relPkKey as keyof typeof relCols] as
        | PgColumn
        | undefined
      if (relPkCol == null) continue
      joinOnRelatedAndMain = eq(relPkCol, fkCol)
    }

    const ilikes: SQL[] = []
    for (const rk of relSpec.relatedColumnKeys) {
      const rMeta = relCfg.columns.find((c) => c.key === rk)
      const rCol = relCols[rk as keyof typeof relCols] as PgColumn | undefined
      if (!rMeta || rCol == null) continue
      if (rMeta.valueType !== "text") continue
      ilikes.push(
        sql`COALESCE(${rCol}::text, '') ILIKE ${pattern} ESCAPE '\\'`,
      )
    }
    if (ilikes.length === 0) continue

    const innerMatch =
      ilikes.length === 1 ? ilikes[0]! : or(...ilikes)!
    const subq = ctx.db
      .select()
      .from(relTable as never)
      .where(and(joinOnRelatedAndMain, innerMatch))
    branches.push(exists(subq))
  }

  if (branches.length === 0) return undefined
  return branches.length === 1 ? branches[0]! : or(...branches)!
}
