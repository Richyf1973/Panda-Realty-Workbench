import { describe, expect, it } from "vitest"

import {
  formatGoogleContactPropertyContext,
  GOOGLE_CONTACT_PROPERTY_CONTEXT_MAX_CHARS,
} from "./google-contact-property-context"

describe("formatGoogleContactPropertyContext", () => {
  it("dedupes, sorts, and joins with semicolons", () => {
    expect(formatGoogleContactPropertyContext(["B St", "A St", "B St"])).toBe("A St; B St")
  })

  it("trims and drops blanks", () => {
    expect(formatGoogleContactPropertyContext(["  x  ", "", "  "])).toBe("x")
  })

  it("truncates long aggregates with ellipsis", () => {
    const long = "x".repeat(GOOGLE_CONTACT_PROPERTY_CONTEXT_MAX_CHARS + 40)
    const out = formatGoogleContactPropertyContext([long])
    expect(out.length).toBeLessThanOrEqual(GOOGLE_CONTACT_PROPERTY_CONTEXT_MAX_CHARS)
    expect(out.endsWith("…")).toBe(true)
  })

  it("returns empty string when no usable addresses", () => {
    expect(formatGoogleContactPropertyContext([])).toBe("")
    expect(formatGoogleContactPropertyContext(["", "  "])).toBe("")
  })
})
