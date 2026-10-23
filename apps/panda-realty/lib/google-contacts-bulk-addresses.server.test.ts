import { beforeEach, describe, expect, it, vi } from "vitest"

const dbMocks = vi.hoisted(() => {
  const builder = {} as {
    innerJoin: ReturnType<typeof vi.fn>
    where: ReturnType<typeof vi.fn>
  }
  const where = vi.fn()
  const innerJoin = vi.fn(() => builder)
  const from = vi.fn(() => builder)
  const select = vi.fn(() => ({ from }))

  builder.innerJoin = innerJoin
  builder.where = where

  return { select, from, innerJoin, where }
})

vi.mock("@/db", () => ({
  db: {
    select: dbMocks.select,
  },
}))

import { entityCategories } from "@/db/schema"
import { fetchEntityMembersForBulkSync } from "@/lib/google-contacts-bulk-addresses.server"

describe("fetchEntityMembersForBulkSync", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("joins entity_categories before selecting entityCategorySlug", async () => {
    dbMocks.where.mockResolvedValue([
      {
        entityMemberId: 7,
        entityId: 9,
        entityName: "  Acme Buyers  ",
        entityCategorySlug: " buyer ",
        memberName: "  Nadia  ",
        memberEmailAddress: " nadia@example.com ",
        memberPhoneNumber: " 0412 345 678 ",
        isBuyersRepresentative: true,
        streetAddress: "  10 Main Street  ",
      },
    ])

    const rows = await fetchEntityMembersForBulkSync()
    const joinedTables = (
      dbMocks.innerJoin.mock.calls as unknown as Array<[unknown, ...unknown[]]>
    ).map((call) => call[0])

    expect(joinedTables).toContain(entityCategories)
    expect(rows).toEqual([
      {
        entityMemberId: 7,
        entityId: 9,
        entityName: "Acme Buyers",
        entityCategorySlug: "buyer",
        memberName: "Nadia",
        memberEmailAddress: "nadia@example.com",
        memberPhoneNumber: "0412 345 678",
        isBuyersRepresentative: true,
        streetAddress: "10 Main Street",
      },
    ])
  })
})
