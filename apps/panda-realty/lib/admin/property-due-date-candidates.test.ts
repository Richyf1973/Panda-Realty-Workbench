import { describe, expect, it } from "vitest"

import { buildDueDateCandidates, type DueDateSource } from "./property-due-date-candidates"

const BASE: DueDateSource = {
  contractDate: "2026-05-01T00:00:00.000Z",
  settlementDate: null,
  noConditions: false,
  coolingOffDays: null,
  financeDays: null,
  buildingPestDays: null,
  dueDiligenceDays: null,
  saleOfPropertyDays: null,
  unconditionalContractDays: null,
  subjectToSaleDays: null,
  customConditions: null,
}

const byLabel = (cands: ReturnType<typeof buildDueDateCandidates>) =>
  Object.fromEntries(cands.map((c) => [c.label, c.date?.toISOString() ?? null]))

describe("buildDueDateCandidates", () => {
  it("derives each milestone from contract_date + days", () => {
    const cands = byLabel(
      buildDueDateCandidates({
        ...BASE,
        coolingOffDays: 5,
        financeDays: 14,
        buildingPestDays: 14,
        dueDiligenceDays: 7,
        saleOfPropertyDays: 30,
        unconditionalContractDays: 21,
        subjectToSaleDays: 60,
      }),
    )
    expect(cands["Cooling Off"]).toBe("2026-05-06T00:00:00.000Z")
    expect(cands["Finance"]).toBe("2026-05-15T00:00:00.000Z")
    expect(cands["Completion Date"]).toBe("2026-06-30T00:00:00.000Z")
  })

  it("suppresses cooling off when noConditions is true", () => {
    const cands = byLabel(
      buildDueDateCandidates({ ...BASE, noConditions: true, coolingOffDays: 5, financeDays: 14 }),
    )
    expect(cands["Cooling Off"]).toBeUndefined() // filtered out (null date)
    expect(cands["Finance"]).toBe("2026-05-15T00:00:00.000Z")
  })

  it("returns [] when contractDate is null even if settlementDate is set (no contract = no marker)", () => {
    // Revised 2026-05-31: a property with no contract must never produce a candidate, so a stale
    // imported settlement_date can no longer light up the green highlight.
    const cands = buildDueDateCandidates({
      ...BASE,
      contractDate: null,
      settlementDate: "2026-07-15T00:00:00.000Z",
    })
    expect(cands).toEqual([])
  })

  it("includes settlement as a milestone when contractDate IS set", () => {
    const cands = byLabel(
      buildDueDateCandidates({
        ...BASE,
        contractDate: "2026-05-01T00:00:00.000Z",
        settlementDate: "2026-07-15T00:00:00.000Z",
      }),
    )
    expect(cands["Settlement"]).toBe("2026-07-15T00:00:00.000Z")
  })

  it("parses a bare date-string settlement (the buyer_offers.settlement_date format)", () => {
    // The accepted offer's settlement_date is a Postgres `date` (mode: "string") — "2026-06-01",
    // no time component. The enrichment feeds this value as the settlement source; confirm it
    // resolves to UTC midnight just like the property column's timestamp value.
    const cands = byLabel(
      buildDueDateCandidates({
        ...BASE,
        contractDate: "2026-04-16T00:00:00.000Z",
        settlementDate: "2026-06-01",
      }),
    )
    expect(cands["Settlement"]).toBe("2026-06-01T00:00:00.000Z")
  })

  it("includes custom conditions with their own labels", () => {
    const cands = byLabel(
      buildDueDateCandidates({
        ...BASE,
        customConditions: [{ label: "Pool Safety Cert", days: 10 }],
      }),
    )
    expect(cands["Pool Safety Cert"]).toBe("2026-05-11T00:00:00.000Z")
  })

  it("omits milestones with no day count", () => {
    const cands = buildDueDateCandidates({ ...BASE })
    expect(cands).toEqual([])
  })
})
