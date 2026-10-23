import { describe, expect, it } from "vitest"

import { getGoogleFetchRange } from "./condition-calendar-google-range"

describe("getGoogleFetchRange", () => {
  it("day view is single local day", () => {
    const anchor = new Date("2026-04-15T14:30:00")
    const { from, toExclusive } = getGoogleFetchRange("day", anchor)
    expect(from.getHours()).toBe(0)
    expect(toExclusive.getTime() - from.getTime()).toBe(86_400_000)
  })

  it("week view is Monday-start and 7 days long", () => {
    // Wednesday 2026-04-15
    const anchor = new Date("2026-04-15T12:00:00")
    const { from, toExclusive } = getGoogleFetchRange("week", anchor)
    expect(from.getDay()).toBe(1) // Monday
    expect(toExclusive.getTime() - from.getTime()).toBe(7 * 86_400_000)
  })

  it("month view spans one calendar month", () => {
    const anchor = new Date("2026-04-10T08:00:00")
    const { from, toExclusive } = getGoogleFetchRange("month", anchor)
    expect(from.getMonth()).toBe(3) // April 0-indexed
    expect(from.getDate()).toBe(1)
    expect(toExclusive.getMonth()).toBe(4) // May
    expect(toExclusive.getDate()).toBe(1)
  })
})
