import { describe, expect, it } from "vitest"

import {
  buyerOffersWorkspaceLinesHavePositiveOffer,
  parseBuyerOfferStringToNumber,
} from "@/lib/admin/property-entity-buyer-offers-pipeline.shared"

describe("property-entity-buyer-offers-pipeline.shared", () => {
  describe("parseBuyerOfferStringToNumber", () => {
    it("treats empty and whitespace as 0", () => {
      expect(parseBuyerOfferStringToNumber("")).toBe(0)
      expect(parseBuyerOfferStringToNumber("   ")).toBe(0)
    })

    it("parses integers and decimals", () => {
      expect(parseBuyerOfferStringToNumber("450000")).toBe(450_000)
      expect(parseBuyerOfferStringToNumber("450000.50")).toBe(450_000.5)
    })

    it("strips thousands separators", () => {
      expect(parseBuyerOfferStringToNumber("450,000")).toBe(450_000)
      expect(parseBuyerOfferStringToNumber("450,000.00")).toBe(450_000)
    })

    it("returns 0 for non-numeric garbage", () => {
      expect(parseBuyerOfferStringToNumber("abc")).toBe(0)
    })
  })

  describe("buyerOffersWorkspaceLinesHavePositiveOffer", () => {
    it("is false when all offers are zero or empty", () => {
      expect(
        buyerOffersWorkspaceLinesHavePositiveOffer([
          { offer: "" },
          { offer: "0" },
          { offer: "0.00" },
        ]),
      ).toBe(false)
    })

    it("is true when any line is positive", () => {
      expect(
        buyerOffersWorkspaceLinesHavePositiveOffer([
          { offer: "0" },
          { offer: "100" },
        ]),
      ).toBe(true)
    })
  })
})
