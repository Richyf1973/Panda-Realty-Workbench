import { describe, expect, it } from "vitest"

import {
  formatAdminEntityYearMonthPeriodLabel,
  normalizeAdminEntityYearMonthPeriodString,
  parseAdminEntityYearMonthPeriod,
} from "./admin-entity-list-year-month-period-parse"

describe("admin-entity-list-year-month-period-parse", () => {
  it("parseAdminEntityYearMonthPeriod accepts YYYY-M and YYYY-MM", () => {
    expect(parseAdminEntityYearMonthPeriod("2024-3")).toEqual({
      year: 2024,
      month: 3,
    })
    expect(parseAdminEntityYearMonthPeriod("2024-03")).toEqual({
      year: 2024,
      month: 3,
    })
  })

  it("parseAdminEntityYearMonthPeriod rejects invalid months and years", () => {
    expect(parseAdminEntityYearMonthPeriod("2024-0")).toBeNull()
    expect(parseAdminEntityYearMonthPeriod("2024-13")).toBeNull()
    expect(parseAdminEntityYearMonthPeriod("1899-01")).toBeNull()
    expect(parseAdminEntityYearMonthPeriod("not-a-period")).toBeNull()
  })

  it("normalizeAdminEntityYearMonthPeriodString pads month", () => {
    expect(normalizeAdminEntityYearMonthPeriodString(2024, 3)).toBe("2024-03")
  })

  it("formatAdminEntityYearMonthPeriodLabel renders short month + year", () => {
    expect(formatAdminEntityYearMonthPeriodLabel("2024-03")).toMatch(/2024/)
    expect(formatAdminEntityYearMonthPeriodLabel("2024-03")).toMatch(/Mar/i)
  })
})
