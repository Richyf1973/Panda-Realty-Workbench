import { describe, expect, it } from "vitest"

import { computeConditionDueDate } from "./panda-property-completion-date"

describe("computeConditionDueDate", () => {
  it("returns contract date plus days", () => {
    expect(
      computeConditionDueDate({
        contractDate: "2026-05-01T00:00:00.000Z",
        days: 14,
      })?.toISOString(),
    ).toBe("2026-05-15T00:00:00.000Z")
  })

  it("returns null when contract date is missing", () => {
    expect(
      computeConditionDueDate({
        contractDate: null,
        days: 14,
      }),
    ).toBeNull()
  })

  it("returns null when day count is empty or non-positive", () => {
    expect(
      computeConditionDueDate({
        contractDate: "2026-05-01T00:00:00.000Z",
        days: null,
      }),
    ).toBeNull()
    expect(
      computeConditionDueDate({
        contractDate: "2026-05-01T00:00:00.000Z",
        days: 0,
      }),
    ).toBeNull()
  })
})
