import "server-only"

import { getTableColumns, inArray } from "drizzle-orm"
import type { PgColumn } from "drizzle-orm/pg-core"
import type { PgTable } from "drizzle-orm/pg-core"

import { mergeListVirtualColumnsIntoApiRow } from "./admin-entity-list-virtual-row-merge"
import { stripAdminEntityApiRow } from "./admin-entity-list-response-strip"
import type {
  AdminEntityDefinition,
  AdminEntityQueryServerContext,
  AdminDrizzleDb,
} from "./admin-entity-types"

function slugInEntities(
  entities: Readonly<Record<string, AdminEntityDefinition>>,
  s: string,
): boolean {
  return Object.hasOwn(entities, s)
}

/**
 * Batch-loads `listRelation` embed JSON for raw table rows (e.g. nested `crudRelatedCollections`
 * loaded via `select().from(childTable)` without list JOINs). Matches list/detail shapes that use
 * `buildAdminEntityListSqlContext` joins.
 */
export async function mergeListRelationEmbedsIntoRows(
  ctx: Pick<AdminEntityQueryServerContext, "entities" | "tables">,
  slug: string,
  rows: Record<string, unknown>[],
  exec: AdminDrizzleDb,
): Promise<Record<string, unknown>[]> {
  const cfg = ctx.entities[slug] as AdminEntityDefinition | undefined
  const table = ctx.tables[slug]
  if (!cfg || !table || rows.length === 0) return rows

  let out = rows.map((r) => ({ ...r }))
  const mainCols = getTableColumns(table)

  for (const col of cfg.columns) {
    if (!col.list || !col.listRelation) continue
    const rel = col.listRelation
    if (!slugInEntities(ctx.entities, rel.relatedEntitySlug)) continue
    const relatedCfg = ctx.entities[
      rel.relatedEntitySlug
    ] as AdminEntityDefinition
    const relatedTable = ctx.tables[rel.relatedEntitySlug]
    if (!relatedTable) continue

    const fkCol = mainCols[col.key as keyof typeof mainCols] as
      | PgColumn
      | undefined
    const relatedCols = getTableColumns(relatedTable)
    const relIdKey = relatedCfg.idColumn.jsonKey
    const relIdCol = relatedCols[relIdKey as keyof typeof relatedCols] as
      | PgColumn
      | undefined
    if (!fkCol || !relIdCol) continue

    const idVT = relatedCfg.idColumn.valueType
    const normalizeFk = (raw: unknown): string | number | null => {
      if (raw == null || raw === "") return null
      if (idVT === "integer") {
        const n =
          typeof raw === "number" ? raw : Number(String(raw).trim())
        return Number.isFinite(n) ? n : null
      }
      return String(raw)
    }

    const ids = [
      ...new Set(
        out
          .map((r) => normalizeFk(r[col.key]))
          .filter((v): v is string | number => v != null),
      ),
    ]

    if (ids.length === 0) {
      out = out.map((r) => ({ ...r, [rel.embedJsonKey]: null }))
      continue
    }

    const relatedRows = await exec
      .select()
      .from(relatedTable)
      .where(inArray(relIdCol, ids as never))

    const byId = new Map<string | number, Record<string, unknown>>()
    for (const rr of relatedRows) {
      const raw = rr as Record<string, unknown>
      const kid = normalizeFk(raw[relIdKey])
      if (kid == null) continue
      byId.set(
        kid,
        mergeListVirtualColumnsIntoApiRow(
          relatedCfg,
          stripAdminEntityApiRow(raw, relatedCfg, relatedTable as PgTable),
        ),
      )
    }

    out = out.map((r) => {
      const fk = normalizeFk(r[col.key])
      const embed = fk != null ? (byId.get(fk) ?? null) : null
      return { ...r, [rel.embedJsonKey]: embed }
    })
  }

  return out
}
