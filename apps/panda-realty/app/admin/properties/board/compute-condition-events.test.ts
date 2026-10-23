import { describe, expect, it } from "vitest"

import {
  buildConditionDateRows,
  computeConditionEvents,
  computeConditionEventsForCalendar,
  hasPositiveDayCount,
} from "./compute-condition-events"

const contractDate = new Date(2026, 3, 16)

describe("hasPositiveDayCount", () => {
  it("is true only for finite numbers greater than zero", () => {
    expect(hasPositiveDayCount(null)).toBe(false)
    expect(hasPositiveDayCount(0)).toBe(false)
    expect(hasPositiveDayCount(-3)).toBe(false)
    expect(hasPositiveDayCount(14)).toBe(true)
  })
})

describe("computeConditionEvents", () => {
  it("always includes contract date", () => {
    const events = computeConditionEvents(
      {
        noConditions: false,
        isCashOffer: false,
        coolingOffDays: 0,
        financeDays: 0,
        buildingPestDays: 0,
        dueDiligenceDays: 0,
        subjectToSaleDays: 0,
        saleOfPropertyDays: null,
        unconditionalContractDays: null,
      },
      contractDate,
    )
    expect(events.map((e) => e.key)).toEqual(["contract"])
  })

  it("omits milestones when day count is 0", () => {
    const events = computeConditionEvents(
      {
        noConditions: false,
        isCashOffer: false,
        coolingOffDays: 7,
        financeDays: 0,
        buildingPestDays: 0,
        dueDiligenceDays: 0,
        subjectToSaleDays: 30,
        saleOfPropertyDays: null,
        unconditionalContractDays: null,
      },
      contractDate,
    )
    expect(new Set(events.map((e) => e.key))).toEqual(
      new Set(["contract", "cooling", "completion-date"]),
    )
  })

  it("omits settlement when subjectToSaleDays is 0", () => {
    const events = computeConditionEvents(
      {
        noConditions: false,
        isCashOffer: false,
        coolingOffDays: 5,
        financeDays: 10,
        buildingPestDays: 7,
        dueDiligenceDays: 14,
        subjectToSaleDays: 0,
        saleOfPropertyDays: null,
        unconditionalContractDays: null,
      },
      contractDate,
    )
    expect(events.some((e) => e.key === "completion-date")).toBe(false)
  })

  it("omits finance when cash offer even with positive finance days", () => {
    const events = computeConditionEvents(
      {
        noConditions: false,
        isCashOffer: true,
        coolingOffDays: 5,
        financeDays: 14,
        buildingPestDays: 7,
        dueDiligenceDays: null,
        subjectToSaleDays: 30,
        saleOfPropertyDays: null,
        unconditionalContractDays: null,
      },
      contractDate,
    )
    expect(events.some((e) => e.key === "finance")).toBe(false)
  })

  it("skips conditional milestones when noConditions", () => {
    const events = computeConditionEvents(
      {
        noConditions: true,
        isCashOffer: false,
        coolingOffDays: 7,
        financeDays: 14,
        buildingPestDays: 7,
        dueDiligenceDays: 7,
        subjectToSaleDays: 30,
        saleOfPropertyDays: null,
        unconditionalContractDays: null,
      },
      contractDate,
    )
    expect(new Set(events.map((e) => e.key))).toEqual(new Set(["contract", "completion-date"]))
  })

  it("includes days-to-contract and days-to-unconditional when set", () => {
    const events = computeConditionEvents(
      {
        noConditions: false,
        isCashOffer: false,
        coolingOffDays: null,
        financeDays: null,
        buildingPestDays: null,
        dueDiligenceDays: null,
        subjectToSaleDays: 60,
        saleOfPropertyDays: 14,
        unconditionalContractDays: 21,
      },
      contractDate,
    )
    const keys = events.map((e) => e.key)
    expect(keys).toContain("days-to-contract")
    expect(keys).toContain("days-to-unconditional")
    expect(keys).toContain("completion-date")
    // days-to-contract (14) < days-to-unconditional (21) < completion-date (60)
    const contractIdx = keys.indexOf("days-to-contract")
    const unconditionalIdx = keys.indexOf("days-to-unconditional")
    const completionIdx = keys.indexOf("completion-date")
    expect(contractIdx).toBeLessThan(unconditionalIdx)
    expect(unconditionalIdx).toBeLessThan(completionIdx)
  })
})

describe("computeConditionEventsForCalendar", () => {
  it("drops building & pest and due diligence while keeping other milestones", () => {
    const events = computeConditionEventsForCalendar(
      {
        noConditions: false,
        isCashOffer: false,
        coolingOffDays: 5,
        financeDays: 10,
        buildingPestDays: 7,
        dueDiligenceDays: 14,
        subjectToSaleDays: 30,
        saleOfPropertyDays: null,
        unconditionalContractDays: null,
      },
      contractDate,
    )
    expect(events.some((e) => e.key === "buildingPest")).toBe(false)
    expect(events.some((e) => e.key === "dueDiligence")).toBe(false)
    expect(new Set(events.map((e) => e.key))).toEqual(
      new Set(["contract", "completion-date", "cooling", "finance"]),
    )
  })
})

describe("buildConditionDateRows", () => {
  it("does not list zero-day milestones when contract date is unset", () => {
    const rows = buildConditionDateRows(
      {
        noConditions: false,
        isCashOffer: true,
        coolingOffDays: 7,
        financeDays: 0,
        buildingPestDays: 0,
        dueDiligenceDays: 0,
        subjectToSaleDays: 30,
        saleOfPropertyDays: null,
        unconditionalContractDays: null,
      },
      null,
    )
    const keys = rows.map((r) => r.key)
    expect(keys).toContain("contract")
    expect(keys).toContain("completion-date")
    expect(keys).toContain("cooling")
    expect(keys).not.toContain("finance")
    expect(keys).not.toContain("buildingPest")
    expect(keys).not.toContain("dueDiligence")
  })
})
