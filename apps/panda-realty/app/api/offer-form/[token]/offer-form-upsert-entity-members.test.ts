import { afterEach, describe, expect, it, vi } from "vitest"

import { upsertEntityMembersInTx } from "./offer-form-upsert"
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

describe("upsertEntityMembersInTx", () => {
  it("inserts a new entity member when no existing buyers", async () => {
    const insertValues = vi.fn(() => Promise.resolve())
    const tx: MockTx = {
      select: vi.fn(() => makeSelectChain([])),
      update: vi.fn(() => makeUpdateChain()),
      insert: vi.fn(() => ({ values: insertValues })),
    }
    await upsertEntityMembersInTx(tx as never, 42, {
      ...baseData,
      buyers: [{ name: "Alice Smith", phone: "0400000001", email: "alice@example.com", address: "1 Main St" }],
    })
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: 42, memberName: "Alice Smith", isBuyersRepresentative: false }),
    )
  })

  it("updates existing buyer at the same index position", async () => {
    const whereUpdate = vi.fn(() => Promise.resolve())
    const tx: MockTx = {
      select: vi.fn(() => makeSelectChain([{ entityMemberId: 99 }])),
      update: vi.fn(() => ({ set: vi.fn(() => ({ where: whereUpdate })) })),
      insert: vi.fn(() => ({ values: vi.fn(() => Promise.resolve()) })),
    }
    await upsertEntityMembersInTx(tx as never, 10, { ...baseData, buyers: [{ name: "Bob Jones" }] })
    expect(whereUpdate).toHaveBeenCalledTimes(1)
    expect(tx.insert).not.toHaveBeenCalled()
  })

  it("skips buyers with blank or empty names", async () => {
    const insertValues = vi.fn(() => Promise.resolve())
    const tx: MockTx = {
      select: vi.fn(() => makeSelectChain([])),
      update: vi.fn(() => makeUpdateChain()),
      insert: vi.fn(() => ({ values: insertValues })),
    }
    await upsertEntityMembersInTx(tx as never, 1, {
      ...baseData,
      buyers: [{ name: "  " }, { name: "" }, { name: "Valid Name" }],
    })
    expect(insertValues).toHaveBeenCalledTimes(1)
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ memberName: "Valid Name" }))
  })

  it("inserts a representative member when buyer1 has hasRep=true and repName set", async () => {
    let selectCall = 0
    const insertValues = vi.fn(() => Promise.resolve())
    const tx: MockTx = {
      select: vi.fn(() => makeSelectChain(selectCall++ === 0 ? [] : [])),
      update: vi.fn(() => makeUpdateChain()),
      insert: vi.fn(() => ({ values: insertValues })),
    }
    await upsertEntityMembersInTx(tx as never, 5, {
      ...baseData,
      buyers: [{ name: "Carol White", hasRep: true, repName: "Dave Agent", repPhone: "0401234567" }],
    })
    expect(insertValues).toHaveBeenCalledTimes(2)
    const allCalls = insertValues.mock.calls as unknown[][]
    const repCall = allCalls.find(
      (args) => (args[0] as Record<string, unknown>).isBuyersRepresentative === true,
    )
    expect(repCall).toBeDefined()
    expect(repCall![0]).toMatchObject({ memberName: "Dave Agent", isBuyersRepresentative: true })
  })

  it("does not insert a representative when hasRep is false", async () => {
    const insertValues = vi.fn(() => Promise.resolve())
    const tx: MockTx = {
      select: vi.fn(() => makeSelectChain([])),
      update: vi.fn(() => makeUpdateChain()),
      insert: vi.fn(() => ({ values: insertValues })),
    }
    await upsertEntityMembersInTx(tx as never, 3, {
      ...baseData,
      buyers: [{ name: "Eve Brown", hasRep: false, repName: "Some Agent" }],
    })
    expect(insertValues).toHaveBeenCalledTimes(1)
    expect((insertValues.mock.calls as unknown[][])[0]![0]).toMatchObject({ isBuyersRepresentative: false })
  })

  it("does not insert a representative when repName is blank even if hasRep=true", async () => {
    const insertValues = vi.fn(() => Promise.resolve())
    const tx: MockTx = {
      select: vi.fn(() => makeSelectChain([])),
      update: vi.fn(() => makeUpdateChain()),
      insert: vi.fn(() => ({ values: insertValues })),
    }
    await upsertEntityMembersInTx(tx as never, 3, {
      ...baseData,
      buyers: [{ name: "Frank Green", hasRep: true, repName: "   " }],
    })
    expect(insertValues).toHaveBeenCalledTimes(1)
  })
})
