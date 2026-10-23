import { describe, expect, it } from "vitest"

import { mergeListVirtualColumnsIntoApiRow } from "./admin-entity-list-virtual-row-merge"
import type { AdminEntityDefinition } from "./admin-entity-types"

describe("mergeListVirtualColumnsIntoApiRow", () => {
  it("computes listVirtualSubtractFromBase when key missing", () => {
    const cfg = {
      columns: [
        {
          key: "grossSales",
          list: true,
          patch: true,
        },
        {
          key: "discount",
          list: true,
          patch: true,
        },
        {
          key: "returnsAllowed",
          list: true,
          patch: true,
        },
        {
          key: "taxes",
          list: true,
          patch: true,
        },
        {
          key: "netSales",
          list: true,
          listVirtual: true,
          listVirtualSubtractFromBase: {
            baseColumnKey: "grossSales",
            subtractColumnKeys: ["discount", "returnsAllowed", "taxes"],
          },
        },
      ],
    } as unknown as AdminEntityDefinition

    const out = mergeListVirtualColumnsIntoApiRow(cfg, {
      grossSales: "132300",
      discount: "0",
      returnsAllowed: "0",
      taxes: "300",
    })
    expect(out.netSales).toBe("132000")
  })

  it("does not overwrite existing virtual value", () => {
    const cfg = {
      columns: [
        {
          key: "grossSales",
          list: true,
          patch: true,
        },
        {
          key: "netSales",
          list: true,
          listVirtual: true,
          listVirtualSubtractFromBase: {
            baseColumnKey: "grossSales",
            subtractColumnKeys: [] as const,
          },
        },
      ],
    } as unknown as AdminEntityDefinition

    const out = mergeListVirtualColumnsIntoApiRow(cfg, {
      grossSales: "100",
      netSales: "99",
    })
    expect(out.netSales).toBe("99")
  })
})
