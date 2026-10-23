import { describe, expect, it } from "vitest"

import { formatAuPrice } from "@/lib/format-au-price"
import { mapContractSpData } from "./prefill-mappers"
import type { ContractSpApiData } from "./prefill-mappers"

describe("formatAuPrice", () => {
  it("returns empty string for null", () => {
    expect(formatAuPrice(null)).toBe("")
  })

  it("returns empty string for empty string", () => {
    expect(formatAuPrice("")).toBe("")
  })

  it("formats zero as '0.00'", () => {
    expect(formatAuPrice("0")).toBe("0.00")
  })

  it("formats integer with commas and two decimal places", () => {
    expect(formatAuPrice("725000")).toBe("725,000.00")
  })

  it("formats decimal value preserving two decimal places", () => {
    expect(formatAuPrice("725000.50")).toBe("725,000.50")
  })

  it("returns empty string for non-numeric string", () => {
    expect(formatAuPrice("not-a-number")).toBe("")
  })
})

const BASE: ContractSpApiData = {
  sellers: [],
  buyers: [],
  sellerSolicitor: null,
  buyerSolicitor: null,
  propertyStreetAddress: "1 Test St",
  propertySuburb: "Brisbane City",
  propertyState: "QLD",
  propertyPostcode: "4000",
  propertyLot: "12",
  propertyPlan: "SP123456",
  propertyTitleReference: "12/SP123456",
  salePrice: "725000",
  settlementDate: null,
  settlementPeriod: null,
  depositInitial: null,
  depositBalance: null,
  financeDays: null,
  buildingPestDays: null,
  isCashOffer: null,
  isSubjectToFinance: null,
  isSubjectToSale: null,
  subjectToSaleAddress: null,
  financeBank: null,
  conditionNotes: null,
  coolingOffDays: null,
}

describe("mapContractSpData — finance conditional logic", () => {
  it("leaves finance fields blank when isCashOffer is true", () => {
    const result = mapContractSpData({ ...BASE, isCashOffer: true, isSubjectToFinance: true, financeDays: 14, financeBank: "CBA" }, undefined)
    expect(result.financeAmount).toBe("")
    expect(result.financier).toBe("")
    expect(result.financeDate).toBe("")
  })

  it("leaves finance fields blank when isSubjectToFinance is false", () => {
    const result = mapContractSpData({ ...BASE, isCashOffer: false, isSubjectToFinance: false }, undefined)
    expect(result.financeAmount).toBe("")
    expect(result.financier).toBe("")
    expect(result.financeDate).toBe("")
  })

  it("leaves finance fields blank when isSubjectToFinance is null", () => {
    const result = mapContractSpData({ ...BASE, isCashOffer: false, isSubjectToFinance: null }, undefined)
    expect(result.financeAmount).toBe("")
    expect(result.financier).toBe("")
    expect(result.financeDate).toBe("")
  })

  it("auto-populates finance fields when subject to finance and not cash", () => {
    const result = mapContractSpData({ ...BASE, isCashOffer: false, isSubjectToFinance: true, financeDays: 14, financeBank: "Commonwealth Bank" }, undefined)
    expect(result.financeAmount).toBe("Sufficient to complete the transaction")
    expect(result.financier).toBe("Commonwealth Bank")
    expect(result.financeDate).toBe("14 Days from Contract Date")
  })

  it("uses 'Buyer's Choice' as financier when financeBank is blank", () => {
    const result = mapContractSpData({ ...BASE, isCashOffer: false, isSubjectToFinance: true, financeDays: 21, financeBank: null }, undefined)
    expect(result.financier).toBe("Buyer's Choice")
  })

  it("leaves financeDate blank when financeDays is null even if subject to finance", () => {
    const result = mapContractSpData({ ...BASE, isCashOffer: false, isSubjectToFinance: true, financeDays: null, financeBank: "ANZ" }, undefined)
    expect(result.financeDate).toBe("")
  })
})

describe("mapContractSpData — building/pest inspection", () => {
  it("leaves inspectionDate blank when buildingPestDays is null", () => {
    const result = mapContractSpData({ ...BASE, buildingPestDays: null }, undefined)
    expect(result.inspectionDate).toBe("")
  })

  it("leaves inspectionDate blank when buildingPestDays is 0 (no inspection selected)", () => {
    const result = mapContractSpData({ ...BASE, buildingPestDays: 0 }, undefined)
    expect(result.inspectionDate).toBe("")
  })

  it("populates inspectionDate when buildingPestDays > 0", () => {
    const result = mapContractSpData({ ...BASE, buildingPestDays: 7 }, undefined)
    expect(result.inspectionDate).toBe("7 Days from Contract Date")
  })
})

describe("mapContractSpData — settlement date", () => {
  it("uses actual settlementDate when present", () => {
    const result = mapContractSpData({ ...BASE, settlementDate: "2026-08-15", settlementPeriod: "30" }, undefined)
    expect(result.settlementDate).toBe("2026-08-15")
  })

  it("falls back to settlement period when settlementDate is null", () => {
    const result = mapContractSpData({ ...BASE, settlementDate: null, settlementPeriod: "30" }, undefined)
    expect(result.settlementDate).toBe("30 Days from Contract Date")
  })

  it("produces empty string when both settlementDate and settlementPeriod are null", () => {
    const result = mapContractSpData({ ...BASE, settlementDate: null, settlementPeriod: null }, undefined)
    expect(result.settlementDate).toBe("")
  })
})

describe("mapContractSpData — special conditions", () => {
  it("includes only ET clause when no conditionNotes and not subject to sale", () => {
    const result = mapContractSpData(BASE, undefined)
    expect(result.specialConditions).toBe(
      "1. ELECTRONIC TRANSMISSION: The parties consent to this contract being signed, executed, and communicated electronically in accordance with the Electronic Transactions (Queensland) Act 2001.",
    )
  })

  it("includes ET + Further Terms when conditionNotes is present", () => {
    const result = mapContractSpData({ ...BASE, conditionNotes: "No pets allowed on premises." }, undefined)
    expect(result.specialConditions).toContain("1. ELECTRONIC TRANSMISSION:")
    expect(result.specialConditions).toContain("2. FURTHER TERMS: No pets allowed on premises.")
  })

  it("numbers Subject to Sale as 2 when conditionNotes is absent", () => {
    const result = mapContractSpData({ ...BASE, isSubjectToSale: true, subjectToSaleAddress: "5 Oak Ave, Kelvin Grove QLD 4059" }, undefined)
    const lines = result.specialConditions.split("\n\n")
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatch(/^1\. ELECTRONIC TRANSMISSION/)
    expect(lines[1]).toMatch(/^2\. SUBJECT TO SALE/)
    expect(lines[1]).toContain("5 Oak Ave, Kelvin Grove QLD 4059")
  })

  it("numbers all three clauses sequentially when all conditions present", () => {
    const result = mapContractSpData({
      ...BASE,
      conditionNotes: "Buyer to complete inspection within 7 days.",
      isSubjectToSale: true,
      subjectToSaleAddress: "10 Pine Rd, Toowong QLD 4066",
    }, undefined)
    const lines = result.specialConditions.split("\n\n")
    expect(lines).toHaveLength(3)
    expect(lines[0]).toMatch(/^1\./)
    expect(lines[1]).toMatch(/^2\./)
    expect(lines[2]).toMatch(/^3\./)
  })

  it("uses placeholder address when subjectToSaleAddress is blank", () => {
    const result = mapContractSpData({ ...BASE, isSubjectToSale: true, subjectToSaleAddress: null }, undefined)
    expect(result.specialConditions).toContain("[property address]")
  })

  it("ignores whitespace-only conditionNotes", () => {
    const result = mapContractSpData({ ...BASE, conditionNotes: "   " }, undefined)
    const lines = result.specialConditions.split("\n\n")
    expect(lines).toHaveLength(1)
  })

  it("inserts the Cooling Off clause right after ET when coolingOffDays is set", () => {
    const result = mapContractSpData({ ...BASE, coolingOffDays: 21 }, undefined)
    const lines = result.specialConditions.split("\n\n")
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatch(/^1\. ELECTRONIC TRANSMISSION/)
    expect(lines[1]).toBe("2. Cooling Off - 21")
  })

  it("renders a waived cooling off as 0 (Cooling Off - 0)", () => {
    const result = mapContractSpData({ ...BASE, coolingOffDays: 0 }, undefined)
    expect(result.specialConditions).toContain("Cooling Off - 0")
  })

  it("omits the Cooling Off clause entirely when coolingOffDays is null", () => {
    const result = mapContractSpData({ ...BASE, coolingOffDays: null }, undefined)
    expect(result.specialConditions).not.toContain("Cooling Off")
  })

  it("surfaces coolingOffDays as a string value (drives the page-6 caption)", () => {
    expect(mapContractSpData({ ...BASE, coolingOffDays: 21 }, undefined).coolingOffDays).toBe("21")
    expect(mapContractSpData({ ...BASE, coolingOffDays: 0 }, undefined).coolingOffDays).toBe("0")
    expect(mapContractSpData({ ...BASE, coolingOffDays: null }, undefined).coolingOffDays).toBe("")
  })

  it("numbers Cooling Off before Further Terms and Subject to Sale", () => {
    const result = mapContractSpData({
      ...BASE,
      coolingOffDays: 7,
      conditionNotes: "Buyer to complete inspection within 7 days.",
      isSubjectToSale: true,
      subjectToSaleAddress: "10 Pine Rd, Toowong QLD 4066",
    }, undefined)
    const lines = result.specialConditions.split("\n\n")
    expect(lines).toHaveLength(4)
    expect(lines[0]).toMatch(/^1\. ELECTRONIC TRANSMISSION/)
    expect(lines[1]).toBe("2. Cooling Off - 7")
    expect(lines[2]).toMatch(/^3\. FURTHER TERMS/)
    expect(lines[3]).toMatch(/^4\. SUBJECT TO SALE/)
  })
})

describe("mapContractSpData — template override priority", () => {
  it("template purchasePrice wins over API data", () => {
    const result = mapContractSpData({ ...BASE, salePrice: "725000" }, { purchasePrice: "$700,000.00" })
    expect(result.purchasePrice).toBe("$700,000.00")
  })

  it("template buyerSolicitorName wins over API data", () => {
    const result = mapContractSpData(
      { ...BASE, buyerSolicitor: { entityName: "Smith Legal", ref: null, address: null, suburb: null, state: null, postcode: null, phoneNumber: null, emailAddress: null } },
      { buyerSolicitorName: "Jones & Co" },
    )
    expect(result.buyerSolicitorName).toBe("Jones & Co")
  })

  it("template soldAsOption wins over default 'freehold'", () => {
    const result = mapContractSpData(BASE, { soldAsOption: "leasehold" })
    expect(result.soldAsOption).toBe("leasehold")
  })

  it("template empty string for specialConditions is preserved (intentional blank)", () => {
    const result = mapContractSpData(BASE, { specialConditions: "" })
    expect(result.specialConditions).toBe("")
  })

  it("template empty string for financeAmount is preserved (cash buyer scenario)", () => {
    const result = mapContractSpData(
      { ...BASE, isCashOffer: false, isSubjectToFinance: true, financeDays: 14 },
      { financeAmount: "" },
    )
    expect(result.financeAmount).toBe("")
  })
})

describe("mapContractSpData — price and deposit formatting", () => {
  it("formats salePrice with $ prefix and commas", () => {
    const result = mapContractSpData({ ...BASE, salePrice: "725000" }, undefined)
    expect(result.purchasePrice).toBe("$725,000.00")
  })

  it("formats depositInitial with $ prefix", () => {
    const result = mapContractSpData({ ...BASE, depositInitial: "10000" }, undefined)
    expect(result.depositInitial).toBe("$10,000.00")
  })

  it("formats depositBalance with $ prefix", () => {
    const result = mapContractSpData({ ...BASE, depositBalance: "715000" }, undefined)
    expect(result.depositBalance).toBe("$715,000.00")
  })

  it("leaves purchasePrice empty when salePrice is null", () => {
    const result = mapContractSpData({ ...BASE, salePrice: null }, undefined)
    expect(result.purchasePrice).toBe("")
  })
})

describe("mapContractSpData — buyer solicitor fallback", () => {
  it("shows 'To Be Confirmed' when buyerSolicitor is null and no template", () => {
    const result = mapContractSpData({ ...BASE, buyerSolicitor: null }, undefined)
    expect(result.buyerSolicitorName).toBe("To Be Confirmed")
  })

  it("uses entityName from buyerSolicitor when present and no template", () => {
    const result = mapContractSpData(
      { ...BASE, buyerSolicitor: { entityName: "Smith Legal", ref: null, address: "1 Law St", suburb: null, state: null, postcode: null, phoneNumber: "07 3000 0000", emailAddress: "sol@smithlegal.com.au" } },
      undefined,
    )
    expect(result.buyerSolicitorName).toBe("Smith Legal")
    expect(result.buyerSolicitorPhone).toBe("07 3000 0000")
    expect(result.buyerSolicitorAddress).toBe("1 Law St")
  })
})

describe("mapContractSpData — static defaults", () => {
  it("defaults soldAsOption to freehold", () => {
    expect(mapContractSpData(BASE, undefined).soldAsOption).toBe("freehold")
  })

  it("defaults landUseOption to builtOn", () => {
    expect(mapContractSpData(BASE, undefined).landUseOption).toBe("builtOn")
  })

  it("defaults depositHolder to trust account name", () => {
    expect(mapContractSpData(BASE, undefined).depositHolder).toBe("My Panda Realty Trust Account")
  })
})
