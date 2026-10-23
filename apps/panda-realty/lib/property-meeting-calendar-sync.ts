import "server-only"

import { eq } from "drizzle-orm"

import { db } from "@/db"
import { entities, pandaProperties, propertyEntities, propertyMeetings } from "@/db/schema"
import {
  createTimedCalendarEvent,
  getCalendarAccessToken,
  updateTimedCalendarEvent,
} from "@/lib/google-calendar-client"
import { isGmailConnected } from "@/lib/gmail-client"
import { MEETING_TYPE_COLOR_ID } from "@/lib/meeting-calendar-color"
import { parseRemindersJson } from "@/lib/reminder-types"

const DEFAULT_DURATION_MINUTES = 60

export type PropertyMeetingCalendarSyncResult =
  | { ok: true; eventId: string }
  | { ok: false; reason: "calendar_not_connected" | "not_found" | "sync_failed" }

/**
 * Creates or updates the Google Calendar event for a property meeting row.
 * Used by the calendar-sync API route and by addMeetingAction.
 */
export async function syncPropertyMeetingToGoogleCalendar(
  meetingId: number,
): Promise<PropertyMeetingCalendarSyncResult> {
  if (!(await isGmailConnected())) {
    return { ok: false, reason: "calendar_not_connected" }
  }

  const [meeting] = await db
    .select()
    .from(propertyMeetings)
    .where(eq(propertyMeetings.propertyMeetingId, meetingId))
    .limit(1)

  if (!meeting) return { ok: false, reason: "not_found" }

  try {
    const [propRow] = await db
      .select({
        streetAddress: pandaProperties.streetAddress,
        suburb: pandaProperties.suburb,
      })
      .from(pandaProperties)
      .where(eq(pandaProperties.propertyListId, meeting.propertyListId))
      .limit(1)

    let buyerName: string | null = null
    if (meeting.propertyEntityId) {
      const [peRow] = await db
        .select({ entityName: entities.entityName })
        .from(propertyEntities)
        .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
        .where(eq(propertyEntities.propertyEntityId, meeting.propertyEntityId))
        .limit(1)
      buyerName = peRow?.entityName ?? null
    }

    const propertyLabel = propRow
      ? [propRow.streetAddress, propRow.suburb].filter(Boolean).join(", ")
      : ""

    const suffix = [buyerName, propertyLabel].filter(Boolean).join(" @ ")
    const summary = suffix ? `${meeting.title} – ${suffix}` : meeting.title

    const accessToken = await getCalendarAccessToken()
    const start = new Date(meeting.scheduledAt)
    const duration = meeting.durationMinutes ?? DEFAULT_DURATION_MINUTES
    const reminders = parseRemindersJson(meeting.remindersJson)
    const colorId = meeting.type === "meeting" ? MEETING_TYPE_COLOR_ID.meeting : MEETING_TYPE_COLOR_ID.reminder

    let eventId: string
    if (meeting.googleCalendarEventId) {
      await updateTimedCalendarEvent(
        accessToken,
        meeting.googleCalendarEventId,
        summary,
        start,
        duration,
        reminders,
        undefined,
        colorId,
      )
      eventId = meeting.googleCalendarEventId
    } else {
      eventId = await createTimedCalendarEvent(accessToken, summary, start, duration, reminders, undefined, colorId)
    }

    await db
      .update(propertyMeetings)
      .set({ googleCalendarEventId: eventId, updatedAt: new Date() })
      .where(eq(propertyMeetings.propertyMeetingId, meetingId))

    return { ok: true, eventId }
  } catch (cause) {
    console.error("[property-meeting-calendar-sync]", { meetingId, cause })
    return { ok: false, reason: "sync_failed" }
  }
}
