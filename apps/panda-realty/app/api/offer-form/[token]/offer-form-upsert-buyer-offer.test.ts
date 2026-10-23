import { afterEach, describe, expect, it, vi } from "vitest"

import { maybeAdvanceBuyerPipelineOnOfferInTx } from "@/lib/admin/buyer-offers-workspace-sync.server"

import { upsertBuyerOfferInTx } from "./offer-form-upsert"
import { baseData } from "./offer-form-upsert-test-helpers"

vi.mock("@/db", () => ({ db: { transaction: vi.fn() } }))

vi.mock("@/db/schema", () => ({
  buyerOffers: {},
  entities: {},
  entityMembers: {},
}))

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
}))

vi.mock("@/lib/admin/buyer-offers-workspace-sync.server", () => ({
  maybeAdvanceBuyerPipelineOnOfferInTx: vi.fn().mockResolvedValue(undefined),
}))

afterEach(() => vi.clearAllMocks())

function makeTx(insertValues: ReturnType<typeof vi.fn> = vi.fn(() => Promise.resolve())) {
  return {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(() => ({ values: insertValues })),
  }
}

describe("upsertBuyerOfferInTx", () => {
  it("inserts a new row when no existing offer exists", async () => {
    const insertValues = vi.fn(() => Promise.resolve())
    const tx = makeTx(insertValues)
    await upsertBuyerOfferInTx(tx as never, 42, baseData)
    expect(tx.insert).toHaveBeenCalledTimes(1)
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ propertyEntityId: 42, offer: "500000" }),
    )
  })

  it("always inserts a new row even when existing offers are present", async () => {
    const insertValues = vi.fn(() => Promise.resolve())
    const tx = makeTx(insertValues)
    await upsertBuyerOfferInTx(tx as never, 10, baseData)
    expect(tx.select).not.toHaveBeenCalled()
    expect(tx.update).not.toHaveBeenCalled()
    expect(insertValues).toHaveBeenCalledTimes(1)
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ propertyEntityId: 10, offer: "500000" }),
    )
  })

  it("strips non-numeric characters from offer amount before storing", async () => {
    const insertValues = vi.fn(() => Promise.resolve())
    const tx = makeTx(insertValues)
    await upsertBuyerOfferInTx(tx as never, 1, { ...baseData, offerAmount: "$500,000.00" })
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ offer: "500000.00" }))
  })

  it("maps buildingPestInspection '7_days' → buildingPestDays=7", async () => {
    const insertValues = vi.fn(() => Promise.resolve())
    const tx = makeTx(insertValues)
    await upsertBuyerOfferInTx(tx as never, 1, { ...baseData, buildingPestInspection: "7_days" })
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ buildingPestDays: 7 }))
  })

  it("maps buildingPestInspection '14_days' → buildingPestDays=14", async () => {
    const insertValues = vi.fn(() => Promise.resolve())
    const tx = makeTx(insertValues)
    await upsertBuyerOfferInTx(tx as never, 1, { ...baseData, buildingPestInspection: "14_days" })
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ buildingPestDays: 14 }))
  })

  it("maps buildingPestInspection 'no' → buildingPestDays=0", async () => {
    const insertValues = vi.fn(() => Promise.resolve())
    const tx = makeTx(insertValues)
    await upsertBuyerOfferInTx(tx as never, 1, { ...baseData, buildingPestInspection: "no" })
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ buildingPestDays: 0 }))
  })

  it("does not call pipeline advancement when offer amount is zero", async () => {
    const tx = makeTx()
    await upsertBuyerOfferInTx(tx as never, 1, { ...baseData, offerAmount: "0" })
    expect(maybeAdvanceBuyerPipelineOnOfferInTx).not.toHaveBeenCalled()
  })

  it("calls pipeline advancement with cleaned offer amount when offer is positive", async () => {
    const tx = makeTx()
    await upsertBuyerOfferInTx(tx as never, 5, { ...baseData, offerAmount: "750000" })
    expect(maybeAdvanceBuyerPipelineOnOfferInTx).toHaveBeenCalledWith(tx, 5, [{ offer: "750000" }])
  })

  it("maps cashBuyer 'Yes' → isCashOffer=true", async () => {
    const insertValues = vi.fn(() => Promise.resolve())
    const tx = makeTx(insertValues)
    await upsertBuyerOfferInTx(tx as never, 1, { ...baseData, cashBuyer: "Yes" })
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ isCashOffer: true }))
  })

  it("maps cashBuyer 'No' → isCashOffer=false", async () => {
    const insertValues = vi.fn(() => Promise.resolve())
    const tx = makeTx(insertValues)
    await upsertBuyerOfferInTx(tx as never, 1, { ...baseData, cashBuyer: "No" })
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ isCashOffer: false }))
  })

  it("writes conditionNotes from extraComments", async () => {
    const insertValues = vi.fn(() => Promise.resolve())
    const tx = makeTx(insertValues)
    await upsertBuyerOfferInTx(tx as never, 1, { ...baseData, extraComments: "No pets clause" })
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ conditionNotes: "No pets clause" }))
  })
})
