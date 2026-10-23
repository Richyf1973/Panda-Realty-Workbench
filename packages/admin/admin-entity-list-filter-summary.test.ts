import { describe, expect, it } from "vitest"

import { buildAdminEntityListFilterSummaryLines } from "./admin-entity-list-filter-summary"

describe("buildAdminEntityListFilterSummaryLines", () => {
  it("shows Any for empty search", () => {
    const lines = buildAdminEntityListFilterSummaryLines({
      listSearchEnabled: true,
      listSearchValue: "",
      listSearchPlaceholder: "Search Item",
    })
    expect(lines).toEqual([
      expect.objectContaining({
        groupLabel: "Search",
        valueLabel: "Any",
        isActive: false,
      }),
    ])
  })

  it("formats date range as all dates when empty", () => {
    const lines = buildAdminEntityListFilterSummaryLines({
      listDateRangeFilterEnabled: true,
      listDateRangeFilterRows: [
        {
          columnKey: "lineSalesDate",
          label: "Sales date",
          from: "",
          to: "",
        },
      ],
    })
    expect(lines[0]).toMatchObject({
      groupLabel: "Sales date",
      valueLabel: "All dates",
      isActive: false,
    })
  })
})
