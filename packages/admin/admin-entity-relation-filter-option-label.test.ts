import { describe, expect, it } from "vitest"

import { adminEntityRelationOptionLabel } from "./admin-entity-relation-filter-option-label"

describe("adminEntityRelationOptionLabel", () => {
  it("joins dotted nested embed paths with middle dot", () => {
    const row = {
      payrollId: 9,
      guardRef: { firstName: "Ada", lastName: "Lovelace" },
    } as Record<string, unknown>
    const label = adminEntityRelationOptionLabel(row, [
      "guardRef.firstName",
      "guardRef.lastName",
      "payrollId",
    ])
    expect(label).toBe("Ada · Lovelace · 9")
  })

  it("still supports flat keys", () => {
    const row = { payrollId: 1, guardId: 2 } as Record<string, unknown>
    expect(
      adminEntityRelationOptionLabel(row, ["payrollId", "guardId"]),
    ).toBe("1 · 2")
  })
})
