import "server-only"

import { and, eq, exists, getTableColumns, type SQL } from "drizzle-orm"
import type { PgColumn, PgTable } from "drizzle-orm/pg-core"

import { adminEntityTableForSlug } from "./admin-entity-list-sql-context"
import type {
  AdminEntityDefinition,
  AdminEntityListServerContext,
} from "./admin-entity-types"

/**
 * When {@link AdminEntityDefinition.listScopeByReportingPeriodInRelated} is set, restrict list
 * rows to those that appear as `parentFkColumnKey` on the related entity for the given period.
 */
export function adminEntityListReportingPeriodExistsSql(
  ctx: AdminEntityListServerContext,
  slug: string,
  table: PgTable,
  period: { year: number; month: number } | undefined,
): SQL | undefined {
  if (period == null) return undefined
  const cfg = ctx.entities[slug] as AdminEntityDefinition | undefined
  const spec = cfg?.listScopeByReportingPeriodInRelated
  if (!spec) return undefined

  const relatedTable = adminEntityTableForSlug(
    ctx.tables,
    spec.relatedEntitySlug,
  )
  const parentCols = getTableColumns(table)
  const relatedCols = getTableColumns(relatedTable)
  const parentFk = parentCols[
    spec.parentFkColumnKey as keyof typeof parentCols
  ] as PgColumn | undefined
  const relatedFk = relatedCols[
    spec.relatedFkColumnKey as keyof typeof relatedCols
  ] as PgColumn | undefined
  const yCol = relatedCols[
    spec.relatedYearColumnKey as keyof typeof relatedCols
  ] as PgColumn | undefined
  const mCol = relatedCols[
    spec.relatedMonthColumnKey as keyof typeof relatedCols
  ] as PgColumn | undefined
  if (parentFk == null || relatedFk == null || yCol == null || mCol == null) {
    return undefined
  }

  const subq = ctx.db
    .select()
    .from(relatedTable)
    .where(
      and(
        eq(relatedFk, parentFk),
        eq(yCol, period.year),
        eq(mCol, period.month),
      )!,
    )
  return exists(subq)
}
