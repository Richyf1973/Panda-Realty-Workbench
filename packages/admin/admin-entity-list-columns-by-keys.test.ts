import { describe, expect, it } from "vitest"

import { adminEntityListColumnsByKeys } from "./admin-entity-list-columns-by-keys"
import type { AdminEntityDefinition } from "./admin-entity-types"

const miniCfg = {
  slug: "demo",
  columns: [
    { key: "a", sqlName: "a", label: "A", valueType: "text" as const, list: true, create: false, patch: false, sortable: false },
    { key: "b", sqlName: "b", label: "B", valueType: "text" as const, list: false, create: false, patch: true, sortable: false },
  ],
} as unknown as AdminEntityDefinition

describe("adminEntityListColumnsByKeys", () => {
  it("returns columns in key order including list:false keys", () => {
    const cols = adminEntityListColumnsByKeys(miniCfg, ["b", "a"])
    expect(cols.map((c) => c.key)).toEqual(["b", "a"])
  })

  it("throws on unknown key", () => {
    expect(() => adminEntityListColumnsByKeys(miniCfg, ["x"])).toThrow(/unknown column/)
  })
})
