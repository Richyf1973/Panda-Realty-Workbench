import { describe, expect, it } from "vitest"

import { adminEntityListDetailSeedFromRow } from "./admin-entity-list-detail-seed"
import type { AdminEntityDefinition } from "./admin-entity-types"

describe("adminEntityListDetailSeedFromRow", () => {
  const payrollsLike = {
    slug: "payrolls",
    crudRelatedCollections: [
      { jsonKey: "payrollDeductions" },
      { jsonKey: "payrollCashCounts" },
      { jsonKey: "payrollOvertimes" },
      { jsonKey: "payrollOvertimeAbsences" },
    ],
  } as unknown as AdminEntityDefinition

  it("returns undefined when a related array is missing", () => {
    expect(
      adminEntityListDetailSeedFromRow(payrollsLike, {
        payrollId: 1,
        payrollPeriodId: 2,
        payrollDeductions: [],
        payrollCashCounts: [],
        payrollOvertimes: [],
      }),
    ).toBeUndefined()
  })

  it("spreads scalar keys so scoped relation fetches can run without a detail refetch", () => {
    const seed = adminEntityListDetailSeedFromRow(payrollsLike, {
      payrollId: 1,
      payrollPeriodId: 99,
      guardId: 3,
      payrollDeductions: [],
      payrollCashCounts: [],
      payrollOvertimes: [],
      payrollOvertimeAbsences: [],
    })
    expect(seed).toEqual({
      payrollId: 1,
      payrollPeriodId: 99,
      guardId: 3,
      payrollDeductions: [],
      payrollCashCounts: [],
      payrollOvertimes: [],
      payrollOvertimeAbsences: [],
    })
  })

  const paymentsLike = {
    slug: "payments",
    crudRelatedCollections: [
      { jsonKey: "paymentSales", childEntitySlug: "payment-sales" },
      { jsonKey: "paymentChecks", childEntitySlug: "payment-checks" },
    ],
  } as unknown as AdminEntityDefinition

  it("returns undefined for payments when any table collection array is empty (force detail refetch)", () => {
    expect(
      adminEntityListDetailSeedFromRow(paymentsLike, {
        id: 1,
        paymentSales: [{ id: 1 }],
        paymentChecks: [],
      }),
    ).toBeUndefined()
  })

  it("returns undefined for payments when paymentChecks rows lack maturity (unhydrated list embed)", () => {
    expect(
      adminEntityListDetailSeedFromRow(paymentsLike, {
        id: 1,
        totalChecks: "132300",
        paymentSales: [{ id: 1, drNumber: "25549" }],
        paymentChecks: [{ id: 2, checkAmount: "132300" }],
      }),
    ).toBeUndefined()
  })

  it("returns seed for payments when paymentChecks include a maturity (detail-equivalent embed)", () => {
    expect(
      adminEntityListDetailSeedFromRow(paymentsLike, {
        id: 1,
        totalChecks: "99",
        paymentSales: [{ id: 1 }],
        paymentChecks: [{ id: 2, maturity: "2026-03-01", checkAmount: "99" }],
      }),
    ).toEqual({
      id: 1,
      totalChecks: "99",
      paymentSales: [{ id: 1 }],
      paymentChecks: [{ id: 2, maturity: "2026-03-01", checkAmount: "99" }],
    })
  })

  it("ignores custom related tabs when validating list-detail seed arrays", () => {
    const mixed: AdminEntityDefinition = {
      slug: "demo",
      crudRelatedCollections: [
        { jsonKey: "lines", childEntitySlug: "x" },
        {
          mode: "custom",
          jsonKey: "_uiOnly",
          tabLabel: "Extra",
          customRelatedPanelKey: "demo.panel",
        },
      ],
    } as unknown as AdminEntityDefinition

    const seed = adminEntityListDetailSeedFromRow(mixed, {
      id: 1,
      lines: [],
    })
    expect(seed).toEqual({ id: 1, lines: [] })
  })
})
