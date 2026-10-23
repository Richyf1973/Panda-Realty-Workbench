import { describe, expect, it } from "vitest"

import { adminListFiltersDifferFromSegment } from "./admin-entity-list-filters-differ"

describe("adminListFiltersDifferFromSegment", () => {
  it("is true whenever a non-boolean filter is active, regardless of the boolean segment", () => {
    expect(adminListFiltersDifferFromSegment(true, false, "all", "all")).toBe(true)
    expect(adminListFiltersDifferFromSegment(true, true, "true", "true")).toBe(true)
  })

  it("ignores the boolean segment when the boolean filter is disabled", () => {
    expect(adminListFiltersDifferFromSegment(false, false, "true", "all")).toBe(false)
    expect(adminListFiltersDifferFromSegment(false, false, "false", "all")).toBe(false)
  })

  describe("toolbar sense (compare against 'all')", () => {
    it("a default-on boolean toggle counts as active (true !== all)", () => {
      expect(adminListFiltersDifferFromSegment(false, true, "true", "all")).toBe(true)
    })
    it("the 'all' segment is not active", () => {
      expect(adminListFiltersDifferFromSegment(false, true, "all", "all")).toBe(false)
    })
  })

  describe("default-segment sense (entity default 'true', e.g. Favorites-on)", () => {
    it("at the default segment, nothing differs", () => {
      expect(adminListFiltersDifferFromSegment(false, true, "true", "true")).toBe(false)
    })
    it("switching the toggle off-default differs", () => {
      expect(adminListFiltersDifferFromSegment(false, true, "all", "true")).toBe(true)
      expect(adminListFiltersDifferFromSegment(false, true, "false", "true")).toBe(true)
    })
    it("an active non-boolean filter differs even while the toggle sits at its default", () => {
      expect(adminListFiltersDifferFromSegment(true, true, "true", "true")).toBe(true)
    })
  })

  describe("entity with default segment 'all' (no special default)", () => {
    it("behaves identically to the toolbar sense", () => {
      expect(adminListFiltersDifferFromSegment(false, true, "all", "all")).toBe(false)
      expect(adminListFiltersDifferFromSegment(false, true, "true", "all")).toBe(true)
      expect(adminListFiltersDifferFromSegment(false, true, "false", "all")).toBe(true)
    })
  })
})
