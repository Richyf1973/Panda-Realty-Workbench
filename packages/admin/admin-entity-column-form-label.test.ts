import { describe, expect, it } from "vitest"

import { adminEntityColumnFormLabel } from "./admin-entity-column-form-label"
import type { AdminEntityColumn } from "./admin-entity-types"

function col(partial: Partial<AdminEntityColumn> & Pick<AdminEntityColumn, "key">): AdminEntityColumn {
  return {
    sqlName: partial.key,
    label: "Canonical",
    list: true,
    create: true,
    patch: true,
    sortable: true,
    valueType: "text",
    ...partial,
  } as AdminEntityColumn
}

describe("adminEntityColumnFormLabel", () => {
  it("returns label when formLabel is omitted", () => {
    expect(adminEntityColumnFormLabel(col({ key: "x" }))).toBe("Canonical")
  })

  it("prefers formLabel when set", () => {
    expect(
      adminEntityColumnFormLabel(
        col({ key: "tinNo", label: "TIN", formLabel: "Customer" }),
      ),
    ).toBe("Customer")
  })
})
