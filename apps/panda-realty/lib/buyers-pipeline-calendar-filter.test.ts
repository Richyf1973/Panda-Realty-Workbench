import { describe, expect, it } from "vitest"

import {
  filterBuyerCardsMapByCalendarMonths,
  filterPropertyCardsMapByCalendarMonths,
  getCreatedAtUtcWindowStartInclusive,
  isBuyerCreatedAtInCalendarMonthWindow,
  parseBuyersCalendarMonthsPreset,
} from "./buyers-pipeline-calendar-filter"
import type { BuyerCardCreatedAtField, PropertyCardUpdatedAtField } from "./buyers-pipeline-calendar-filter"

const now = new Date(Date.UTC(2026, 3, 15, 12, 0, 0, 0))

type TestCard = BuyerCardCreatedAtField & { propertyEntityId: number }

describe("parseBuyersCalendarMonthsPreset", () => {
  it("accepts valid presets", () => {
    expect(parseBuyersCalendarMonthsPreset("all")).toBe("all")
    expect(parseBuyersCalendarMonthsPreset("12")).toBe("12")
  })
  it("rejects unknown", () => {
    expect(parseBuyersCalendarMonthsPreset("2")).toBeNull()
    expect(parseBuyersCalendarMonthsPreset(null)).toBeNull()
  })
})

describe("getCreatedAtUtcWindowStartInclusive", () => {
  it("uses N calendar months including the current UTC month", () => {
    expect(getCreatedAtUtcWindowStartInclusive(1, now).toISOString()).toBe("2026-04-01T00:00:00.000Z")
    expect(getCreatedAtUtcWindowStartInclusive(3, now).toISOString()).toBe("2026-02-01T00:00:00.000Z")
    expect(getCreatedAtUtcWindowStartInclusive(12, now).toISOString()).toBe("2025-05-01T00:00:00.000Z")
  })
})

describe("isBuyerCreatedAtInCalendarMonthWindow", () => {
  it("includes bounds inside the window", () => {
    expect(isBuyerCreatedAtInCalendarMonthWindow("2026-04-01T00:00:00.000Z", 1, now)).toBe(true)
    expect(isBuyerCreatedAtInCalendarMonthWindow(now, 1, now)).toBe(true)
  })
  it("excludes before window start for multi-month", () => {
    expect(isBuyerCreatedAtInCalendarMonthWindow("2026-01-15T00:00:00.000Z", 3, now)).toBe(false)
  })
  it("includes February when window is last 3 calendar months from April", () => {
    expect(isBuyerCreatedAtInCalendarMonthWindow("2026-02-10T00:00:00.000Z", 3, now)).toBe(true)
  })
})

describe("filterBuyerCardsMapByCalendarMonths", () => {
  const card = (createdAt: string, id: number): TestCard => ({
    propertyEntityId: id,
    createdAt,
  })

  it("returns same reference shape for all", () => {
    const map: Record<number, TestCard[]> = { 10: [card("2026-04-02T00:00:00.000Z", 1)] }
    const out = filterBuyerCardsMapByCalendarMonths(map, "all", now)
    expect(out).toBe(map)
  })

  it("drops cards outside the preset window", () => {
    const map: Record<number, TestCard[]> = {
      10: [card("2020-01-01T00:00:00.000Z", 1), card("2026-04-02T00:00:00.000Z", 2)],
    }
    const out = filterBuyerCardsMapByCalendarMonths(map, "1", now)
    expect(out[10]).toHaveLength(1)
    expect(out[10]![0]!.propertyEntityId).toBe(2)
  })
})

type PropertyTestCard = PropertyCardUpdatedAtField & { propertyListId: number }

describe("filterPropertyCardsMapByCalendarMonths", () => {
  const card = (updatedAt: string | null, id: number): PropertyTestCard => ({
    propertyListId: id,
    updatedAt,
  })

  it("returns same reference for all", () => {
    const map: Record<number, PropertyTestCard[]> = { 5: [card("2026-04-02T00:00:00.000Z", 1)] }
    const out = filterPropertyCardsMapByCalendarMonths(map, "all", now)
    expect(out).toBe(map)
  })

  it("drops cards with updatedAt outside the preset window", () => {
    const map: Record<number, PropertyTestCard[]> = {
      5: [card("2020-01-01T00:00:00.000Z", 1), card("2026-04-10T00:00:00.000Z", 2)],
    }
    const out = filterPropertyCardsMapByCalendarMonths(map, "1", now)
    expect(out[5]).toHaveLength(1)
    expect(out[5]![0]!.propertyListId).toBe(2)
  })

  it("excludes cards with null updatedAt", () => {
    const map: Record<number, PropertyTestCard[]> = {
      5: [card(null, 1), card("2026-04-01T00:00:00.000Z", 2)],
    }
    const out = filterPropertyCardsMapByCalendarMonths(map, "3", now)
    expect(out[5]).toHaveLength(1)
    expect(out[5]![0]!.propertyListId).toBe(2)
  })
})
