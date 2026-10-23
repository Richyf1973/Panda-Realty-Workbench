import { bigint, pgTable, text } from "drizzle-orm/pg-core"
import { describe, expect, it } from "vitest"

import { stripAdminEntityApiRow } from "./admin-entity-list-response-strip"
import type { AdminEntityDefinition } from "./admin-entity-types"

const stripTestTable = pgTable("strip_test_rows", {
  id: bigint("id", { mode: "number" }),
  name: text("name"),
})

describe("stripAdminEntityApiRow", () => {
  it("keeps idColumn jsonKey when that column is list:false and patch:false", () => {
    const cfg = {
      idColumn: { jsonKey: "id", valueType: "integer" },
      columns: [
        {
          key: "id",
          sqlName: "id",
          label: "ID",
          valueType: "integer",
          list: false,
          create: false,
          patch: false,
          sortable: true,
        },
        {
          key: "name",
          sqlName: "name",
          label: "Name",
          valueType: "text",
          list: true,
          create: true,
          patch: true,
          sortable: true,
        },
      ],
    } as unknown as AdminEntityDefinition

    const out = stripAdminEntityApiRow({ id: 42, name: "x" }, cfg, stripTestTable)
    expect(out.id).toBe(42)
    expect(out.name).toBe("x")
  })
})
