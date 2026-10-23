import { addDays, addMonths, startOfDay, startOfMonth, startOfWeek } from "date-fns"

/** Persisted react-big-calendar view (`day` | `week` | `month` only). */
export const CONDITION_CALENDAR_VIEW_STORAGE_KEY = "panda:admin:condition-calendar:view"

/** Exclusive upper bound for Google Calendar list query (`timeMax`). */
export type GoogleFetchRange = { from: Date; toExclusive: Date }

const WEEK_OPTS = { weekStartsOn: 1 as const }

/** Visible window for `/api/admin/calendar/google-events` — `toExclusive` matches Google API exclusivity. */
export function getGoogleFetchRange(
  view: "month" | "week" | "day",
  anchorDate: Date,
): GoogleFetchRange {
  switch (view) {
    case "day": {
      const from = startOfDay(anchorDate)
      return { from, toExclusive: addDays(from, 1) }
    }
    case "week": {
      const from = startOfDay(startOfWeek(anchorDate, WEEK_OPTS))
      return { from, toExclusive: addDays(from, 7) }
    }
    case "month": {
      const from = startOfDay(startOfMonth(anchorDate))
      return { from, toExclusive: addMonths(from, 1) }
    }
  }
}
