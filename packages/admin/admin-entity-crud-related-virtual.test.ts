import { describe, expect, it } from "vitest"

import type { AdminEntityCrudRelatedVirtualColumn } from "./admin-entity-types"
import type { LineRow } from "./admin-entity-crud-related-collections-draft"
import {
  buildRelationNumericLookupMap,
  evalRelatedVirtualProduct,
  parentDetailNonNegativeNumericAtPath,
  parentDetailNumericAtPath,
  parseLineNumericField,
  relationNumericLookupCacheKey,
} from "./admin-entity-crud-related-virtual"

const productCol = {
  key: "cashLineTotal",
  label: "Line total",
  kind: "product" as const,
  factorLeft: {
    kind: "relationNumeric" as const,
    fkColumnKey: "denominationId",
    relatedNumericColumnKey: "denomination",
  },
  factorRight: { kind: "lineNumeric" as const, columnKey: "cashCount" },
} satisfies AdminEntityCrudRelatedVirtualColumn

describe("parseLineNumericField", () => {
  it("parses plain numeric strings", () => {
    expect(parseLineNumericField({ clientKey: "a", price: "500.00" }, "price")).toBe(500)
  })

  it("strips thousands-separator commas before parsing (regression: prices ≥1000)", () => {
    expect(parseLineNumericField({ clientKey: "a", price: "1,001.00" }, "price")).toBe(1001)
    expect(parseLineNumericField({ clientKey: "a", price: "10,000.50" }, "price")).toBe(10000.5)
  })

  it("returns null for empty or non-numeric values", () => {
    expect(parseLineNumericField({ clientKey: "a", price: "" }, "price")).toBeNull()
    expect(parseLineNumericField({ clientKey: "a", price: "abc" }, "price")).toBeNull()
  })
})

describe("admin-entity-crud-related-virtual", () => {
  it("buildRelationNumericLookupMap reads list rows by id", () => {
    const m = buildRelationNumericLookupMap(
      [
        { denominationId: 1, denomination: "100.00" },
        { denominationId: 2, denomination: 50 },
      ],
      "denominationId",
      "denomination",
    )
    expect(m.get("1")).toBe(100)
    expect(m.get("2")).toBe(50)
  })

  it("buildRelationNumericLookupMap reads dotted paths on list rows", () => {
    const m = buildRelationNumericLookupMap(
      [
        {
          payrollId: 1,
          allowance: "999.00",
          guardRef: { allowance: "100.00" },
        },
      ],
      "payrollId",
      "guardRef.allowance",
    )
    expect(m.get("1")).toBe(100)
  })

  it("evalRelatedVirtualProduct multiplies relation face value by line count", () => {
    const cacheKey = relationNumericLookupCacheKey(
      "denominationId",
      "denomination",
    )
    const maps = new Map<string, Map<string, number>>([
      [cacheKey, new Map([["7", 20]])],
    ])
    const line: LineRow = {
      clientKey: "c1",
      denominationId: "7",
      cashCount: "3.5",
    }
    expect(evalRelatedVirtualProduct(productCol, line, maps)).toBe(70)
  })

  it("evalRelatedVirtualProduct prorates relation value by parent detail path", () => {
    const col = {
      key: "absenceCoveringAllowance",
      label: "Allowance",
      kind: "product" as const,
      factorLeft: { kind: "lineNumeric" as const, columnKey: "days" },
      factorRight: {
        kind: "relationNumeric" as const,
        fkColumnKey: "absentGuardId",
        relatedNumericColumnKey: "guardRef.allowance",
        divideByParentDetailNumericPath: "payrollPeriodRef.days",
      },
    } satisfies AdminEntityCrudRelatedVirtualColumn
    const cacheKey = relationNumericLookupCacheKey(
      "absentGuardId",
      "guardRef.allowance",
    )
    const maps = new Map<string, Map<string, number>>([
      [cacheKey, new Map([["42", 50]])],
    ])
    const line: LineRow = {
      clientKey: "c1",
      absentGuardId: "42",
      days: "2",
    }
    const detail = { payrollPeriodRef: { days: 10 } }
    expect(evalRelatedVirtualProduct(col, line, maps, detail)).toBe(10)
    expect(evalRelatedVirtualProduct(col, line, maps, undefined)).toBeNull()
  })

  it("parentDetailNumericAtPath reads nested positive numbers", () => {
    expect(
      parentDetailNumericAtPath(
        { payrollPeriodRef: { days: 15 } },
        "payrollPeriodRef.days",
      ),
    ).toBe(15)
    expect(parentDetailNumericAtPath({}, "payrollPeriodRef.days")).toBeNull()
  })

  it("parentDetailNonNegativeNumericAtPath allows zero", () => {
    expect(
      parentDetailNonNegativeNumericAtPath(
        { payrollPeriodRef: { perDayAllowance: "0" } },
        "payrollPeriodRef.perDayAllowance",
      ),
    ).toBe(0)
  })

  it("evalRelatedVirtualProduct multiplies line days by parent per-day allowance", () => {
    const col = {
      key: "otDaysTimesPerDayAllowance",
      label: "Per day",
      kind: "product" as const,
      factorLeft: { kind: "lineNumeric" as const, columnKey: "days" },
      factorRight: {
        kind: "parentDetailNumeric" as const,
        path: "payrollPeriodRef.perDayAllowance",
      },
    } satisfies AdminEntityCrudRelatedVirtualColumn
    const line: LineRow = {
      clientKey: "c1",
      days: "3",
    }
    const detail = { payrollPeriodRef: { perDayAllowance: "12.50" } }
    expect(evalRelatedVirtualProduct(col, line, new Map(), detail)).toBe(37.5)
    expect(evalRelatedVirtualProduct(col, line, new Map(), undefined)).toBeNull()
  })

  it("evalRelatedVirtualProduct returns null when FK is empty", () => {
    const cacheKey = relationNumericLookupCacheKey(
      "denominationId",
      "denomination",
    )
    const maps = new Map<string, Map<string, number>>([
      [cacheKey, new Map([["1", 10]])],
    ])
    const line: LineRow = {
      clientKey: "c1",
      denominationId: "",
      cashCount: "2",
    }
    expect(evalRelatedVirtualProduct(productCol, line, maps)).toBeNull()
  })
})
