import { sql, type SQL } from "drizzle-orm"
import type { PgColumn } from "drizzle-orm/pg-core"

import { CONCAT_WS_MAX_VALUE_ARGS_PER_CALL } from "./admin-entity-pg-arg-limits"

export { CONCAT_WS_MAX_VALUE_ARGS_PER_CALL } from "./admin-entity-pg-arg-limits"

/**
 * Non-empty related columns joined with ` · ` (`nullif(trim(col::text), '')` per part), as SQL.
 * Used in list SELECT and ORDER BY for `listRelation` columns.
 */
export function concatWsRelationLabelSql(
  labelColumns: readonly PgColumn[],
): SQL {
  if (labelColumns.length === 0) {
    return sql`''::text`
  }
  const parts = labelColumns.map((c) => sql`nullif(trim(${c}::text), '')`)
  if (parts.length <= CONCAT_WS_MAX_VALUE_ARGS_PER_CALL) {
    const joined = sql.join(parts, sql.raw(", "))
    return sql`coalesce(nullif(trim(both ' · ' from concat_ws(' · ', ${joined})), ''), '')`
  }
  const segments: SQL[] = []
  for (let i = 0; i < parts.length; i += CONCAT_WS_MAX_VALUE_ARGS_PER_CALL) {
    const slice = parts.slice(i, i + CONCAT_WS_MAX_VALUE_ARGS_PER_CALL)
    const joined = sql.join(slice, sql.raw(", "))
    segments.push(sql`concat_ws(' · ', ${joined})`)
  }
  const outerJoined = sql.join(segments, sql.raw(", "))
  return sql`coalesce(nullif(trim(both ' · ' from concat_ws(' · ', ${outerJoined})), ''), '')`
}
