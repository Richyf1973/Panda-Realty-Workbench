import { describe, expect, it } from "vitest"

import {
  adminEntityListDayCountBadgeClassName,
  formatAdminEntitySignedDayCountLabel,
  parseAdminEntityListDayCountInteger,
} from "./admin-entity-list-day-count-label"

const bands = {
  greenThrough: 60,
  orangeFrom: 61,
  orangeThrough: 90,
  redFrom: 91,
} as const

describe("formatAdminEntitySignedDayCountLabel", () => {
  it("uses singular day for 0 and 1", () => {
    expect(formatAdminEntitySignedDayCountLabel(0)).toBe("0 day")
    expect(formatAdminEntitySignedDayCountLabel(1)).toBe("1 day")
  })

  it("uses unicode minus for negative", () => {
    expect(formatAdminEntitySignedDayCountLabel(-1)).toBe("\u22121 day")
    expect(formatAdminEntitySignedDayCountLabel(-3)).toBe("\u22123 days")
  })
})

describe("parseAdminEntityListDayCountInteger", () => {
  it("parses string and truncates", () => {
    expect(parseAdminEntityListDayCountInteger(" 12.9 ")).toBe(12)
  })

  it("returns null for empty", () => {
    expect(parseAdminEntityListDayCountInteger("")).toBe(null)
    expect(parseAdminEntityListDayCountInteger(null)).toBe(null)
  })
})

describe("adminEntityListDayCountBadgeClassName", () => {
  it("uses abs for coloring", () => {
    expect(adminEntityListDayCountBadgeClassName(-75, bands)).toContain("amber")
    expect(adminEntityListDayCountBadgeClassName(75, bands)).toContain("amber")
  })

  it("maps thresholds", () => {
    expect(adminEntityListDayCountBadgeClassName(30, bands)).toContain("emerald")
    expect(adminEntityListDayCountBadgeClassName(61, bands)).toContain("amber")
    expect(adminEntityListDayCountBadgeClassName(91, bands)).toContain("destructive")
  })
})
