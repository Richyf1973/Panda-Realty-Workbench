import { describe, expect, it } from "vitest"

import {
  consumeAdminRelatedInlineProgrammaticFocus,
  markAdminRelatedInlineProgrammaticFocus,
} from "./admin-related-inline-programmatic-focus"

describe("admin-related-inline-programmatic-focus", () => {
  it("consumes a mark once per element", () => {
    const el = {} as Element
    expect(consumeAdminRelatedInlineProgrammaticFocus(el)).toBe(false)
    markAdminRelatedInlineProgrammaticFocus(el)
    expect(consumeAdminRelatedInlineProgrammaticFocus(el)).toBe(true)
    expect(consumeAdminRelatedInlineProgrammaticFocus(el)).toBe(false)
  })
})
