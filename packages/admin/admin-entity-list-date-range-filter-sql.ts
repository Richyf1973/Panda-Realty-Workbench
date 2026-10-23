import "server-only"

import { and, gte, getTableColumns, lte, sql, type SQL } from "drizzle-orm"
import type { PgColumn } from "drizzle-orm/pg-core"
import type { PgTable } from "drizzle-orm/pg-core"

import { effectiveListDateRangeFilterSpecs } from "./admin-entity-list-date-range-specs"
import type { AdminEntityDefinition } from "./admin-entity-types"

export function adminEntityListDateRangeFilterSql(
  entities: Readonly<Record<string, AdminEntityDefinition>>,
  slug: string,
  table: PgTable,
  values:
    | readonly { columnKey: string; from: string; to: string }[]
    | undefined,
): SQL | undefined {
  if (values == null || values.length === 0) return undefined
  const cfg = entities[slug] as AdminEntityDefinition | undefined
  if (!cfg) return undefined
  const specs = effectiveListDateRangeFilterSpecs(cfg)
  const specByKey = new Map(specs.map((s) => [s.columnKey, s]))
  const cols = getTableColumns(table)
  const parts: SQL[] = []
  for (const v of values) {
    const spec = specByKey.get(v.columnKey)
    if (!spec) continue
    const col = cols[v.columnKey as keyof typeof cols] as
      | PgColumn
      | undefined
    if (col == null) continue
    if (spec.compareAsDateOnly === true) {
      parts.push(
        sql`${col}::date >= ${v.from}::date AND ${col}::date <= ${v.to}::date`,
      )
    } else {
      const branch = and(gte(col, v.from), lte(col, v.to))
      if (branch) parts.push(branch)
    }
  }
  if (parts.length === 0) return undefined
  if (parts.length === 1) return parts[0]
  return and(...parts)
}
