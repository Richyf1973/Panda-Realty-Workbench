import { sql, type SQL } from "drizzle-orm"

import { JSON_BUILD_OBJECT_MAX_PAIRS_PER_CALL } from "./admin-entity-pg-arg-limits"

/**
 * Build `json_build_object` from alternating SQL fragments `[key, value, key, value, …]`.
 * Splits into multiple `json_build_object` calls and merges with `jsonb` `||` when needed
 * (PostgreSQL caps variadic calls at ~100 arguments).
 */
export function jsonBuildObjectFromFlatSqlChunks(flatKeyValueChunks: SQL[]): SQL {
  if (flatKeyValueChunks.length === 0) {
    return sql`'{}'::json`
  }
  if (flatKeyValueChunks.length % 2 !== 0) {
    throw new Error(
      "[jsonBuildObjectFromFlatSqlChunks] expected even number of key/value SQL fragments",
    )
  }
  const maxFlat = JSON_BUILD_OBJECT_MAX_PAIRS_PER_CALL * 2
  if (flatKeyValueChunks.length <= maxFlat) {
    return sql`json_build_object(${sql.join(flatKeyValueChunks, sql`, `)})`
  }
  const segments: SQL[] = []
  for (let i = 0; i < flatKeyValueChunks.length; i += maxFlat) {
    const slice = flatKeyValueChunks.slice(i, i + maxFlat)
    segments.push(sql`(json_build_object(${sql.join(slice, sql`, `)})::jsonb)`)
  }
  if (segments.length === 1) {
    return sql`${segments[0]!}::json`
  }
  return sql`(${sql.join(segments, sql` || `)})::json`
}
