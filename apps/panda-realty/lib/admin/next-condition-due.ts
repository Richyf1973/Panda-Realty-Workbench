import { startOfBrisbaneDayUtc } from "./due-highlight"
import type { DueHighlightCandidate } from "./due-highlight"

/**
 * Compute the property's representative "next condition due" date used to order the properties
 * list. It is the earliest **uncleared** candidate date (Brisbane-day floored), or null when the
 * property has no live condition.
 *
 * A candidate is "cleared" when `clearedAt` is set and the candidate's due day is on or before the
 * clear instant — mirroring {@link computeDueHighlight}'s suppression (a later milestone re-lights).
 * Future candidates are always later than the clear instant, so applying the same rule uniformly to
 * all candidates yields the exact set computeDueHighlight would surface (green precedence falls out
 * naturally: overdue candidates always have an earlier date than any future one).
 *
 * The value is time-independent (no `now`): an uncleared candidate stays "live" whether its date is
 * in the future (upcoming) or in the past (overdue), so it never needs a daily recompute — only when
 * the offer/contract dates change or a tick is cleared/uncleared.
 */
export function computeNextConditionDue(args: {
  candidates: DueHighlightCandidate[]
  clearedAt: Date | null
}): Date | null {
  const { candidates, clearedAt } = args
  const clearedMs = clearedAt != null ? clearedAt.getTime() : null

  let earliestMs: number | null = null
  for (const candidate of candidates) {
    if (candidate.date == null) continue
    const dueMs = startOfBrisbaneDayUtc(candidate.date).getTime()
    // Suppress candidates cleared on/before the clear instant.
    if (clearedMs != null && dueMs <= clearedMs) continue
    if (earliestMs == null || dueMs < earliestMs) earliestMs = dueMs
  }

  return earliestMs == null ? null : new Date(earliestMs)
}
