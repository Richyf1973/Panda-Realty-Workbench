import { describe, expect, it } from "vitest"

import {
  adminEntityIntegerInputKeyShouldPass,
  sanitizeAdminEntityIntegerInput,
} from "./admin-entity-integer-input"

describe("sanitizeAdminEntityIntegerInput", () => {
  it("keeps digits only", () => {
    expect(sanitizeAdminEntityIntegerInput("12a3")).toBe("123")
    expect(sanitizeAdminEntityIntegerInput("1.5")).toBe("15")
    expect(sanitizeAdminEntityIntegerInput("")).toBe("")
  })

  it("allows leading minus when enabled", () => {
    expect(sanitizeAdminEntityIntegerInput("-3", { allowLeadingMinus: true })).toBe(
      "-3",
    )
    expect(sanitizeAdminEntityIntegerInput("−4", { allowLeadingMinus: true })).toBe(
      "-4",
    )
    expect(sanitizeAdminEntityIntegerInput("-")).toBe("")
    expect(sanitizeAdminEntityIntegerInput("-", { allowLeadingMinus: true })).toBe(
      "-",
    )
  })

  it("allows comma-separated quantities when enabled", () => {
    expect(
      sanitizeAdminEntityIntegerInput("37, 5, 23", {
        allowCommaSeparatedQuantities: true,
      }),
    ).toBe("37, 5, 23")
    expect(
      sanitizeAdminEntityIntegerInput("1a2,3", {
        allowCommaSeparatedQuantities: true,
      }),
    ).toBe("12,3")
  })
})

describe("adminEntityIntegerInputKeyShouldPass", () => {
  function ev(
    key: string,
    value: string,
    start: number,
    end: number,
    code?: string,
  ) {
    return {
      key,
      ...(code != null ? { code } : {}),
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      currentTarget: { value, selectionStart: start, selectionEnd: end },
    }
  }

  it("blocks letters", () => {
    expect(adminEntityIntegerInputKeyShouldPass(ev("a", "1", 1, 1))).toBe(false)
  })

  it("allows digits", () => {
    expect(adminEntityIntegerInputKeyShouldPass(ev("2", "1", 1, 1))).toBe(true)
  })

  it("allows comma and space when comma-separated quantities are enabled", () => {
    const opts = { allowCommaSeparatedQuantities: true as const }
    expect(adminEntityIntegerInputKeyShouldPass(ev(",", "37", 2, 2), opts)).toBe(
      true,
    )
    expect(
      adminEntityIntegerInputKeyShouldPass(ev(",", "37", 2, 2, "Comma"), opts),
    ).toBe(true)
    expect(adminEntityIntegerInputKeyShouldPass(ev(" ", "37,", 3, 3), opts)).toBe(
      true,
    )
  })

  it("blocks comma when comma-separated quantities are disabled", () => {
    expect(adminEntityIntegerInputKeyShouldPass(ev(",", "37", 2, 2))).toBe(false)
  })
})
