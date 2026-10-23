import { describe, expect, it } from "vitest"

import { computeNextConditionDue } from "./next-condition-due"
import { computeDueHighlight, startOfBrisbaneDayUtc } from "./due-highlight"

// Fixed "now" only used for the computeDueHighlight cross-checks; computeNextConditionDue itself
// is time-independent (no `now`).
const NOW = new Date("2026-05-31T03:00:00.000Z") // 2026-05-31 13:00 Brisbane (UTC+10)
const d = (iso: string) => new Date(iso)
const floor = (iso: string) => startOfBrisbaneDayUtc(d(iso)).getTime()

describe("computeNextConditionDue", () => {
  it("returns null when there are no candidates", () => {
    expect(computeNextConditionDue({ candidates: [], clearedAt: null })).toBeNull()
  })

  it("returns null when all candidate dates are null", () => {
    expect(
      computeNextConditionDue({
        candidates: [
          { label: "Finance", date: null },
          { label: "Settlement", date: null },
        ],
        clearedAt: null,
      }),
    ).toBeNull()
  })

  it("returns a single future candidate's Brisbane-floored date", () => {
    const res = computeNextConditionDue({
      candidates: [{ label: "Finance", date: d("2026-06-10T00:00:00.000Z") }],
      clearedAt: null,
    })
    expect(res).not.toBeNull()
    expect(res!.getTime()).toBe(floor("2026-06-10T00:00:00.000Z"))
  })

  it("returns the earliest of several candidates", () => {
    const res = computeNextConditionDue({
      candidates: [
        { label: "Settlement", date: d("2026-07-01T00:00:00.000Z") },
        { label: "Finance", date: d("2026-06-04T00:00:00.000Z") },
        { label: "Building & Pest", date: d("2026-06-20T00:00:00.000Z") },
      ],
      clearedAt: null,
    })
    expect(res!.getTime()).toBe(floor("2026-06-04T00:00:00.000Z"))
  })

  it("returns an overdue uncleared candidate (earliest overall) over a later future one", () => {
    const res = computeNextConditionDue({
      candidates: [
        { label: "Finance", date: d("2026-05-20T00:00:00.000Z") }, // overdue vs NOW
        { label: "Settlement", date: d("2026-06-20T00:00:00.000Z") },
      ],
      clearedAt: null,
    })
    expect(res!.getTime()).toBe(floor("2026-05-20T00:00:00.000Z"))
  })

  it("excludes a cleared overdue candidate and returns the later future one", () => {
    const res = computeNextConditionDue({
      candidates: [
        { label: "Finance", date: d("2026-05-20T00:00:00.000Z") }, // cleared
        { label: "Settlement", date: d("2026-06-20T00:00:00.000Z") },
      ],
      clearedAt: d("2026-05-25T03:00:00.000Z"), // after the Finance day
    })
    expect(res!.getTime()).toBe(floor("2026-06-20T00:00:00.000Z"))
  })

  it("keeps the earliest candidate when clearedAt is before every candidate", () => {
    const res = computeNextConditionDue({
      candidates: [
        { label: "Finance", date: d("2026-06-04T00:00:00.000Z") },
        { label: "Settlement", date: d("2026-06-20T00:00:00.000Z") },
      ],
      clearedAt: d("2026-05-01T00:00:00.000Z"),
    })
    expect(res!.getTime()).toBe(floor("2026-06-04T00:00:00.000Z"))
  })

  it("matches computeDueHighlight: equals the green (active) candidate's date", () => {
    const candidates = [
      { label: "Finance", date: d("2026-05-20T00:00:00.000Z") },
      { label: "Settlement", date: d("2026-06-20T00:00:00.000Z") },
    ]
    const hl = computeDueHighlight({ candidates, now: NOW, clearedAt: null })
    expect(hl.active).toBe(true)
    expect(hl.labels).toEqual(["Finance"])
    const res = computeNextConditionDue({ candidates, clearedAt: null })
    expect(res!.getTime()).toBe(floor("2026-05-20T00:00:00.000Z"))
  })

  it("matches computeDueHighlight: equals the warning candidate's date when only upcoming", () => {
    const candidates = [
      { label: "Finance", date: d("2026-06-04T00:00:00.000Z") },
      { label: "Settlement", date: d("2026-06-20T00:00:00.000Z") },
    ]
    const hl = computeDueHighlight({ candidates, now: NOW, clearedAt: null })
    expect(hl.active).toBe(false)
    expect(hl.warning).toBe(true)
    expect(hl.warningLabels).toEqual(["Finance"])
    const res = computeNextConditionDue({ candidates, clearedAt: null })
    expect(res!.getTime()).toBe(floor("2026-06-04T00:00:00.000Z"))
  })
})
