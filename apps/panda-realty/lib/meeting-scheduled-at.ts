import { formatInTimeZone, toDate } from "date-fns-tz"

import { snapTimeToQuarterHour } from "./meeting-time-utils"

/** IANA zone for interpreting date + time from meeting/reminder forms (client + server). */
export const MEETING_SCHEDULE_TIMEZONE = "Australia/Brisbane"

export function prepareSnappedTimeForSubmit(
  time: string,
): { ok: true; snapped: string } | { ok: false; error: string } {
  const snapped = snapTimeToQuarterHour(time)
  if (!snapped) return { ok: false, error: "Enter a valid time." }
  return { ok: true, snapped }
}

export function scheduledAtIsoFromMeetingFormParts(
  dateStr: string,
  timeStr: string,
): { ok: true; iso: string } | { ok: false; error: string } {
  if (!dateStr.trim()) return { ok: false, error: "Date and time is required." }
  const snapped = snapTimeToQuarterHour(timeStr)
  if (!snapped) return { ok: false, error: "Enter a valid time." }
  const wall = `${dateStr}T${snapped}:00`
  const d = toDate(wall, { timeZone: MEETING_SCHEDULE_TIMEZONE })
  if (Number.isNaN(d.getTime())) return { ok: false, error: "Invalid date or time." }
  return { ok: true, iso: d.toISOString() }
}

export function scheduledAtIsoFromReminderFormParts(
  dateStr: string,
  timeStr: string | null,
): { ok: true; iso: string } | { ok: false; error: string } {
  if (!dateStr.trim()) return { ok: false, error: "Date is required." }
  if (!timeStr?.trim()) {
    const wall = `${dateStr}T00:00:00`
    const d = toDate(wall, { timeZone: MEETING_SCHEDULE_TIMEZONE })
    if (Number.isNaN(d.getTime())) return { ok: false, error: "Invalid date." }
    return { ok: true, iso: d.toISOString() }
  }
  const snapped = snapTimeToQuarterHour(timeStr)
  if (!snapped) return { ok: false, error: "Enter a valid time." }
  const wall = `${dateStr}T${snapped}:00`
  const d = toDate(wall, { timeZone: MEETING_SCHEDULE_TIMEZONE })
  if (Number.isNaN(d.getTime())) return { ok: false, error: "Invalid date or time." }
  return { ok: true, iso: d.toISOString() }
}

/** Card subtitle: date + time in the schedule timezone (en-AU style). */
export function formatScheduledAtForCard(date: Date | null | undefined): string {
  if (!date) return "—"
  return formatInTimeZone(date, MEETING_SCHEDULE_TIMEZONE, "d MMM yyyy · h:mm a")
}
