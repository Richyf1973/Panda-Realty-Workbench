import "server-only"

import { getGmailAccessToken } from "@/lib/gmail-client"
import type { MeetingReminder } from "@/lib/reminder-types"

type GCalReminder = { method: string; minutes: number }

function buildRemindersPayload(reminders: MeetingReminder[] | undefined): object {
  if (!reminders || reminders.length === 0) return {}
  const overrides: GCalReminder[] = reminders.map((r) => ({ method: r.method, minutes: r.minutes }))
  return { reminders: { useDefault: false, overrides } }
}

export { getGmailAccessToken as getCalendarAccessToken }

function toDateString(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/**
 * Creates an all-day Google Calendar event.
 * Returns the created event ID.
 */
export async function createCalendarEvent(
  accessToken: string,
  summary: string,
  date: Date,
  description?: string,
  colorId?: string,
): Promise<string> {
  const dateStr = toDateString(date)
  // For all-day events, end date is exclusive (next day)
  const endDate = toDateString(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1)))

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary,
        ...(description ? { description } : {}),
        ...(colorId ? { colorId } : {}),
        start: { date: dateStr },
        end: { date: endDate },
      }),
    },
  )

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Calendar event create failed (${res.status}): ${body}`)
  }

  const data = (await res.json()) as { id: string }
  return data.id
}

/**
 * Updates the summary and date of an existing all-day Google Calendar event.
 */
export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  summary: string,
  date: Date,
  description?: string,
  colorId?: string,
): Promise<void> {
  const dateStr = toDateString(date)
  const endDate = toDateString(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1)))

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary,
        ...(description ? { description } : {}),
        ...(colorId ? { colorId } : {}),
        start: { date: dateStr },
        end: { date: endDate },
      }),
    },
  )

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Calendar event update failed (${res.status}): ${body}`)
  }
}

/**
 * Creates a timed Google Calendar event (start + end datetime).
 * Returns the created event ID.
 */
export async function createTimedCalendarEvent(
  accessToken: string,
  summary: string,
  start: Date,
  durationMinutes: number,
  reminders?: MeetingReminder[],
  description?: string,
  colorId?: string,
): Promise<string> {
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000)

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary,
        ...(description ? { description } : {}),
        ...(colorId ? { colorId } : {}),
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        ...buildRemindersPayload(reminders),
      }),
    },
  )

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Timed calendar event create failed (${res.status}): ${body}`)
  }

  const data = (await res.json()) as { id: string }
  return data.id
}

/**
 * Updates a timed Google Calendar event.
 */
export async function updateTimedCalendarEvent(
  accessToken: string,
  eventId: string,
  summary: string,
  start: Date,
  durationMinutes: number,
  reminders?: MeetingReminder[],
  description?: string,
  colorId?: string,
): Promise<void> {
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000)

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary,
        ...(description ? { description } : {}),
        ...(colorId ? { colorId } : {}),
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        ...buildRemindersPayload(reminders),
      }),
    },
  )

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Timed calendar event update failed (${res.status}): ${body}`)
  }
}

export type GoogleCalendarEvent = {
  id: string
  summary: string | undefined
  start: string
  end: string
  allDay: boolean
  colorId?: string
}

/**
 * Lists Google Calendar events for a time range from the primary calendar.
 */
export async function listCalendarEvents(
  accessToken: string,
  timeMin: Date,
  timeMax: Date,
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  })

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Calendar events list failed (${res.status}): ${body}`)
  }

  type RawItem = {
    id: string
    summary?: string
    start?: { date?: string; dateTime?: string }
    end?: { date?: string; dateTime?: string }
    colorId?: string
  }
  const data = (await res.json()) as { items?: RawItem[] }
  const items = data.items ?? []

  return items.map((item) => {
    const allDay = !!item.start?.date
    const start = item.start?.date ?? item.start?.dateTime ?? ""
    const end = item.end?.date ?? item.end?.dateTime ?? ""
    return { id: item.id, summary: item.summary, start, end, allDay, colorId: item.colorId }
  })
}

/**
 * Deletes a Google Calendar event. No-ops gracefully on 404.
 */
export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string,
): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )

  if (res.status === 404 || res.status === 410) return // already gone
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Calendar event delete failed (${res.status}): ${body}`)
  }
}
