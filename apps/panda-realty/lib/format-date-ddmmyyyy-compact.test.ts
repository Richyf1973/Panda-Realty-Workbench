import { describe, expect, it } from "vitest"

import { formatDateDdMmYyyyCompact } from "./format-date-ddmmyyyy-compact"

describe("formatDateDdMmYyyyCompact", () => {
  it("formats local calendar date as ddmmyyyy without separators", () => {
    const d = new Date(2026, 3, 21) // 21 April 2026 (local)
    expect(formatDateDdMmYyyyCompact(d)).toBe("21042026")
  })

  it("pads single-digit day and month", () => {
    const d = new Date(2026, 0, 5) // 5 January 2026 (local)
    expect(formatDateDdMmYyyyCompact(d)).toBe("05012026")
  })
})
