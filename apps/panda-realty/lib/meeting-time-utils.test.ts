import { describe, expect, it } from "vitest"

import { snapDurationMinutes, snapTimeToQuarterHour } from "./meeting-time-utils"

describe("snapTimeToQuarterHour", () => {
  it("snaps to nearest 15 minutes", () => {
    expect(snapTimeToQuarterHour("07:00")).toBe("07:00")
    expect(snapTimeToQuarterHour("07:07")).toBe("07:00")
    expect(snapTimeToQuarterHour("07:08")).toBe("07:15")
    expect(snapTimeToQuarterHour("14:30")).toBe("14:30")
  })

  it("clamps late times toward 23:45 instead of rolling the clock", () => {
    expect(snapTimeToQuarterHour("23:59")).toBe("23:45")
  })

  it("returns null for empty or invalid input", () => {
    expect(snapTimeToQuarterHour("")).toBeNull()
    expect(snapTimeToQuarterHour("25:00")).toBeNull()
  })
})

describe("snapDurationMinutes", () => {
  it("snaps to 15-minute increments with minimum 15", () => {
    expect(snapDurationMinutes(60)).toBe(60)
    expect(snapDurationMinutes(47)).toBe(45)
    expect(snapDurationMinutes(8)).toBe(15)
  })
})
