import { describe, expect, it } from "vitest"

import { adminEntityCreateFormListDateFilterDefaults } from "./admin-entity-crud-form-values"

describe("adminEntityCreateFormListDateFilterDefaults", () => {
  it("returns the shared day when from === to and column is on create", () => {
    expect(
      adminEntityCreateFormListDateFilterDefaults({
        listDateRangeFilterRows: [
          {
            columnKey: "salesDate",
            from: "2026-03-30",
            to: "2026-03-30",
          },
        ],
        createColumnKeys: new Set(["salesDate", "note"]),
      }),
    ).toEqual({ salesDate: "2026-03-30" })
  })

  it("returns empty when the range spans multiple days", () => {
    expect(
      adminEntityCreateFormListDateFilterDefaults({
        listDateRangeFilterRows: [
          {
            columnKey: "salesDate",
            from: "2026-03-30",
            to: "2026-03-31",
          },
        ],
        createColumnKeys: new Set(["salesDate"]),
      }),
    ).toEqual({})
  })

  it("ignores rows when the column is not on the create form", () => {
    expect(
      adminEntityCreateFormListDateFilterDefaults({
        listDateRangeFilterRows: [
          {
            columnKey: "salesDate",
            from: "2026-03-30",
            to: "2026-03-30",
          },
        ],
        createColumnKeys: new Set(["note"]),
      }),
    ).toEqual({})
  })

  it("ignores invalid date strings", () => {
    expect(
      adminEntityCreateFormListDateFilterDefaults({
        listDateRangeFilterRows: [
          {
            columnKey: "salesDate",
            from: "03/30/2026",
            to: "03/30/2026",
          },
        ],
        createColumnKeys: new Set(["salesDate"]),
      }),
    ).toEqual({})
  })
})
