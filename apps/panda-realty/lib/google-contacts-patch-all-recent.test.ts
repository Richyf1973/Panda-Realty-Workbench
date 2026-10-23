import { afterEach, describe, expect, it, vi } from "vitest"

import {
  getGoogleContactsPatchAllPropertyListAllowlist,
  getGoogleContactsPatchAllRecentFilter,
} from "./google-contacts-patch-all-recent"

describe("getGoogleContactsPatchAllRecentFilter", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("returns null in production even when hours is set", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("PANDA_GOOGLE_CONTACTS_PATCH_ALL_RECENT_HOURS", "24")
    expect(getGoogleContactsPatchAllRecentFilter()).toBeNull()
  })

  it("returns null in development when hours is unset", () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("PANDA_GOOGLE_CONTACTS_PATCH_ALL_RECENT_HOURS", "")
    expect(getGoogleContactsPatchAllRecentFilter()).toBeNull()
  })

  it("returns null in development for non-positive hours", () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("PANDA_GOOGLE_CONTACTS_PATCH_ALL_RECENT_HOURS", "0")
    expect(getGoogleContactsPatchAllRecentFilter()).toBeNull()
  })

  it("returns filter in development with positive hours", () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("PANDA_GOOGLE_CONTACTS_PATCH_ALL_RECENT_HOURS", "24")
    const f = getGoogleContactsPatchAllRecentFilter()
    expect(f).not.toBeNull()
    expect(f!.hours).toBe(24)
    expect(f!.cutoff.getTime()).toBeLessThanOrEqual(Date.now())
  })

  it("today: cutoff is midnight UTC today, not right now", () => {
    const now = Date.now()
    const f = getGoogleContactsPatchAllRecentFilter("today")
    expect(f).not.toBeNull()
    // cutoff must be strictly before now (midnight is earlier in the day)
    expect(f!.cutoff.getTime()).toBeLessThan(now)
    // cutoff must be at UTC midnight
    const c = f!.cutoff
    expect(c.getUTCHours()).toBe(0)
    expect(c.getUTCMinutes()).toBe(0)
    expect(c.getUTCSeconds()).toBe(0)
    expect(c.getUTCMilliseconds()).toBe(0)
    // hours in the filter is how many hours since midnight — between 0 and 24
    expect(f!.hours).toBeGreaterThanOrEqual(0)
    expect(f!.hours).toBeLessThanOrEqual(24)
  })

  it("yesterday: cutoff is ~48h ago", () => {
    const before = Date.now()
    const f = getGoogleContactsPatchAllRecentFilter("yesterday")
    const after = Date.now()
    expect(f).not.toBeNull()
    const expected = 48 * 60 * 60 * 1000
    expect(before - f!.cutoff.getTime()).toBeGreaterThanOrEqual(expected - 100)
    expect(after - f!.cutoff.getTime()).toBeLessThanOrEqual(expected + 100)
  })

  it("all: returns null (no filter)", () => {
    expect(getGoogleContactsPatchAllRecentFilter("all")).toBeNull()
  })
})

describe("getGoogleContactsPatchAllPropertyListAllowlist", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("returns null in production when ids are set", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("PANDA_GOOGLE_CONTACTS_PATCH_ALL_PROPERTY_LIST_IDS", "10,20")
    expect(getGoogleContactsPatchAllPropertyListAllowlist()).toBeNull()
  })

  it("returns null in development when unset", () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("PANDA_GOOGLE_CONTACTS_PATCH_ALL_PROPERTY_LIST_IDS", "")
    expect(getGoogleContactsPatchAllPropertyListAllowlist()).toBeNull()
  })

  it("parses deduped sorted ids in development", () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("PANDA_GOOGLE_CONTACTS_PATCH_ALL_PROPERTY_LIST_IDS", " 30 , 12 , 30, bad, 12 ")
    expect(getGoogleContactsPatchAllPropertyListAllowlist()).toEqual([12, 30])
  })
})
