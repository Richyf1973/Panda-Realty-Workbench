import { describe, expect, it, vi } from "vitest"
import { sql } from "drizzle-orm"
import { numeric, pgTable } from "drizzle-orm/pg-core"

vi.mock("server-only", () => ({}))

import { loadAdminEntityListAggregateSums } from "./admin-entity-list-aggregate-sums"
import type { AdminEntityDefinition } from "./admin-entity-types"

const sumTable = pgTable("vat_accounts", {
  grossAmount: numeric("gross_amount"),
  exemptAmount: numeric("exempt_amount"),
})

function createThenableDb(row: Record<string, string>) {
  const result = Promise.resolve([row])
  const passthrough = {
    then: result.then.bind(result),
    catch: result.catch.bind(result),
    finally: result.finally.bind(result),
  }
  const whereSpy = vi.fn().mockReturnValue(result)
  const fromSpy = vi.fn(() => ({
    where: whereSpy,
    ...passthrough,
  }))
  const selectSpy = vi.fn(() => ({
    from: fromSpy,
  }))
  return {
    db: { select: selectSpy } as never,
    selectSpy,
    fromSpy,
    whereSpy,
  }
}

function entityWithSumKeys(
  keys: readonly string[],
  columnMetas: { key: string; valueType: "numeric" | "integer" | "text" }[],
): AdminEntityDefinition {
  return {
    listAggregateSumColumnKeys: keys,
    columns: columnMetas.map((c) => ({
      key: c.key,
      valueType: c.valueType,
    })),
  } as unknown as AdminEntityDefinition
}

describe("loadAdminEntityListAggregateSums", () => {
  it("returns undefined when listAggregateSumColumnKeys is missing or empty", async () => {
    const { db, selectSpy } = createThenableDb({})
    const r = await loadAdminEntityListAggregateSums({
      db,
      entityCfg: entityWithSumKeys([], []),
      table: sumTable,
      listBaseWhere: undefined,
    })
    expect(r).toBeUndefined()
    expect(selectSpy).not.toHaveBeenCalled()
  })

  it("returns undefined when no keys resolve to numeric table columns", async () => {
    const { db, selectSpy } = createThenableDb({})
    const r = await loadAdminEntityListAggregateSums({
      db,
      entityCfg: entityWithSumKeys(
        ["onlyText"],
        [{ key: "onlyText", valueType: "text" }],
      ),
      table: sumTable,
      listBaseWhere: undefined,
    })
    expect(r).toBeUndefined()
    expect(selectSpy).not.toHaveBeenCalled()
  })

  it("selects coalesce(sum)::text for numeric keys and maps row to strings", async () => {
    const { db, selectSpy, fromSpy, whereSpy } = createThenableDb({
      grossAmount: "5487346.39",
      exemptAmount: "0",
    })
    const r = await loadAdminEntityListAggregateSums({
      db,
      entityCfg: entityWithSumKeys(
        ["grossAmount", "exemptAmount", "missingCol", "ghost"],
        [
          { key: "grossAmount", valueType: "numeric" },
          { key: "exemptAmount", valueType: "numeric" },
        ],
      ),
      table: sumTable,
      listBaseWhere: undefined,
    })
    expect(r).toEqual({
      grossAmount: "5487346.39",
      exemptAmount: "0",
    })
    expect(selectSpy).toHaveBeenCalledTimes(1)
    const selectArg = selectSpy.mock.calls[0]![0] as Record<string, unknown>
    expect(Object.keys(selectArg).sort()).toEqual(["exemptAmount", "grossAmount"])
    expect(fromSpy).toHaveBeenCalledWith(sumTable)
    expect(whereSpy).not.toHaveBeenCalled()
  })

  it("applies where when listBaseWhere is set", async () => {
    const fakeWhere = sql`true`
    const { db, whereSpy } = createThenableDb({ grossAmount: "1" })
    await loadAdminEntityListAggregateSums({
      db,
      entityCfg: entityWithSumKeys(["grossAmount"], [
        { key: "grossAmount", valueType: "numeric" },
      ]),
      table: sumTable,
      listBaseWhere: fakeWhere,
    })
    expect(whereSpy).toHaveBeenCalledWith(fakeWhere)
  })

  it("selects sum(listVirtualSubtractFromBase row expression)::text when configured", async () => {
    const subtractTable = pgTable("sales_net_sum", {
      grossSales: numeric("gross_sales"),
      discount: numeric("discount"),
      returnsAllowed: numeric("returns_allowed"),
      taxes: numeric("taxes"),
    })
    const { db, selectSpy, fromSpy } = createThenableDb({ netSales: "250.5" })
    const r = await loadAdminEntityListAggregateSums({
      db,
      entityCfg: {
        slug: "sales-net-sum",
        listAggregateSumColumnKeys: ["netSales"],
        columns: [
          { key: "grossSales", valueType: "numeric" },
          { key: "discount", valueType: "numeric" },
          { key: "returnsAllowed", valueType: "numeric" },
          { key: "taxes", valueType: "numeric" },
          {
            key: "netSales",
            valueType: "numeric",
            listVirtualSubtractFromBase: {
              baseColumnKey: "grossSales",
              subtractColumnKeys: ["discount", "returnsAllowed", "taxes"],
            },
          },
        ],
      } as unknown as AdminEntityDefinition,
      table: subtractTable,
      listBaseWhere: undefined,
    })
    expect(r).toEqual({ netSales: "250.5" })
    expect(selectSpy).toHaveBeenCalledTimes(1)
    const selectArg = selectSpy.mock.calls[0]![0] as Record<string, unknown>
    expect(Object.keys(selectArg)).toEqual(["netSales"])
    expect(fromSpy).toHaveBeenCalledWith(subtractTable)
  })
})
