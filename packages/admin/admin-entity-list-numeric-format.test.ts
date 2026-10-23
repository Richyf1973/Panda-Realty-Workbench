import { describe, expect, it } from "vitest"

import {
  formatAdminEntityDecimalAmountFormDisplay,
  formatAdminEntityNumericListCell,
} from "./admin-entity-list-numeric-format"

describe("formatAdminEntityDecimalAmountFormDisplay", () => {
  it("strips minus for default currency-style amounts", () => {
    expect(formatAdminEntityDecimalAmountFormDisplay("-3360.00")).toBe(
      "3,360.00",
    )
  })

  it("preserves minus when allowLeadingMinus is true", () => {
    expect(
      formatAdminEntityDecimalAmountFormDisplay("-3360.00", {
        allowLeadingMinus: true,
      }),
    ).toBe("-3,360.00")
  })
})

describe("formatAdminEntityNumericListCell", () => {
  it("formats signed currency when allowLeadingMinus is true", () => {
    expect(
      formatAdminEntityNumericListCell("-3360.00", {
        currencySymbol: "₱",
        allowLeadingMinus: true,
      }),
    ).toBe("₱ -3,360.00")
  })
})
