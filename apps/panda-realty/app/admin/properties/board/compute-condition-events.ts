export type ConditionOfferFields = {
  noConditions: boolean
  isCashOffer: boolean
  coolingOffDays: number | null
  financeDays: number | null
  buildingPestDays: number | null
  dueDiligenceDays: number | null
  subjectToSaleDays: number | null
  saleOfPropertyDays: number | null
  unconditionalContractDays: number | null
}

export type ConditionEvent = { key: string; label: string; date: Date }

export type ConditionDateRow = { key: string; label: string; date: Date | null }

/** Day-cell highlight class for shadcn `Calendar` modifiers (all milestones share one colour). */
export const CONDITION_CALENDAR_DAY_CLASS = "!bg-slate-600 !text-white"

/** Inline styles for react-big-calendar month-view event bars (same colour for every milestone). */
export const CONDITION_CALENDAR_EVENT_STYLE: { backgroundColor: string; color: string } = {
  backgroundColor: "#64748b",
  color: "#ffffff",
}

const CALENDAR_HIDDEN_EVENT_KEYS = new Set(["buildingPest", "dueDiligence"])

export function addDaysToDate(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

/** Non-null day counts ≤ 0 mean "no milestone"; omit from summaries, calendars, and sync. */
export function hasPositiveDayCount(days: number | null): days is number {
  if (days == null) return false
  const n = Number(days)
  return Number.isFinite(n) && n > 0
}

export function computeConditionEvents(
  acceptedOffer: ConditionOfferFields,
  contractDate: Date,
  coolingOffStartDate?: Date | null,
): ConditionEvent[] {
  const events: ConditionEvent[] = []
  events.push({ key: "contract", label: "Contract Date", date: contractDate })

  const saleOfPropertyDays = acceptedOffer.saleOfPropertyDays
  if (hasPositiveDayCount(saleOfPropertyDays)) {
    events.push({
      key: "days-to-contract",
      label: "Days to Contract",
      date: addDaysToDate(contractDate, saleOfPropertyDays),
    })
  }

  const unconditionalContractDays = acceptedOffer.unconditionalContractDays
  if (hasPositiveDayCount(unconditionalContractDays)) {
    events.push({
      key: "days-to-unconditional",
      label: "Days to Unconditional",
      date: addDaysToDate(contractDate, unconditionalContractDays),
    })
  }

  const subjectToSaleDays = acceptedOffer.subjectToSaleDays
  if (hasPositiveDayCount(subjectToSaleDays)) {
    events.push({
      key: "completion-date",
      label: "Completion Date",
      date: addDaysToDate(contractDate, subjectToSaleDays),
    })
  }

  if (!acceptedOffer.noConditions) {
    const coolingOffDays = acceptedOffer.coolingOffDays
    if (hasPositiveDayCount(coolingOffDays)) {
      // Manufactured Home: cooling off counts from disclosure date if set, otherwise contract date.
      const coolingBase = coolingOffStartDate ?? contractDate
      events.push({
        key: "cooling",
        label: "Cooling Off",
        date: addDaysToDate(coolingBase, coolingOffDays),
      })
    }
    const financeDays = acceptedOffer.financeDays
    if (hasPositiveDayCount(financeDays) && !acceptedOffer.isCashOffer) {
      events.push({
        key: "finance",
        label: "Finance",
        date: addDaysToDate(contractDate, financeDays),
      })
    }
    const buildingPestDays = acceptedOffer.buildingPestDays
    if (hasPositiveDayCount(buildingPestDays)) {
      events.push({
        key: "buildingPest",
        label: "Building & Pest",
        date: addDaysToDate(contractDate, buildingPestDays),
      })
    }
    const dueDiligenceDays = acceptedOffer.dueDiligenceDays
    if (hasPositiveDayCount(dueDiligenceDays)) {
      events.push({
        key: "dueDiligence",
        label: "Due Diligence",
        date: addDaysToDate(contractDate, dueDiligenceDays),
      })
    }
  }

  return events
}

/** Like {@link computeConditionEvents}, but omits milestones that should not appear on calendar UIs. */
export function computeConditionEventsForCalendar(
  acceptedOffer: ConditionOfferFields,
  contractDate: Date,
  coolingOffStartDate?: Date | null,
): ConditionEvent[] {
  return computeConditionEvents(acceptedOffer, contractDate, coolingOffStartDate).filter(
    (e) => !CALENDAR_HIDDEN_EVENT_KEYS.has(e.key),
  )
}

/** Same milestone list as {@link computeConditionEvents}, but dates are null when `contractDate` is unset. */
export function buildConditionDateRows(
  acceptedOffer: ConditionOfferFields,
  contractDate: Date | null,
  coolingOffStartDate?: Date | null,
): ConditionDateRow[] {
  if (!contractDate) {
    // Use a sentinel date to get the correct milestone list, then replace all dates with null.
    const sentinel = new Date(0)
    return computeConditionEvents(acceptedOffer, sentinel, coolingOffStartDate).map((e) => ({
      key: e.key,
      label: e.label,
      date: null,
    }))
  }
  return computeConditionEvents(acceptedOffer, contractDate, coolingOffStartDate).map((e) => ({
    key: e.key,
    label: e.label,
    date: e.date,
  }))
}
