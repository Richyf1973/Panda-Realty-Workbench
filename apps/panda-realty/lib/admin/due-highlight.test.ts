import { describe, expect, it } from "vitest"

import { computeDueHighlight, startOfBrisbaneDayUtc } from "./due-highlight"

// Fixed "now": 2026-05-31T03:00:00Z === 2026-05-31 13:00 Brisbane (UTC+10).
// Brisbane day start for this instant === 2026-05-30T14:00:00Z (Brisbane 2026-05-31 00:00).
const NOW = new Date("2026-05-31T03:00:00.000Z")

const d = (iso: string) => new Date(iso)

describe("startOfBrisbaneDayUtc", () => {
  it("floors a UTC instant to the start of that Brisbane day (as a UTC Date)", () => {
    expect(startOfBrisbaneDayUtc(NOW).toISOString()).toBe("2026-05-30T14:00:00.000Z")
  })

  it("rolls a late-UTC-night time into the next Brisbane day", () => {
    // 2026-05-31T23:30Z === 2026-06-01 09:30 Brisbane → Brisbane day start 2026-06-01 00:00 = 2026-05-31T14:00Z
    expect(startOfBrisbaneDayUtc(d("2026-05-31T23:30:00.000Z")).toISOString()).toBe(
      "2026-05-31T14:00:00.000Z",
    )
  })
})

describe("computeDueHighlight", () => {
  it("is inactive when there are no candidate dates", () => {
    expect(computeDueHighlight({ candidates: [], now: NOW, clearedAt: null })).toEqual({
      active: false,
      labels: [],
      warning: false,
      warningLabels: [],
      warningDaysUntil: null,
      warningTier: null,
    })
  })

  it("is active for a past date with no clear, listing its label", () => {
    const res = computeDueHighlight({
      candidates: [{ label: "Finance", date: d("2026-05-20T00:00:00.000Z") }],
      now: NOW,
      clearedAt: null,
    })
    expect(res.active).toBe(true)
    expect(res.labels).toEqual(["Finance"])
  })

  it("is active for a date due exactly today (Brisbane)", () => {
    // Brisbane today is 2026-05-31. A UTC-midnight date of 2026-05-31 maps to Brisbane 2026-05-31.
    const res = computeDueHighlight({
      candidates: [{ label: "Settlement", date: d("2026-05-31T00:00:00.000Z") }],
      now: NOW,
      clearedAt: null,
    })
    expect(res.active).toBe(true)
    expect(res.labels).toEqual(["Settlement"])
  })

  it("is inactive when the only date is in the future", () => {
    const res = computeDueHighlight({
      candidates: [{ label: "Cooling Off", date: d("2026-06-10T00:00:00.000Z") }],
      now: NOW,
      clearedAt: null,
    })
    expect(res.active).toBe(false)
    expect(res.labels).toEqual([])
  })

  it("does not trigger a date that was cleared (clearedAt after the due date)", () => {
    const res = computeDueHighlight({
      candidates: [{ label: "Finance", date: d("2026-05-20T00:00:00.000Z") }],
      now: NOW,
      // cleared just now (today), after the 20th
      clearedAt: d("2026-05-31T02:00:00.000Z"),
    })
    expect(res.active).toBe(false)
    expect(res.labels).toEqual([])
  })

  it("re-triggers a later date whose due date falls after the clear", () => {
    // Cleared on the 25th. Finance (20th) stays cleared; Building & Pest (31st = today) re-lights.
    const res = computeDueHighlight({
      candidates: [
        { label: "Finance", date: d("2026-05-20T00:00:00.000Z") },
        { label: "Building & Pest", date: d("2026-05-31T00:00:00.000Z") },
      ],
      now: NOW,
      clearedAt: d("2026-05-25T00:00:00.000Z"),
    })
    expect(res.active).toBe(true)
    expect(res.labels).toEqual(["Building & Pest"])
  })

  it("surfaces only the single next-in-line milestone (earliest un-cleared due/overdue), not all overdue", () => {
    // Revised 2026-05-31 (part 2): the marker sits on the NEXT date in line and steps forward as
    // each is dealt with. With several dates overdue/due, surface only the earliest one.
    const res = computeDueHighlight({
      candidates: [
        { label: "Finance", date: d("2026-05-20T00:00:00.000Z") }, // overdue (earliest)
        { label: "Settlement", date: d("2026-05-31T00:00:00.000Z") }, // today
        { label: "Completion Date", date: d("2026-07-01T00:00:00.000Z") }, // future
        { label: "Cooling Off", date: null }, // n/a
      ],
      now: NOW,
      clearedAt: null,
    })
    expect(res.active).toBe(true)
    expect(res.labels).toEqual(["Finance"])
  })

  it("steps to the next-in-line milestone by date order regardless of candidate array order", () => {
    // Cooling Off (05-10) is earliest even though listed after Finance.
    const res = computeDueHighlight({
      candidates: [
        { label: "Finance", date: d("2026-05-20T00:00:00.000Z") },
        { label: "Cooling Off", date: d("2026-05-10T00:00:00.000Z") },
        { label: "Building & Pest", date: d("2026-05-25T00:00:00.000Z") },
      ],
      now: NOW,
      clearedAt: null,
    })
    expect(res.active).toBe(true)
    expect(res.labels).toEqual(["Cooling Off"])
  })

  it("ignores null candidate dates", () => {
    const res = computeDueHighlight({
      candidates: [{ label: "Cooling Off", date: null }],
      now: NOW,
      clearedAt: null,
    })
    expect(res.active).toBe(false)
    expect(res.labels).toEqual([])
  })
})

describe("computeDueHighlight — warning (yellow) tier, 3 days ahead", () => {
  // Brisbane today is 2026-05-31. today+3 Brisbane = 2026-06-03.
  it("warns for a date exactly 3 Brisbane days out, with a 3-day countdown (soon tier)", () => {
    const res = computeDueHighlight({
      candidates: [{ label: "Finance", date: d("2026-06-03T00:00:00.000Z") }],
      now: NOW,
      clearedAt: null,
    })
    expect(res.active).toBe(false)
    expect(res.warning).toBe(true)
    expect(res.warningLabels).toEqual(["Finance"])
    expect(res.warningDaysUntil).toBe(3)
    expect(res.warningTier).toBe("soon")
  })

  it("counts down 2 and 1 day for dates today+2 and today+1", () => {
    const two = computeDueHighlight({
      candidates: [{ label: "Building & Pest", date: d("2026-06-02T00:00:00.000Z") }],
      now: NOW,
      clearedAt: null,
    })
    expect(two.warning).toBe(true)
    expect(two.warningDaysUntil).toBe(2)

    const one = computeDueHighlight({
      candidates: [{ label: "Settlement", date: d("2026-06-01T00:00:00.000Z") }],
      now: NOW,
      clearedAt: null,
    })
    expect(one.warning).toBe(true)
    expect(one.warningDaysUntil).toBe(1)
  })

  it("warns as UPCOMING (gold) for a date 4 days out — the cap is gone, gold is uncapped", () => {
    const res = computeDueHighlight({
      candidates: [{ label: "Finance", date: d("2026-06-04T00:00:00.000Z") }],
      now: NOW,
      clearedAt: null,
    })
    expect(res.active).toBe(false)
    expect(res.warning).toBe(true)
    expect(res.warningLabels).toEqual(["Finance"])
    expect(res.warningDaysUntil).toBe(4)
    expect(res.warningTier).toBe("upcoming")
  })

  it("does not warn for a date due today or overdue (those are green, not yellow)", () => {
    const today = computeDueHighlight({
      candidates: [{ label: "Settlement", date: d("2026-05-31T00:00:00.000Z") }],
      now: NOW,
      clearedAt: null,
    })
    expect(today.active).toBe(true)
    expect(today.warning).toBe(false)
  })

  it("gives green precedence: an overdue date is green even when a later date is within 3 days", () => {
    const res = computeDueHighlight({
      candidates: [
        { label: "Finance", date: d("2026-05-20T00:00:00.000Z") }, // overdue → green
        { label: "Building & Pest", date: d("2026-06-02T00:00:00.000Z") }, // within 3 days
      ],
      now: NOW,
      clearedAt: null,
    })
    expect(res.active).toBe(true)
    expect(res.labels).toEqual(["Finance"])
    expect(res.warning).toBe(false)
    expect(res.warningLabels).toEqual([])
    expect(res.warningTier).toBeNull()
  })

  it("warns on the earliest in-window date regardless of candidate array order", () => {
    const res = computeDueHighlight({
      candidates: [
        { label: "Finance", date: d("2026-06-03T00:00:00.000Z") }, // today+3
        { label: "Cooling Off", date: d("2026-06-01T00:00:00.000Z") }, // today+1 (earliest)
        { label: "Building & Pest", date: d("2026-06-02T00:00:00.000Z") }, // today+2
      ],
      now: NOW,
      clearedAt: null,
    })
    expect(res.warning).toBe(true)
    expect(res.warningLabels).toEqual(["Cooling Off"])
    expect(res.warningDaysUntil).toBe(1)
  })

  it("warns for an in-window future date even after a prior clear (yellow ignores clearedAt)", () => {
    const res = computeDueHighlight({
      candidates: [{ label: "Finance", date: d("2026-06-02T00:00:00.000Z") }],
      now: NOW,
      clearedAt: d("2026-05-31T02:00:00.000Z"),
    })
    expect(res.warning).toBe(true)
    expect(res.warningLabels).toEqual(["Finance"])
  })

  it("has no warning when there are no candidates", () => {
    const res = computeDueHighlight({ candidates: [], now: NOW, clearedAt: null })
    expect(res.warning).toBe(false)
    expect(res.warningLabels).toEqual([])
    expect(res.warningDaysUntil).toBeNull()
    expect(res.warningTier).toBeNull()
  })
})

describe("computeDueHighlight — three-tier: soon (red, ≤3 days) vs upcoming (gold, >3 days)", () => {
  // Brisbane today is 2026-05-31.
  it("tags a 1-day-out date as soon", () => {
    const res = computeDueHighlight({
      candidates: [{ label: "Settlement", date: d("2026-06-01T00:00:00.000Z") }],
      now: NOW,
      clearedAt: null,
    })
    expect(res.warning).toBe(true)
    expect(res.warningTier).toBe("soon")
    expect(res.warningDaysUntil).toBe(1)
  })

  it("tags a far-future date (40 days out) as upcoming, uncapped countdown", () => {
    const res = computeDueHighlight({
      candidates: [{ label: "Settlement", date: d("2026-07-10T00:00:00.000Z") }],
      now: NOW,
      clearedAt: null,
    })
    expect(res.active).toBe(false)
    expect(res.warning).toBe(true)
    expect(res.warningLabels).toEqual(["Settlement"])
    expect(res.warningTier).toBe("upcoming")
    expect(res.warningDaysUntil).toBe(40)
  })

  it("the EARLIEST future date sets the tier: a 2-day date beats a far 30-day date → soon", () => {
    const res = computeDueHighlight({
      candidates: [
        { label: "Settlement", date: d("2026-06-30T00:00:00.000Z") }, // ~30 days
        { label: "Finance", date: d("2026-06-02T00:00:00.000Z") }, // 2 days (earliest)
      ],
      now: NOW,
      clearedAt: null,
    })
    expect(res.warning).toBe(true)
    expect(res.warningLabels).toEqual(["Finance"])
    expect(res.warningTier).toBe("soon")
    expect(res.warningDaysUntil).toBe(2)
  })

  it("gives green precedence over both warning tiers (overdue → green, no warningTier)", () => {
    const res = computeDueHighlight({
      candidates: [
        { label: "Finance", date: d("2026-05-20T00:00:00.000Z") }, // overdue → green
        { label: "Settlement", date: d("2026-07-10T00:00:00.000Z") }, // far future
      ],
      now: NOW,
      clearedAt: null,
    })
    expect(res.active).toBe(true)
    expect(res.labels).toEqual(["Finance"])
    expect(res.warning).toBe(false)
    expect(res.warningTier).toBeNull()
  })

  it("shows gold (upcoming) for a far future date even after a prior clear", () => {
    const res = computeDueHighlight({
      candidates: [{ label: "Settlement", date: d("2026-07-10T00:00:00.000Z") }],
      now: NOW,
      clearedAt: d("2026-05-31T02:00:00.000Z"),
    })
    expect(res.warning).toBe(true)
    expect(res.warningTier).toBe("upcoming")
  })
})
