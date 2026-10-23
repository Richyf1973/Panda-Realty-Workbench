import { describe, expect, it } from "vitest"

import { adminEntityLocksCrudOnCompactViewport } from "./admin-entity-crud-compact-viewport"

describe("adminEntityLocksCrudOnCompactViewport", () => {
  it("does not lock when crudCompactViewport is omitted (editable by default)", () => {
    expect(adminEntityLocksCrudOnCompactViewport({})).toBe(false)
  })

  it("does not lock when explicitly editable", () => {
    expect(
      adminEntityLocksCrudOnCompactViewport({ crudCompactViewport: "editable" }),
    ).toBe(false)
  })

  it("locks only when explicitly locked", () => {
    expect(
      adminEntityLocksCrudOnCompactViewport({ crudCompactViewport: "locked" }),
    ).toBe(true)
  })
})
