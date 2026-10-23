import { describe, expect, it } from "vitest"

import { computeRelatedInlineActionsColumnCalc } from "./admin-entity-related-inline-actions-width"

describe("computeRelatedInlineActionsColumnCalc", () => {
  it("delete only (no custom, no nested)", () => {
    expect(
      computeRelatedInlineActionsColumnCalc({
        collection: {},
        hasCustomRowActions: false,
        hasNestedOpenButton: false,
        hasRelatedTargetNestedOpenButton: false,
      }),
    ).toBe("calc(2.75rem + 3px)")
  })

  it("custom default slot + delete (two icons)", () => {
    expect(
      computeRelatedInlineActionsColumnCalc({
        collection: {},
        hasCustomRowActions: true,
        hasNestedOpenButton: false,
        hasRelatedTargetNestedOpenButton: false,
      }),
    ).toBe("calc(4.75rem + 3px)")
  })

  it("custom declares two icon slots + delete (three icons)", () => {
    expect(
      computeRelatedInlineActionsColumnCalc({
        collection: { inlineCustomRowActionIconSlots: 2 },
        hasCustomRowActions: true,
        hasNestedOpenButton: false,
        hasRelatedTargetNestedOpenButton: false,
      }),
    ).toBe("calc(6.75rem + 3px)")
  })

  it("nested + custom + delete (three icons)", () => {
    expect(
      computeRelatedInlineActionsColumnCalc({
        collection: {},
        hasCustomRowActions: true,
        hasNestedOpenButton: true,
        hasRelatedTargetNestedOpenButton: false,
      }),
    ).toBe("calc(6.75rem + 3px)")
  })

  it("related target nested + delete (two icons)", () => {
    expect(
      computeRelatedInlineActionsColumnCalc({
        collection: {},
        hasCustomRowActions: false,
        hasNestedOpenButton: false,
        hasRelatedTargetNestedOpenButton: true,
      }),
    ).toBe("calc(4.75rem + 3px)")
  })

  it("rem override ignores counts", () => {
    expect(
      computeRelatedInlineActionsColumnCalc({
        collection: { inlineRowActionsColumnWidthRemOverride: 10 },
        hasCustomRowActions: true,
        hasNestedOpenButton: true,
        hasRelatedTargetNestedOpenButton: false,
      }),
    ).toBe("calc(10rem + 3px)")
  })
})
