import type { CSSProperties } from "react"

import type { Event, View } from "react-big-calendar"
import { startOfDay } from "date-fns"

import {
  CONDITION_CALENDAR_EVENT_STYLE,
  computeConditionEventsForCalendar,
} from "../properties/board/compute-condition-events"
import { computeDueHighlight } from "@/lib/admin/due-highlight"
import type { DueWarningTier } from "@/lib/admin/due-highlight"
import { GOOGLE_EVENT_COLOR } from "@/lib/meeting-calendar-color"
import type { GoogleCalendarEvent } from "@/lib/google-calendar-client"
import type { CalendarProperty } from "./queries"

export type CalendarEventRow = Event & {
  eventKey: string
  source: "condition" | "google" | "agent-task"
  colorId?: string
  /** Condition events only: true when this milestone is due/overdue and the property is not cleared. */
  isDueHighlight?: boolean
  /** Condition events only: true when this milestone is upcoming (any future date, uncleared). */
  isDueWarning?: boolean
  /** Condition events only: "soon" (red, ≤3 days) or "upcoming" (gold, further out). */
  dueWarningTier?: DueWarningTier | null
}

const CONDITION_GREEN_STYLE: { backgroundColor: string; color: string } = {
  backgroundColor: "#16a34a", // green-600
  color: "#ffffff",
}

const CONDITION_RED_STYLE: { backgroundColor: string; color: string } = {
  backgroundColor: "#ef4444", // red-500 — condition due within 3 days
  color: "#ffffff",
}

const CONDITION_AMBER_STYLE: { backgroundColor: string; color: string } = {
  backgroundColor: "#f59e0b", // amber-500 — condition more than 3 days out (gold)
  color: "#ffffff",
}

export function buildConditionEvents(properties: CalendarProperty[]): CalendarEventRow[] {
  const now = new Date()
  const events: CalendarEventRow[] = []
  for (const prop of properties) {
    if (!prop.acceptedOffer || !prop.contractDate) continue
    const address = `${prop.streetAddress}, ${prop.suburb}`
    const coolingOffStartDate = prop.disclosureDate ? new Date(prop.disclosureDate) : null
    for (const e of computeConditionEventsForCalendar(prop.acceptedOffer, new Date(prop.contractDate), coolingOffStartDate)) {
      const { active, warning, warningTier } = computeDueHighlight({
        candidates: [{ label: e.label, date: e.date }],
        now,
        clearedAt: prop.dueHighlightClearedAt,
      })
      events.push({
        title: `${e.label} — ${address}`,
        start: e.date,
        end: e.date,
        allDay: true,
        eventKey: e.key,
        source: "condition",
        isDueHighlight: active,
        isDueWarning: warning,
        dueWarningTier: warningTier,
      })
    }
  }
  return events
}

/**
 * Inline style for a condition event bar: green when due/overdue & uncleared, red when within the
 * 3-day window ("soon"), gold when further out ("upcoming"), else the shared slate. Precedence is
 * green > red > gold.
 */
export function getConditionEventStyle(
  isDueHighlight: boolean | undefined,
  isDueWarning?: boolean | undefined,
  dueWarningTier?: DueWarningTier | null,
): {
  backgroundColor: string
  color: string
} {
  if (isDueHighlight) return CONDITION_GREEN_STYLE
  if (isDueWarning) return dueWarningTier === "soon" ? CONDITION_RED_STYLE : CONDITION_AMBER_STYLE
  return CONDITION_CALENDAR_EVENT_STYLE
}

export function mapGoogleEventsToCalendar(
  googleEvents: GoogleCalendarEvent[],
  calendarView: View,
): CalendarEventRow[] {
  const normalizeTimedToAllDayStrip = calendarView === "week" || calendarView === "day"

  return googleEvents.map((e) => {
    if (normalizeTimedToAllDayStrip && !e.allDay) {
      const startDt = new Date(e.start)
      const endDt = new Date(e.end)
      const s = startOfDay(startDt)
      const lastDay = startOfDay(endDt < startDt ? startDt : endDt)
      return {
        title: e.summary ?? "(No title)",
        start: s,
        end: s.getTime() === lastDay.getTime() ? s : lastDay,
        allDay: true,
        eventKey: `google-${e.id}`,
        source: "google" as const,
        colorId: e.colorId,
      }
    }

    const start = e.allDay ? new Date(e.start + "T00:00:00") : new Date(e.start)
    const endRaw = e.allDay ? new Date(e.end + "T00:00:00") : new Date(e.end)
    const end = e.allDay ? new Date(endRaw.getTime() - 24 * 60 * 60 * 1000) : endRaw
    return {
      title: e.summary ?? "(No title)",
      start,
      end,
      allDay: e.allDay,
      eventKey: `google-${e.id}`,
      source: "google" as const,
      colorId: e.colorId,
    }
  })
}

export function getGoogleEventStyle(colorId?: string): CSSProperties {
  return {
    backgroundColor: colorId ? (GOOGLE_EVENT_COLOR[colorId] ?? "#2563eb") : "#2563eb",
    color: "#fff",
    borderRadius: "4px",
    border: "none",
    fontSize: "0.72rem",
  }
}
