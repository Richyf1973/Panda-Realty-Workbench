import { and, eq, sql } from "drizzle-orm"
import { integer, pgTable, text } from "drizzle-orm/pg-core"
import { PgDialect } from "drizzle-orm/pg-core"
import { describe, expect, it } from "vitest"

import {
  pinTopForceIncludeWhere,
  pinTopOrderExpr,
} from "./admin-entity-list-pin-top"

// Minimal fixture table — an integer PK plus a couple of filterable columns.
const widgets = pgTable("widgets", {
  id: integer("id").primaryKey(),
  name: text("name"),
  favorite: integer("favorite"),
})

const dialect = new PgDialect()

function compile(fragment: Parameters<PgDialect["sqlToQuery"]>[0]) {
  return dialect.sqlToQuery(fragment)
}

describe("pinTopOrderExpr — float the pinned row to the top", () => {
  it("builds a CASE WHEN id = pinId THEN 0 ELSE 1 END expression", () => {
    const { sql: text, params } = compile(pinTopOrderExpr(widgets.id, 80))
    const lower = text.toLowerCase()
    expect(lower).toContain("case when")
    expect(lower).toContain("then 0")
    expect(lower).toContain("else 1")
    // The pinned id is a bound parameter, not inlined.
    expect(params).toContain(80)
  })

  it("references the supplied id column", () => {
    const { sql: text } = compile(pinTopOrderExpr(widgets.id, 5))
    expect(text).toContain('"id"')
  })
})

describe("pinTopForceIncludeWhere — include the pinned row past every filter", () => {
  it("ORs the pinned id onto an existing base WHERE", () => {
    const base = and(eq(widgets.favorite, 1), sql`${widgets.name} ilike ${"%a%"}`)!
    const result = pinTopForceIncludeWhere(base, widgets.id, 80)
    expect(result).toBeDefined()
    const { sql: text, params } = compile(result!)
    const lower = text.toLowerCase()
    // Shape: (base) or "id" = $n
    expect(lower).toContain(" or ")
    expect(lower).toContain('"id" =')
    expect(params).toContain(80)
    // The original favourite filter is still present inside the OR's left side.
    expect(params).toContain(1)
  })

  it("is a no-op when there is no base WHERE (all rows already match)", () => {
    expect(pinTopForceIncludeWhere(undefined, widgets.id, 80)).toBeUndefined()
  })
})
