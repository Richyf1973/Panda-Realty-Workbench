import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { parseAdminEntityYearMonthListFilterFromCfg } from "./admin-entity-list-year-month-filter-parse"

describe("parseAdminEntityYearMonthListFilterFromCfg — required", () => {
  const cfg = {
    listYearMonthFilter: {
      yearColumnKey: "yearReported",
      monthColumnKey: "monthReported",
      required: true as const,
    },
  } as Parameters<typeof parseAdminEntityYearMonthListFilterFromCfg>[0]

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(Date.UTC(2026, 2, 10)))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("defaults to current UTC month when param missing and required", () => {
    const p = new URLSearchParams()
    expect(parseAdminEntityYearMonthListFilterFromCfg(cfg, p)).toEqual({
      year: 2026,
      month: 3,
    })
  })

  it("defaults when invalid month and required", () => {
    const p = new URLSearchParams({ reportedPeriod: "2026-13" })
    expect(parseAdminEntityYearMonthListFilterFromCfg(cfg, p)).toEqual({
      year: 2026,
      month: 3,
    })
  })

  it("parses valid period when required", () => {
    const p = new URLSearchParams({ reportedPeriod: "2025-07" })
    expect(parseAdminEntityYearMonthListFilterFromCfg(cfg, p)).toEqual({
      year: 2025,
      month: 7,
    })
  })
})
