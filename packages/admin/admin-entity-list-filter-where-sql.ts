import "server-only"

import { and, eq, exists, getTableColumns, or, type SQL } from "drizzle-orm"
import type { PgColumn, PgTable } from "drizzle-orm/pg-core"

import type {
  AdminEntityDefinition,
  AdminEntityListServerContext,
} from "./admin-entity-types"
import { adminEntityTableForSlug } from "./admin-entity-list-sql-context"
import type { AdminRelationFilterApiValue } from "./admin-entity-relation-filter-value"

export function combineWhere(a: SQL | undefined, b: SQL | undefined): SQL | undefined {
  if (a && b) return and(a, b)
  return a ?? b
}

export function relationFilterScalars(
  v: AdminRelationFilterApiValue | undefined,
): (string | number)[] {
  if (v === undefined) return []
  if (typeof v === "string" || typeof v === "number") return [v]
  return [...v]
}

export function adminEntityListBooleanFilterSql(
  entities: AdminEntityListServerContext["entities"],
  slug: string,
  table: PgTable,
  value: boolean | undefined,
): SQL | undefined {
  if (value === undefined) return undefined
  const cfg = entities[slug] as AdminEntityDefinition
  const spec = cfg.listBooleanFilter
  if (!spec) return undefined
  const meta = cfg.columns.find((c) => c.key === spec.columnKey)
  if (!meta || meta.valueType !== "boolean") return undefined
  const cols = getTableColumns(table)
  const col = cols[spec.columnKey as keyof typeof cols] as PgColumn | undefined
  if (col == null) return undefined
  return eq(col, value)
}

export function adminEntityListRelationFiltersSql(
  entities: AdminEntityListServerContext["entities"],
  slug: string,
  table: PgTable,
  values: Readonly<Record<string, AdminRelationFilterApiValue>> | undefined,
): SQL | undefined {
  if (values == null || Object.keys(values).length === 0) return undefined
  const cfg = entities[slug] as AdminEntityDefinition
  const specs = cfg.listRelationFilters
  if (!specs?.length) return undefined
  const cols = getTableColumns(table)
  const parts: SQL[] = []
  for (const spec of specs) {
    const scalars = relationFilterScalars(values[spec.columnKey])
    if (scalars.length === 0) continue
    const meta = cfg.columns.find((c) => c.key === spec.columnKey)
    if (!meta?.listRelation) continue
    const col = cols[spec.columnKey as keyof typeof cols] as PgColumn | undefined
    if (col == null) continue
    const branches = scalars.map((val) => eq(col, val))
    parts.push(branches.length === 1 ? branches[0]! : or(...branches)!)
  }
  if (parts.length === 0) return undefined
  return parts.length === 1 ? parts[0]! : and(...parts)!
}

export function adminEntityListManyRelationFiltersSql(
  ctx: AdminEntityListServerContext,
  slug: string,
  table: PgTable,
  values: Readonly<Record<string, AdminRelationFilterApiValue>> | undefined,
): SQL | undefined {
  if (values == null || Object.keys(values).length === 0) return undefined
  const cfg = ctx.entities[slug] as AdminEntityDefinition
  const specs = cfg.listManyRelationFilters
  if (!specs?.length) return undefined
  const parentCols = getTableColumns(table)
  const parentPkKey = cfg.idColumn.jsonKey
  const parentPkCol = parentCols[
    parentPkKey as keyof typeof parentCols
  ] as PgColumn | undefined
  if (parentPkCol == null) return undefined

  const parts: SQL[] = []
  for (const spec of specs) {
    const scalars = relationFilterScalars(values[spec.manyRelationColumnKey])
    if (scalars.length === 0) continue
    const meta = cfg.columns.find((c) => c.key === spec.manyRelationColumnKey)
    const many = meta?.listManyRelation
    if (!many) continue

    const junctionTable = adminEntityTableForSlug(
      ctx.tables,
      many.junctionEntitySlug,
    )
    const jCols = getTableColumns(junctionTable)
    const jParent = jCols[
      many.junctionParentFkColumnKey as keyof typeof jCols
    ] as PgColumn | undefined
    const jRelated = jCols[
      many.junctionRelatedFkColumnKey as keyof typeof jCols
    ] as PgColumn | undefined
    if (jParent == null || jRelated == null) continue

    const relatedCfg = ctx.entities[many.relatedEntitySlug] as AdminEntityDefinition
    const idType = relatedCfg.idColumn.valueType

    const existsBranches: SQL[] = []
    for (const v of scalars) {
      if (idType === "integer" && typeof v !== "number") continue
      if (idType === "uuid" && typeof v !== "string") continue
      const subq = ctx.db
        .select()
        .from(junctionTable)
        .where(and(eq(jParent, parentPkCol), eq(jRelated, v)))
      existsBranches.push(exists(subq))
    }
    if (existsBranches.length === 0) continue
    parts.push(
      existsBranches.length === 1
        ? existsBranches[0]!
        : or(...existsBranches)!,
    )
  }
  if (parts.length === 0) return undefined
  return parts.length === 1 ? parts[0]! : and(...parts)!
}
