import { describe, expect, it } from "vitest"

import { adminEntityEnglishMonthIntegerFormOptions } from "./admin-entity-english-month-form-options"

describe("adminEntityEnglishMonthIntegerFormOptions", () => {
  it("returns 12 months with values 1–12 and long English names", () => {
    const opts = adminEntityEnglishMonthIntegerFormOptions()
    expect(opts).toHaveLength(12)
    expect(opts[0]).toEqual({ value: 1, label: "January" })
    expect(opts[11]).toEqual({ value: 12, label: "December" })
    const values = opts.map((o) => o.value)
    expect(values).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })
})
