import { describe, expect, it } from "vitest"

import {
  adminEntityYmdFromYearMonth,
  adminEntityYmdIsLastDayOfMonth,
} from "./admin-entity-date-ymd-month-end"

describe("adminEntityYmdFromYearMonth", () => {
  it("returns month-end for common months", () => {
    expect(adminEntityYmdFromYearMonth("2026-01")).toBe("2026-01-31")
    expect(adminEntityYmdFromYearMonth("2026-04")).toBe("2026-04-30")
  })

  it("handles February in leap years", () => {
    expect(adminEntityYmdFromYearMonth("2024-02")).toBe("2024-02-29")
    expect(adminEntityYmdFromYearMonth("2023-02")).toBe("2023-02-28")
  })

  it("allows far-future month-end through 2200 (E2E sentinel periods)", () => {
    expect(adminEntityYmdFromYearMonth("2200-12")).toBe("2200-12-31")
  })

  it("returns null for invalid input", () => {
    expect(adminEntityYmdFromYearMonth("")).toBeNull()
    expect(adminEntityYmdFromYearMonth("2026-13")).toBeNull()
    expect(adminEntityYmdFromYearMonth("not-a-period")).toBeNull()
    expect(adminEntityYmdFromYearMonth("2201-01")).toBeNull()
  })
})

describe("adminEntityYmdIsLastDayOfMonth", () => {
  it("accepts last days", () => {
    expect(adminEntityYmdIsLastDayOfMonth("2026-01-31")).toBe(true)
    expect(adminEntityYmdIsLastDayOfMonth("2024-02-29")).toBe(true)
  })

  it("rejects other days", () => {
    expect(adminEntityYmdIsLastDayOfMonth("2026-01-15")).toBe(false)
    expect(adminEntityYmdIsLastDayOfMonth("2023-02-29")).toBe(false)
  })

  it("rejects malformed strings", () => {
    expect(adminEntityYmdIsLastDayOfMonth("")).toBe(false)
    expect(adminEntityYmdIsLastDayOfMonth("2026-1-31")).toBe(false)
  })
})
