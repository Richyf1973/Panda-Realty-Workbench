// Single source of truth for the "due-date highlight" across the properties list,
// the pipeline board, and the calendar. Three tiers:
//
//   GREEN  (active)            — a critical date D satisfies D <= today (Australia/Brisbane)
//                                AND (clearedAt IS NULL OR D > clearedAt). The actionable "due now".
//   RED    (warning, "soon")   — no green is active, and the next future date D satisfies
//                                today < D <= today + WARNING_DAYS Brisbane days. Imminent.
//   GOLD   (warning, "upcoming") — no green is active, and the next future date is more than
//                                WARNING_DAYS out (uncapped). A gentle heads-up; every under-contract
//                                property with an upcoming condition carries it.
//
// Both warning tiers are passive: they ignore clearedAt and turn green on the day the date falls due.
// Green takes precedence over red, red over gold: a property is exactly one colour (or none).
// Clearing sets clearedAt = now(); a milestone whose due date falls after the clear re-lights green.

const BRISBANE_OFFSET_MS = 10 * 60 * 60 * 1000 // UTC+10, no DST
const DAY_MS = 24 * 60 * 60 * 1000

/** Cutoff (Brisbane days ahead) separating the red "soon" tier from the gold "upcoming" tier. */
const WARNING_DAYS = 3

/** Which warning colour applies: red when within WARNING_DAYS, gold when further out. */
export type DueWarningTier = "soon" | "upcoming"

export type DueHighlightCandidate = {
  /** Human label used for the tooltip, e.g. "Finance", "Settlement". */
  label: string
  /** The milestone due date (UTC midnight) or null when not applicable. */
  date: Date | null
}

export type DueHighlightResult = {
  active: boolean
  /**
   * The single next-in-line milestone: the label of the earliest (by due date) candidate that is
   * currently due/overdue and not cleared. Empty when nothing is triggering. The marker sits on the
   * next date in line and steps forward to the following one as each is dealt with.
   */
  labels: string[]
  /** Warning tier: true when no green is active and there is an upcoming (future) milestone. */
  warning: boolean
  /** The single earliest upcoming milestone label, or empty when not warning. */
  warningLabels: string[]
  /** Whole Brisbane days until the warning date (>= 1), or null when not warning. Uncapped. */
  warningDaysUntil: number | null
  /** "soon" (red, within WARNING_DAYS) or "upcoming" (gold, further out); null when not warning. */
  warningTier: DueWarningTier | null
}

/** Format the passive yellow label shown on the list/board/calendar, e.g. "Finance, due in 3 days". */
export function formatDueWarningLabel(label: string, days: number): string {
  return `${label}, due in ${days} ${days === 1 ? "day" : "days"}`
}

/**
 * Floor a UTC instant to the start of that Brisbane (UTC+10) day, returned as a UTC Date
 * (the UTC instant corresponding to Brisbane local midnight).
 */
export function startOfBrisbaneDayUtc(instant: Date): Date {
  const brisbaneMs = instant.getTime() + BRISBANE_OFFSET_MS
  const flooredBrisbaneMs = Math.floor(brisbaneMs / DAY_MS) * DAY_MS
  return new Date(flooredBrisbaneMs - BRISBANE_OFFSET_MS)
}

/**
 * Compute whether the due-date highlight is active and which milestone it points at.
 *
 * A candidate triggers when its due date (floored to the start of its Brisbane day) is on or
 * before today's Brisbane day, and either nothing has been cleared or the due date falls strictly
 * after the clear instant (so a later milestone re-lights a previously cleared property).
 *
 * When several candidates trigger at once, the highlight surfaces only the single next-in-line
 * milestone — the earliest by due date — so the marker steps forward one date at a time rather
 * than piling up every overdue date.
 *
 * When nothing is due/overdue, the warning tier surfaces the earliest future candidate (no distance
 * cap) and classifies it: "soon" (red) within WARNING_DAYS, otherwise "upcoming" (gold). Green always
 * takes precedence, so warning is suppressed whenever a green milestone is active.
 */
export function computeDueHighlight(args: {
  candidates: DueHighlightCandidate[]
  /** Current instant; the Brisbane day is derived from it. */
  now: Date
  clearedAt: Date | null
}): DueHighlightResult {
  const { candidates, now, clearedAt } = args
  const todayMs = startOfBrisbaneDayUtc(now).getTime()
  const clearedMs = clearedAt != null ? clearedAt.getTime() : null

  let next: { label: string; dueMs: number } | null = null
  let warn: { label: string; dueMs: number } | null = null
  for (const candidate of candidates) {
    if (candidate.date == null) continue
    const dueMs = startOfBrisbaneDayUtc(candidate.date).getTime()
    if (dueMs <= todayMs) {
      // Green territory: due/overdue. Skip when cleared and not re-triggered.
      if (clearedMs != null && dueMs <= clearedMs) continue
      if (next == null || dueMs < next.dueMs) next = { label: candidate.label, dueMs }
    } else {
      // Warning territory: any future date. The earliest one wins; its distance picks the tier later.
      if (warn == null || dueMs < warn.dueMs) warn = { label: candidate.label, dueMs }
    }
  }

  if (next != null) {
    return {
      active: true,
      labels: [next.label],
      warning: false,
      warningLabels: [],
      warningDaysUntil: null,
      warningTier: null,
    }
  }
  if (warn != null) {
    const warningDaysUntil = Math.round((warn.dueMs - todayMs) / DAY_MS)
    return {
      active: false,
      labels: [],
      warning: true,
      warningLabels: [warn.label],
      warningDaysUntil,
      warningTier: warningDaysUntil <= WARNING_DAYS ? "soon" : "upcoming",
    }
  }
  return {
    active: false,
    labels: [],
    warning: false,
    warningLabels: [],
    warningDaysUntil: null,
    warningTier: null,
  }
}
