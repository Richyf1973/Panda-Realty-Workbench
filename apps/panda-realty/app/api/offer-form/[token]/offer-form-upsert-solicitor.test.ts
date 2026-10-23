import { afterEach, describe, expect, it, vi } from "vitest"

import { upsertSolicitorInTx } from "./offer-form-upsert"
import { baseData, makeSelectChain, makeUpdateChain, type MockTx } from "./offer-form-upsert-test-helpers"

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

describe("upsertSolicitorInTx", () => {
  it("returns early without querying when solicitorName and solicitorEmail are both absent", async () => {
    const tx = { select: vi.fn(), update: vi.fn(), insert: vi.fn() }
    await upsertSolicitorInTx(tx as never, { ...baseData })
    expect(tx.select).not.toHaveBeenCalled()
    expect(tx.insert).not.toHaveBeenCalled()
  })

  it("inserts solicitor with entityCategoryId=4 when not found by email", async () => {
    const insertValues = vi.fn(() => Promise.resolve())
    const tx: MockTx = {
      select: vi.fn(() => makeSelectChain([])),
      update: vi.fn(() => makeUpdateChain()),
      insert: vi.fn(() => ({ values: insertValues })),
    }
    await upsertSolicitorInTx(tx as never, {
      ...baseData,
      solicitorEmail: "sol@law.com",
      solicitorName: "Smith Legal",
      solicitorPhone: "0700000001",
    })
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ entityCategoryId: 4, contactCategoryId: 1, emailAddress: "sol@law.com" }),
    )
  })

  it("updates existing entity found by email and does not insert", async () => {
    const whereUpdate = vi.fn(() => Promise.resolve())
    const tx: MockTx = {
      select: vi.fn(() => makeSelectChain([{ entityId: 77 }])),
      update: vi.fn(() => ({ set: vi.fn(() => ({ where: whereUpdate })) })),
      insert: vi.fn(() => ({ values: vi.fn(() => Promise.resolve()) })),
    }
    await upsertSolicitorInTx(tx as never, {
      ...baseData,
      solicitorEmail: "existing@law.com",
      solicitorName: "Existing Legal",
    })
    expect(whereUpdate).toHaveBeenCalledTimes(1)
    expect(tx.insert).not.toHaveBeenCalled()
  })

  it("inserts with entityCategoryId=4 when name-only lookup finds nothing", async () => {
    const insertValues = vi.fn(() => Promise.resolve())
    const tx: MockTx = {
      select: vi.fn(() => makeSelectChain([])),
      update: vi.fn(() => makeUpdateChain()),
      insert: vi.fn(() => ({ values: insertValues })),
    }
    await upsertSolicitorInTx(tx as never, {
      ...baseData,
      solicitorName: "Unknown Legal Firm",
    })
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ entityCategoryId: 4, contactCategoryId: 1, entityName: "Unknown Legal Firm" }),
    )
  })

  it("updates existing entity found by name-only and does not insert", async () => {
    const whereUpdate = vi.fn(() => Promise.resolve())
    const tx: MockTx = {
      select: vi.fn(() => makeSelectChain([{ entityId: 55 }])),
      update: vi.fn(() => ({ set: vi.fn(() => ({ where: whereUpdate })) })),
      insert: vi.fn(() => ({ values: vi.fn(() => Promise.resolve()) })),
    }
    await upsertSolicitorInTx(tx as never, { ...baseData, solicitorName: "Known Firm" })
    expect(whereUpdate).toHaveBeenCalledTimes(1)
    expect(tx.insert).not.toHaveBeenCalled()
  })
})
