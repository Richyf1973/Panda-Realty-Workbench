import "server-only"

import { and, eq, getTableColumns, gte, lt, type SQL } from "drizzle-orm"
import type { PgColumn } from "drizzle-orm/pg-core"
import type { PgTable } from "drizzle-orm/pg-core"

import type { AdminEntityDefinition } from "./admin-entity-types"

export function adminEntityListYearMonthFilterSql(
  entities: Readonly<Record<string, AdminEntityDefinition>>,
  slug: string,
  table: PgTable,
  value: { year: number; month: number } | undefined,
): SQL | undefined {
  if (value == null) return undefined
  const cfg = entities[slug] as AdminEntityDefinition | undefined
  const spec = cfg?.listYearMonthFilter
  if (!spec) return undefined
  const cols = getTableColumns(table)

  const dateKey = spec.dateColumnKey?.trim()
  if (dateKey) {
    const dCol = cols[dateKey as keyof typeof cols] as PgColumn | undefined
    if (dCol == null) return undefined
    const pad = (n: number) => String(n).padStart(2, "0")
    const y = value.year
    const m = value.month
    const start = `${y}-${pad(m)}-01`
    let ny = y
    let nm = m + 1
    if (nm > 12) {
      nm = 1
      ny = y + 1
    }
    const endExclusive = `${ny}-${pad(nm)}-01`
    return and(gte(dCol, start), lt(dCol, endExclusive))
  }

  const yCol = cols[spec.yearColumnKey as keyof typeof cols] as
    | PgColumn
    | undefined
  const mCol = cols[spec.monthColumnKey as keyof typeof cols] as
    | PgColumn
    | undefined
  if (yCol == null || mCol == null) return undefined
  return and(eq(yCol, value.year), eq(mCol, value.month))
}
