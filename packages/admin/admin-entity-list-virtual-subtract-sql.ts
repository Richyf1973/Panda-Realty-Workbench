import "server-only"

import { sql, type SQL } from "drizzle-orm"
import type { PgColumn } from "drizzle-orm/pg-core"

/**
 * Row expression: `coalesce(base,0) - coalesce(s1,0) - …` for list SELECT and aggregate SUM.
 */
export function adminEntityListVirtualSubtractFromBaseRowSql(
  mainCols: Record<string, PgColumn>,
  slug: string,
  virtualColKey: string,
  spec: {
    readonly baseColumnKey: string
    readonly subtractColumnKeys: readonly string[]
  },
): SQL {
  const base = mainCols[spec.baseColumnKey as keyof typeof mainCols] as
    | PgColumn
    | undefined
  if (!base) {
    throw new Error(
      `[adminEntityListVirtualSubtractFromBaseRowSql] ${slug}.${virtualColKey}: baseColumnKey ${spec.baseColumnKey} missing on table`,
    )
  }
  let expr: SQL = sql`coalesce(${base}, 0)`
  for (const sk of spec.subtractColumnKeys) {
    const sc = mainCols[sk as keyof typeof mainCols] as PgColumn | undefined
    if (!sc) {
      throw new Error(
        `[adminEntityListVirtualSubtractFromBaseRowSql] ${slug}.${virtualColKey}: subtract column ${sk} missing on table`,
      )
    }
    expr = sql`(${expr}) - coalesce(${sc}, 0)`
  }
  return expr
}
