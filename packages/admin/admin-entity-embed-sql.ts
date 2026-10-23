import { eq, sql, type SQL } from "drizzle-orm"
import type { PgColumn } from "drizzle-orm/pg-core"
import type { PgTable } from "drizzle-orm/pg-core"

import { adminEntityListVirtualSubtractFromBaseRowSql } from "./admin-entity-list-virtual-subtract-sql"
import { jsonBuildObjectFromFlatSqlChunks } from "./admin-entity-json-build-object-sql"
import type { AdminEntityColumn, AdminEntityDefinition } from "./admin-entity-types"

function sqlJsonObjectKey(key: string): SQL {
  const escaped = key.replace(/'/g, "''")
  return sql.raw(`'${escaped}'`)
}

export { JSON_BUILD_OBJECT_MAX_PAIRS_PER_CALL } from "./admin-entity-pg-arg-limits"
export { jsonBuildObjectFromFlatSqlChunks } from "./admin-entity-json-build-object-sql"

/**
 * `json_build_object('a', col_a, ...)` with camelCase JSON keys matching Drizzle/TS names.
 */
export function jsonBuildObjectFromColumns(
  pairs: readonly { jsonKey: string; column: PgColumn }[],
): SQL {
  if (pairs.length === 0) {
    return sql`'{}'::json`
  }
  const flat: SQL[] = []
  for (const p of pairs) {
    flat.push(sqlJsonObjectKey(p.jsonKey), sql`${p.column}`)
  }
  return jsonBuildObjectFromFlatSqlChunks(flat)
}

function columnsForEntityJson(
  cfg: AdminEntityDefinition,
  cols: Record<string, PgColumn>,
): { jsonKey: string; column: PgColumn }[] {
  const out: { jsonKey: string; column: PgColumn }[] = []
  for (const col of cfg.columns) {
    if (col.listVirtual) continue
    const c = cols[col.key as keyof typeof cols] as PgColumn | undefined
    if (!c) continue
    out.push({ jsonKey: col.key, column: c })
  }
  return out
}

/**
 * List-only virtual column SQL for a single related row (same expressions as main list SELECT extras).
 * Omits {@link AdminEntityColumn.listVirtualRelationLabel} (needs extra joins).
 */
function listVirtualSqlForEmbedRow(
  entitySlug: string,
  cols: Record<string, PgColumn>,
  col: AdminEntityColumn,
): SQL | null {
  if (!col.list || !col.listVirtual) return null
  const pair = col.listYearMonthPair
  if (pair) {
    const yCol = cols[pair.yearColumnKey as keyof typeof cols] as
      | PgColumn
      | undefined
    const mCol = cols[pair.monthColumnKey as keyof typeof cols] as
      | PgColumn
      | undefined
    if (!yCol || !mCol) {
      throw new Error(
        `[listVirtualSqlForEmbedRow] ${entitySlug}.${col.key}: listYearMonthPair columns missing on table`,
      )
    }
    return sql`${yCol}::text || '-' || lpad(${mCol}::text, 2, '0')`
  }
  const split = col.listVirtualVat12InclusiveSplit
  if (split) {
    const gCol = cols[split.grossColumnKey as keyof typeof cols] as
      | PgColumn
      | undefined
    if (!gCol) {
      throw new Error(
        `[listVirtualSqlForEmbedRow] ${entitySlug}.${col.key}: listVirtualVat12InclusiveSplit.grossColumnKey missing on table`,
      )
    }
    return split.component === "net"
      ? sql`((${gCol}) / 1.12)`
      : sql`((${gCol}) - ((${gCol}) / 1.12))`
  }
  const sub = col.listVirtualSubtractFromBase
  if (sub) {
    return adminEntityListVirtualSubtractFromBaseRowSql(
      cols,
      entitySlug,
      col.key,
      sub,
    )
  }
  const ex = col.listVirtualDateExistsInTable
  if (ex) {
    const dateCol = cols[ex.mainDateColumnKey as keyof typeof cols] as
      | PgColumn
      | undefined
    if (!dateCol) {
      throw new Error(
        `[listVirtualSqlForEmbedRow] ${entitySlug}.${col.key}: listVirtualDateExistsInTable.mainDateColumnKey missing on table`,
      )
    }
    return sql`exists (
      select 1 from ${sql.raw(ex.existsTableFqn)} as _vd
      where _vd.${sql.raw(ex.existsDateColumnName)} = ${dateCol}
    )`
  }
  const dd = col.listVirtualRoundedDayDiffTimestamps
  if (dd) {
    const endCol = cols[dd.endTimestampColumnKey as keyof typeof cols] as
      | PgColumn
      | undefined
    const startCol = cols[dd.startTimestampColumnKey as keyof typeof cols] as
      | PgColumn
      | undefined
    if (!endCol || !startCol) {
      throw new Error(
        `[listVirtualSqlForEmbedRow] ${entitySlug}.${col.key}: listVirtualRoundedDayDiffTimestamps column missing on table`,
      )
    }
    return sql`round(
      (extract(epoch from ${endCol}) - extract(epoch from ${startCol})) / 86400
    )`
  }
  const pd = col.listVirtualPostdatedDaysUntilMaturity
  if (pd) {
    const maturityCol = cols[pd.maturityDateColumnKey as keyof typeof cols] as
      | PgColumn
      | undefined
    const crCol = cols[pd.crNumberColumnKey as keyof typeof cols] as
      | PgColumn
      | undefined
    if (!maturityCol || !crCol) {
      throw new Error(
        `[listVirtualSqlForEmbedRow] ${entitySlug}.${col.key}: listVirtualPostdatedDaysUntilMaturity column missing on table`,
      )
    }
    const manilaToday = sql`(now() at time zone 'Asia/Manila')::date`
    return sql`CASE
      WHEN (${maturityCol}::date > ${manilaToday})
      THEN (${maturityCol}::date - ${manilaToday})
      ELSE NULL
    END`
  }
  if (col.listVirtualRelationLabel) return null
  return null
}

function jsonBuildObjectSqlForEntityRow(
  entitySlug: string,
  cfg: AdminEntityDefinition,
  cols: Record<string, PgColumn>,
): SQL {
  const chunks: SQL[] = []
  for (const p of columnsForEntityJson(cfg, cols)) {
    chunks.push(sqlJsonObjectKey(p.jsonKey), sql`${p.column}`)
  }
  for (const col of cfg.columns) {
    const v = listVirtualSqlForEmbedRow(entitySlug, cols, col)
    if (v != null) chunks.push(sqlJsonObjectKey(col.key), v)
  }
  return jsonBuildObjectFromFlatSqlChunks(chunks)
}

/** Single row JSON for a LEFT JOINed related table (`NULL` when the join misses). */
export function adminEntityRelatedEmbedRowSql(args: {
  relatedEntitySlug: string
  relatedCfg: AdminEntityDefinition
  relCols: Record<string, PgColumn>
  relatedPk: PgColumn
}): SQL {
  const body = jsonBuildObjectSqlForEntityRow(
    args.relatedEntitySlug,
    args.relatedCfg,
    args.relCols,
  )
  return sql`CASE
    WHEN ${args.relatedPk} IS NULL THEN NULL
    ELSE ${body}
  END`
}

/**
 * Correlated `json_agg` of junction row + nested related row (one depth; no recursion).
 */
export function listManyRelationEmbedJsonSql(args: {
  junctionTable: PgTable
  relatedTable: PgTable
  junctionCfg: AdminEntityDefinition
  relatedCfg: AdminEntityDefinition
  /** Slug for virtual-column error messages and embed SQL (matches registry key). */
  relatedEntitySlug: string
  junctionCols: Record<string, PgColumn>
  relatedCols: Record<string, PgColumn>
  junctionParentFk: PgColumn
  junctionRelatedFk: PgColumn
  relatedPk: PgColumn
  mainParentPk: PgColumn
  embedRelatedJsonKey: string
  orderPgCols: readonly PgColumn[]
}): SQL {
  const junctionPairs = columnsForEntityJson(
    args.junctionCfg,
    args.junctionCols,
  )

  const junctionChunks: SQL[] = []
  for (const p of junctionPairs) {
    junctionChunks.push(sqlJsonObjectKey(p.jsonKey), sql`${p.column}`)
  }
  const relatedBody = jsonBuildObjectSqlForEntityRow(
    args.relatedEntitySlug,
    args.relatedCfg,
    args.relatedCols,
  )
  junctionChunks.push(
    sqlJsonObjectKey(args.embedRelatedJsonKey),
    relatedBody,
  )
  const rowObject = jsonBuildObjectFromFlatSqlChunks(junctionChunks)

  const orderClause =
    args.orderPgCols.length > 0
      ? sql` ORDER BY ${sql.join(
          args.orderPgCols.map((c) => sql`${c} ASC`),
          sql`, `,
        )}`
      : sql``

  return sql`(
    SELECT coalesce(
      json_agg(${rowObject}${orderClause}),
      '[]'::json
    )
    FROM ${args.junctionTable}
    INNER JOIN ${args.relatedTable} ON ${eq(args.junctionRelatedFk, args.relatedPk)}
    WHERE ${eq(args.junctionParentFk, args.mainParentPk)}
  )`
}
