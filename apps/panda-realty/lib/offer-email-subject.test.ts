import { describe, expect, it } from "vitest"

import { buildOfferEmailSubject } from "./offer-email-subject"

describe("buildOfferEmailSubject", () => {
  it("formats subject as 'Offer Form — BuyerName — Address' when both are present", () => {
    expect(
      buildOfferEmailSubject("Test Buyer", "54 Bsty drive, Caboolture"),
    ).toBe("Offer Form — Test Buyer — 54 Bsty drive, Caboolture")
  })

  it("omits address segment when property label is null", () => {
    expect(buildOfferEmailSubject("Test Buyer", null)).toBe(
      "Offer Form — Test Buyer",
    )
  })

  it("omits name segment when entity name is null", () => {
    expect(buildOfferEmailSubject(null, "54 Bsty drive, Caboolture")).toBe(
      "Offer Form — 54 Bsty drive, Caboolture",
    )
  })

  it("falls back to bare 'Offer Form' when both are null", () => {
    expect(buildOfferEmailSubject(null, null)).toBe("Offer Form")
  })

  it("omits name segment when entity name is empty string", () => {
    expect(buildOfferEmailSubject("", "54 Bsty drive, Caboolture")).toBe(
      "Offer Form — 54 Bsty drive, Caboolture",
    )
  })

  it("omits address segment when property label is empty string", () => {
    expect(buildOfferEmailSubject("Test Buyer", "")).toBe(
      "Offer Form — Test Buyer",
    )
  })
})
