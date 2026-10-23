import "server-only"

import { getTableColumns, sql, type SQL } from "drizzle-orm"
import type { PgColumn, PgTable } from "drizzle-orm/pg-core"

import { adminEntityListVirtualSubtractFromBaseRowSql } from "./admin-entity-list-virtual-subtract-sql"
import type { AdminDrizzleDb, AdminEntityDefinition } from "./admin-entity-types"

/**
 * `SUM(column)` for each configured list column, over all rows matching `listBaseWhere`
 * (same filters as the admin list count/query). Omits non-numeric / missing columns.
 */
export async function loadAdminEntityListAggregateSums(args: {
  db: AdminDrizzleDb
  entityCfg: AdminEntityDefinition
  table: PgTable
  listBaseWhere: SQL | undefined
}): Promise<Record<string, string> | undefined> {
  const keys = args.entityCfg.listAggregateSumColumnKeys
  if (!keys?.length) return undefined
  const cols = getTableColumns(args.table)
  const selectParts: Record<string, SQL> = {}
  for (const key of keys) {
    const meta = args.entityCfg.columns.find((c) => c.key === key)
    if (!meta || (meta.valueType !== "numeric" && meta.valueType !== "integer")) {
      continue
    }
    const split = meta.listVirtualVat12InclusiveSplit
    if (split) {
      const gCol = cols[split.grossColumnKey as keyof typeof cols] as
        | PgColumn
        | undefined
      if (!gCol) continue
      selectParts[key] =
        split.component === "net"
          ? sql`coalesce(sum((${gCol}) / 1.12), 0)::text`
          : sql`coalesce(sum((${gCol}) - ((${gCol}) / 1.12)), 0)::text`
      continue
    }
    const subtract = meta.listVirtualSubtractFromBase
    if (subtract) {
      try {
        const rowExpr = adminEntityListVirtualSubtractFromBaseRowSql(
          cols as Record<string, PgColumn>,
          args.entityCfg.slug,
          key,
          subtract,
        )
        selectParts[key] = sql`coalesce(sum(${rowExpr}), 0)::text`
      } catch {
        continue
      }
      continue
    }
    const col = cols[key as keyof typeof cols] as PgColumn | undefined
    if (col == null) {
      continue
    }
    selectParts[key] = sql`coalesce(sum(${col}), 0)::text`
  }
  if (Object.keys(selectParts).length === 0) return undefined
  const rows = args.listBaseWhere
    ? await args.db.select(selectParts).from(args.table).where(args.listBaseWhere)
    : await args.db.select(selectParts).from(args.table)
  const row = rows[0]
  if (!row) return undefined
  const out: Record<string, string> = {}
  for (const k of Object.keys(selectParts)) {
    const v = row[k as keyof typeof row]
    out[k] = typeof v === "string" ? v : String(v ?? "0")
  }
  return out
}
