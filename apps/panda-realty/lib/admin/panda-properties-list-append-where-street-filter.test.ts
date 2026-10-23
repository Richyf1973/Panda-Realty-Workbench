import { describe, expect, it } from "vitest"
import { PgDialect } from "drizzle-orm/pg-core"

import { pandaProperties } from "@/db/schema"
import { pandaPropertiesAppendListWhere } from "./panda-properties-list-append-where.server"

// The map-area filter matches each street by its NORMALIZED key against the
// idx_panda_street_key expression index (panda_street_key strips the leading house/unit
// designator from the stored address; panda_street_norm normalizes the incoming Overpass
// name the same way — both in SQL). Exact-key matching replaces the old unindexed
// `street_address ~* '\yNAME\y'` regex scan (100s+/statement_timeout at ~50+ streets) and
// also drops the substring false positives (e.g. "Creek Road" no longer matches
// "Browns Creek Road"). The whole-street correctness is exercised against the live DB in the
// spec's parity check; here we lock the generated SQL shape.

const dialect = new PgDialect()

function compile(streetFilter: string) {
  const result = pandaPropertiesAppendListWhere({
    // db is unused by the streetFilter branch
    db: {} as never,
    slug: "properties",
    table: pandaProperties as never,
    relationFilterValues: {},
    appendListWhereHints: { streetFilter },
  } as never)
  expect(result).toBeDefined()
  return dialect.sqlToQuery(result!)
}

describe("pandaPropertiesAppendListWhere — streetFilter indexed key matching", () => {
  it("matches on the normalized street key via the expression index, not a substring/regex", () => {
    const { sql, params } = compile("Lily Close~QLD")

    // Indexed key lookup — no loose substring ILIKE, no per-row regex.
    expect(sql).toContain("panda_street_key")
    expect(sql).toContain("panda_street_norm")
    expect(sql).toContain("= ANY(ARRAY[")
    expect(sql).not.toContain("~*")
    expect(params).not.toContain("%Lily Close%")

    // The raw street name is passed through verbatim; normalization happens in SQL.
    expect(params).toContain("Lily Close")
    // State is still scoped.
    expect(params).toContain("QLD")
  })

  it("collapses multiple streets in the same state into one indexed ANY(ARRAY[...]) lookup", () => {
    const { sql, params } = compile("Lily Close~QLD,Dahlia Crescent~QLD")
    // Both names feed a single ARRAY for the QLD key match (no per-street OR needed).
    expect(sql).toContain("= ANY(ARRAY[")
    expect(params).toContain("Lily Close")
    expect(params).toContain("Dahlia Crescent")
    // One state group → no OR across groups.
    expect(sql.toLowerCase()).not.toContain(" or ")
  })

  it("ORs separate state groups together", () => {
    const { sql, params } = compile("Lily Close~QLD,Beach Road~NSW")
    expect(sql.toLowerCase()).toContain(" or ")
    expect(params).toContain("Lily Close")
    expect(params).toContain("Beach Road")
    expect(params).toContain("QLD")
    expect(params).toContain("NSW")
  })
})
