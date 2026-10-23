import { describe, expect, it } from "vitest"

import {
  expandCommaSeparatedIntegerQtyLinesOnBlurIfNeeded,
  normalizeTrailingCommaOnlyIntegerQtyString,
  parseCommaSeparatedQtySegments,
  parseCommaSeparatedQtyTokensSkipInvalid,
} from "./admin-entity-comma-separated-qty-expand"
import type {
  AdminEntityCrudRelatedCollectionTable,
  AdminEntityDefinition,
} from "./admin-entity-types"

const childCfg = {
  idColumn: { jsonKey: "id" as const },
  columns: [
    {
      key: "qty" as const,
      integerInputAllowCommaSeparatedQuantities: true as const,
    },
  ],
} as unknown as AdminEntityDefinition

const collection = {
  jsonKey: "items",
  tabLabel: "Items",
  parentFkColumnKey: "countDate",
  childEntitySlug: "unitsole-inventory-count-items",
  inlineEditableColumnKeys: ["itemCode", "location", "qty", "price"],
} as unknown as AdminEntityCrudRelatedCollectionTable

const persistKey = "itemCode"
const zeroSentinelKeys = new Set(["price", "qty"])

describe("normalizeTrailingCommaOnlyIntegerQtyString", () => {
  it("collapses a lone trailing comma segment", () => {
    expect(normalizeTrailingCommaOnlyIntegerQtyString("37,")).toBe("37")
    expect(normalizeTrailingCommaOnlyIntegerQtyString("37, ")).toBe("37")
  })

  it("does not change multi-segment comma lists", () => {
    expect(normalizeTrailingCommaOnlyIntegerQtyString("10, 20")).toBe("10, 20")
  })
})

describe("parseCommaSeparatedQtyTokensSkipInvalid", () => {
  it("skips non-numeric segments", () => {
    expect(parseCommaSeparatedQtyTokensSkipInvalid("10, abc, 20")).toEqual([
      "10",
      "20",
    ])
  })

  it("returns empty when nothing parses", () => {
    expect(parseCommaSeparatedQtyTokensSkipInvalid("abc, xyz")).toEqual([])
  })
})

describe("parseCommaSeparatedQtySegments", () => {
  it("returns null when there is only one quantity token", () => {
    expect(parseCommaSeparatedQtySegments("37")).toBe(null)
    expect(parseCommaSeparatedQtySegments("100")).toBe(null)
  })

  it("returns null for a single segment after comma trim", () => {
    expect(parseCommaSeparatedQtySegments("37,")).toBe(null)
  })

  it("parses multiple non-negative integers", () => {
    expect(parseCommaSeparatedQtySegments("37, 5, 23")).toEqual(["37", "5", "23"])
    expect(parseCommaSeparatedQtySegments("37 5 23")).toEqual(["37", "5", "23"])
  })

  it("still expands when invalid tokens are skipped", () => {
    expect(parseCommaSeparatedQtySegments("10, xyz, 20")).toEqual(["10", "20"])
  })
})

describe("expandCommaSeparatedIntegerQtyLinesOnBlurIfNeeded", () => {
  it("splits one draft row into multiple rows with distinct clientKeys", () => {
    const a = crypto.randomUUID()
    const lines = [
      {
        clientKey: a,
        itemCode: "PP14BN",
        location: "Fin",
        price: "10",
        qty: "37, 5, 23",
      },
    ]
    const out = expandCommaSeparatedIntegerQtyLinesOnBlurIfNeeded(
      lines,
      a,
      "qty",
      "37, 5, 23",
      "id",
      childCfg,
      collection,
      persistKey,
      zeroSentinelKeys,
      undefined,
    )
    expect(out).not.toBe(null)
    expect(out!.length).toBeGreaterThanOrEqual(3)
    const qtyRows = out!.filter((l) => String(l.qty).match(/^\d+$/))
    expect(qtyRows.map((l) => l.qty)).toEqual(["37", "5", "23"])
    expect(out![0]!.clientKey).toBe(a)
    expect(out![1]!.clientKey).not.toBe(a)
    expect(out![2]!.clientKey).not.toBe(out![1]!.clientKey)
  })

  it("splits when a middle segment is non-numeric (skipped)", () => {
    const a = crypto.randomUUID()
    const lines = [
      {
        clientKey: a,
        itemCode: "PP14BN",
        location: "Fin",
        price: "10",
        qty: "10, bad, 20",
      },
    ]
    const out = expandCommaSeparatedIntegerQtyLinesOnBlurIfNeeded(
      lines,
      a,
      "qty",
      "10, bad, 20",
      "id",
      childCfg,
      collection,
      persistKey,
      zeroSentinelKeys,
      undefined,
    )
    expect(out).not.toBe(null)
    const qtyRows = out!.filter((l) => String(l.qty).match(/^\d+$/))
    expect(qtyRows.map((l) => l.qty)).toEqual(["10", "20"])
  })

  it("keeps saved id on the first split row only", () => {
    const lines = [
      {
        clientKey: "saved-99",
        id: 99,
        itemCode: "X",
        location: "Fin",
        price: "1",
        qty: "10, 20",
      },
    ]
    const out = expandCommaSeparatedIntegerQtyLinesOnBlurIfNeeded(
      lines,
      "saved-99",
      "qty",
      "10, 20",
      "id",
      childCfg,
      collection,
      persistKey,
      zeroSentinelKeys,
      undefined,
    )
    expect(out).not.toBe(null)
    expect(out![0]!.id).toBe(99)
    expect(out![1]!.id).toBeUndefined()
  })
})
