import { describe, expect, it } from "vitest"

import { formatCoolingOffLine, isManufacturedHome, resolveCoolingOffDays } from "./cooling-off-days"

describe("resolveCoolingOffDays", () => {
  it("manufactured home, not waived → 21", () => {
    expect(resolveCoolingOffDays("Manufactured Home", false)).toBe(21)
  })

  it("manufactured home, waived → 7", () => {
    expect(resolveCoolingOffDays("Manufactured Home", true)).toBe(7)
  })

  it("residential house, not waived → 5", () => {
    expect(resolveCoolingOffDays("House", false)).toBe(5)
  })

  it("residential house, waived → 0", () => {
    expect(resolveCoolingOffDays("House", true)).toBe(0)
  })

  it("matches manufactured home case-insensitively and trims whitespace", () => {
    expect(resolveCoolingOffDays("MANUFACTURED HOME", false)).toBe(21)
    expect(resolveCoolingOffDays("manufactured home", true)).toBe(7)
    expect(resolveCoolingOffDays("  Manufactured Home  ", false)).toBe(21)
  })

  it("treats a sub-typed house (House: Duplex) as residential, not manufactured", () => {
    expect(resolveCoolingOffDays("House: Duplex", false)).toBe(5)
    expect(resolveCoolingOffDays("House: Duplex", true)).toBe(0)
  })

  it("treats null/empty/undefined property type as residential", () => {
    expect(resolveCoolingOffDays(null, false)).toBe(5)
    expect(resolveCoolingOffDays(undefined, false)).toBe(5)
    expect(resolveCoolingOffDays("", true)).toBe(0)
  })

  it("treats a null/undefined waive flag as not waived", () => {
    expect(resolveCoolingOffDays("Manufactured Home", null)).toBe(21)
    expect(resolveCoolingOffDays("House", undefined)).toBe(5)
  })
})

describe("isManufacturedHome", () => {
  it("is true only for the exact Manufactured Home category (case/space-insensitive)", () => {
    expect(isManufacturedHome("Manufactured Home")).toBe(true)
    expect(isManufacturedHome("manufactured home")).toBe(true)
    expect(isManufacturedHome("  MANUFACTURED HOME ")).toBe(true)
  })

  it("is false for any other type, sub-type, null, or empty", () => {
    expect(isManufacturedHome("House")).toBe(false)
    expect(isManufacturedHome("House: Duplex")).toBe(false)
    expect(isManufacturedHome("Manufactured")).toBe(false)
    expect(isManufacturedHome(null)).toBe(false)
    expect(isManufacturedHome(undefined)).toBe(false)
    expect(isManufacturedHome("")).toBe(false)
  })
})

describe("formatCoolingOffLine", () => {
  it("renders the label exactly as Richard specified: Cooling Off - <days>", () => {
    expect(formatCoolingOffLine(21)).toBe("Cooling Off - 21")
    expect(formatCoolingOffLine(7)).toBe("Cooling Off - 7")
    expect(formatCoolingOffLine(5)).toBe("Cooling Off - 5")
    expect(formatCoolingOffLine(0)).toBe("Cooling Off - 0")
  })
})
