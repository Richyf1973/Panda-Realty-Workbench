import { describe, expect, it } from "vitest"

import { conditionDueRowTestIdSlug } from "./condition-due-test-id"

describe("conditionDueRowTestIdSlug", () => {
  it("uses -and- instead of ampersand for Building & Pest", () => {
    expect(conditionDueRowTestIdSlug("Building & Pest")).toBe("building-and-pest")
  })

  it("collapses spaces and trims", () => {
    expect(conditionDueRowTestIdSlug("  Cooling Off  ")).toBe("cooling-off")
    expect(conditionDueRowTestIdSlug("Due Diligence")).toBe("due-diligence")
  })

  it("leaves simple single-word labels unchanged aside from lowercasing", () => {
    expect(conditionDueRowTestIdSlug("Finance")).toBe("finance")
    expect(conditionDueRowTestIdSlug("Completion Date")).toBe("completion-date")
  })
})
