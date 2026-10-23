import { eq, or, sql, type SQL } from "drizzle-orm"
import type { PgColumn } from "drizzle-orm/pg-core"

/**
 * "Pin to top" support for list pages: float a single row to position 1 and guarantee it is in the
 * result set regardless of any active filter. Used by the panda-realty map filter, where the
 * property whose row map icon was tapped is the anchor / point of interest for comparison.
 */

/**
 * Leading ORDER BY expression that sorts the pinned row first (0 before everything else's 1), ahead
 * of the entity's normal order. Prepend this to the forward order parts.
 */
export function pinTopOrderExpr(idCol: PgColumn, pinId: number): SQL {
  return sql`case when ${idCol} = ${pinId} then 0 else 1 end`
}

/**
 * Force-include the pinned row past every filter: `(base) OR idCol = pinId`. Returns `undefined`
 * when there is no base WHERE — with no filters every row already matches, so there is nothing to
 * widen.
 */
export function pinTopForceIncludeWhere(
  base: SQL | undefined,
  idCol: PgColumn,
  pinId: number,
): SQL | undefined {
  if (base === undefined) return undefined
  return or(base, eq(idCol, pinId))
}
