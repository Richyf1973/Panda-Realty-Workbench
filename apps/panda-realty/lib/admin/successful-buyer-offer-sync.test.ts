import { describe, expect, it } from "vitest"

import { buildSubmissionSyncPatch, isSuccessfulBuyerSyncField } from "./successful-buyer-offer-sync"

const buyer = (over: Record<string, unknown> = {}) => ({
  name: "JOHN EDWARD COLLINS",
  email: "richardtrading1973@gmail.com",
  phone: "0402071097",
  hasRep: false,
  address: "64/176 TORRENS ROAD CABOOLTURE SOUTH",
  repName: "",
  repEmail: "",
  repPhone: "",
  repIsPreferredContact: "yes",
  ...over,
})

describe("isSuccessfulBuyerSyncField", () => {
  it("accepts the four member fields", () => {
    expect(isSuccessfulBuyerSyncField("memberEmailAddress")).toBe(true)
    expect(isSuccessfulBuyerSyncField("memberName")).toBe(true)
  })
  it("rejects anything else", () => {
    expect(isSuccessfulBuyerSyncField("isBuyersRepresentative")).toBe(false)
    expect(isSuccessfulBuyerSyncField(null)).toBe(false)
  })
})

describe("buildSubmissionSyncPatch", () => {
  it("syncs email to buyers_json[0] and top-level buyerEmail, preserving extra keys", () => {
    const patch = buildSubmissionSyncPatch({
      field: "memberEmailAddress",
      value: "JOHN@COLLINSFIN.COM.AU",
      memberIndex: 0,
      buyersJson: [buyer()],
    })
    expect(patch.buyerEmail).toBe("JOHN@COLLINSFIN.COM.AU")
    expect(patch.buyersJson?.[0]).toMatchObject({
      email: "JOHN@COLLINSFIN.COM.AU",
      name: "JOHN EDWARD COLLINS",
      phone: "0402071097",
      address: "64/176 TORRENS ROAD CABOOLTURE SOUTH",
      hasRep: false,
      repIsPreferredContact: "yes",
    })
  })

  it("does not mutate the input buyers_json array", () => {
    const input = [buyer()]
    buildSubmissionSyncPatch({ field: "memberEmailAddress", value: "x@y.com", memberIndex: 0, buyersJson: input })
    expect(input[0].email).toBe("richardtrading1973@gmail.com")
  })

  it("maps name index 0 → buyer1Name and index 1 → buyer2Name", () => {
    const buyers = [buyer(), buyer({ name: "JANE DOE" })]
    expect(buildSubmissionSyncPatch({ field: "memberName", value: "JOHN X", memberIndex: 0, buyersJson: buyers }).buyer1Name).toBe("JOHN X")
    expect(buildSubmissionSyncPatch({ field: "memberName", value: "JANE X", memberIndex: 1, buyersJson: buyers }).buyer2Name).toBe("JANE X")
  })

  it("maps phone and address top-level only for index 0", () => {
    const buyers = [buyer(), buyer()]
    const p0 = buildSubmissionSyncPatch({ field: "memberPhoneNumber", value: "0400000000", memberIndex: 0, buyersJson: buyers })
    expect(p0.buyerPhone).toBe("0400000000")
    const p1 = buildSubmissionSyncPatch({ field: "memberAddress", value: "1 New St", memberIndex: 1, buyersJson: buyers })
    expect(p1.buyerAddress).toBeUndefined()
    expect(p1.buyersJson?.[1].address).toBe("1 New St")
  })

  it("normalizes empty to null top-level and \"\" inside buyers_json", () => {
    const patch = buildSubmissionSyncPatch({ field: "memberEmailAddress", value: "  ", memberIndex: 0, buyersJson: [buyer()] })
    expect(patch.buyerEmail).toBeNull()
    expect(patch.buyersJson?.[0].email).toBe("")
  })

  it("falls back to top-level columns when buyers_json is null", () => {
    const patch = buildSubmissionSyncPatch({ field: "memberEmailAddress", value: "a@b.com", memberIndex: 0, buyersJson: null })
    expect(patch.buyersJson).toBeUndefined()
    expect(patch.buyerEmail).toBe("a@b.com")
  })

  it("returns empty patch for an out-of-range non-zero index with no buyers_json entry", () => {
    const patch = buildSubmissionSyncPatch({ field: "memberEmailAddress", value: "a@b.com", memberIndex: 3, buyersJson: [buyer()] })
    expect(patch).toEqual({})
  })
})
