import { isSQLWrapper, sql } from "drizzle-orm"
import { PgDialect } from "drizzle-orm/pg-core"
import { describe, expect, it } from "vitest"

import { jsonBuildObjectFromFlatSqlChunks } from "./admin-entity-json-build-object-sql"
import {
  CONCAT_WS_MAX_VALUE_ARGS_PER_CALL,
  JSON_BUILD_OBJECT_MAX_PAIRS_PER_CALL,
} from "./admin-entity-pg-arg-limits"

const pgDialect = new PgDialect()

function sqlWrapperToPgString(fragment: unknown): string {
  if (!isSQLWrapper(fragment)) {
    throw new Error("Expected a Drizzle SQLWrapper")
  }
  return pgDialect.sqlToQuery(fragment.getSQL()).sql
}

describe("PostgreSQL variadic limits — constants", () => {
  it("JSON_BUILD_OBJECT_MAX_PAIRS_PER_CALL keeps json_build_object args under 100", () => {
    expect(JSON_BUILD_OBJECT_MAX_PAIRS_PER_CALL * 2).toBeLessThanOrEqual(90)
  })

  it("concat_ws chunk size stays under PG variadic limits", () => {
    expect(CONCAT_WS_MAX_VALUE_ARGS_PER_CALL).toBeLessThanOrEqual(80)
  })

  it("wide entities (e.g. Panda properties ~70 cols) need multiple json chunks", () => {
    const pairs = 70
    const chunks = Math.ceil(pairs / JSON_BUILD_OBJECT_MAX_PAIRS_PER_CALL)
    expect(chunks).toBe(2)
  })
})

describe("jsonBuildObjectFromFlatSqlChunks", () => {
  it("emits a single json_build_object when under the pair limit", () => {
    const flat = [sql.raw(`'a'`), sql.raw(`1`), sql.raw(`'b'`), sql.raw(`2`)]
    const s = sqlWrapperToPgString(jsonBuildObjectFromFlatSqlChunks(flat))
    expect(s.toLowerCase()).toContain("json_build_object")
    expect(s).not.toContain("||")
  })

  it("merges with jsonb || when above pair limit (PostgreSQL 100-arg cap)", () => {
    const pairs = JSON_BUILD_OBJECT_MAX_PAIRS_PER_CALL + 5
    const flat: ReturnType<typeof sql.raw>[] = []
    for (let i = 0; i < pairs; i++) {
      flat.push(sql.raw(`'k${i}'`), sql.raw(String(i)))
    }
    const s = sqlWrapperToPgString(jsonBuildObjectFromFlatSqlChunks(flat))
    expect(s).toContain("||")
    expect(s.toLowerCase()).toContain("json_build_object")
  })
})
