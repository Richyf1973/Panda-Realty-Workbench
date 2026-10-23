import { describe, expect, it } from "vitest"

import { formatAdminEntityListCellDisplay } from "./admin-entity-list-display-format"
import type { AdminEntityColumn } from "./admin-entity-types"

describe("formatAdminEntityListCellDisplay", () => {
  it("formats listYearMonthPair values like the reporting-period filter (short month + year)", () => {
    const col = {
      key: "yearMonthReported",
      sqlName: "x",
      label: "Period",
      valueType: "text",
      list: true,
      create: false,
      patch: false,
      sortable: false,
      listVirtual: true,
      listYearMonthPair: {
        yearColumnKey: "yearReported",
        monthColumnKey: "monthReported",
      },
    } as AdminEntityColumn

    const out = formatAdminEntityListCellDisplay("2026-02", col)
    expect(out).toMatch(/Feb/i)
    expect(out).toMatch(/2026/)
  })

  it("formats date-string calendar columns as Mar 16, 2026", () => {
    const col = {
      key: "salesDate",
      sqlName: "sales_date",
      label: "Sales date",
      valueType: "text",
      list: true,
      create: true,
      patch: true,
      sortable: true,
      dateStringFormControl: "calendar",
    } as AdminEntityColumn

    expect(formatAdminEntityListCellDisplay("2026-03-16", col)).toBe("Mar 16, 2026")
    expect(formatAdminEntityListCellDisplay("", col)).toBe("")
    expect(formatAdminEntityListCellDisplay(null, col)).toBe("")
  })

  it("formats date-string yearMonthEnd like calendar list cells", () => {
    const col = {
      key: "countDate",
      sqlName: "count_date",
      label: "Period",
      valueType: "text",
      list: true,
      create: true,
      patch: false,
      sortable: true,
      dateStringFormControl: "yearMonthEnd",
    } as AdminEntityColumn

    expect(formatAdminEntityListCellDisplay("2026-03-31", col)).toBe("Mar 31, 2026")
  })

  it("formats listDayCountBadgeBands integers as signed day labels", () => {
    const col = {
      key: "avgDays",
      sqlName: "x",
      label: "Avg. days",
      valueType: "integer",
      list: true,
      create: false,
      patch: false,
      sortable: false,
      listDayCountBadgeBands: {
        greenThrough: 60,
        orangeFrom: 61,
        orangeThrough: 90,
        redFrom: 91,
      },
    } as AdminEntityColumn

    expect(formatAdminEntityListCellDisplay("5", col)).toBe("5 days")
    expect(formatAdminEntityListCellDisplay("-1", col)).toBe("\u22121 day")
    expect(formatAdminEntityListCellDisplay(null, col)).toBe("")
  })
})
