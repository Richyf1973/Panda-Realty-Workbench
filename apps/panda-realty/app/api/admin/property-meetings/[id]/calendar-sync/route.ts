import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { propertyMeetings } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"
import { deleteCalendarEvent, getCalendarAccessToken } from "@/lib/google-calendar-client"
import { isGmailConnected } from "@/lib/gmail-client"
import { syncPropertyMeetingToGoogleCalendar } from "@/lib/property-meeting-calendar-sync"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  const meetingId = Number.parseInt(id, 10)
  if (!Number.isFinite(meetingId) || meetingId <= 0) {
    return adminJsonError("Invalid meeting id", 400)
  }

  const result = await syncPropertyMeetingToGoogleCalendar(meetingId)

  if (!result.ok) {
    if (result.reason === "not_found") return adminJsonError("Meeting not found", 404)
    if (result.reason === "calendar_not_connected") {
      return NextResponse.json({ ok: false, reason: "calendar_not_connected" }, { status: 503 })
    }
    return NextResponse.json({ ok: false, reason: "sync_failed" }, { status: 502 })
  }

  return NextResponse.json({ ok: true, eventId: result.eventId })
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  const meetingId = Number.parseInt(id, 10)
  if (!Number.isFinite(meetingId) || meetingId <= 0) {
    return adminJsonError("Invalid meeting id", 400)
  }

  const [meeting] = await db
    .select({ googleCalendarEventId: propertyMeetings.googleCalendarEventId })
    .from(propertyMeetings)
    .where(eq(propertyMeetings.propertyMeetingId, meetingId))
    .limit(1)

  if (!meeting) return adminJsonError("Meeting not found", 404)

  if (meeting.googleCalendarEventId) {
    if (!(await isGmailConnected())) {
      return NextResponse.json({ ok: false, reason: "calendar_not_connected" }, { status: 503 })
    }
    const accessToken = await getCalendarAccessToken()
    await deleteCalendarEvent(accessToken, meeting.googleCalendarEventId)
    await db
      .update(propertyMeetings)
      .set({ googleCalendarEventId: null, updatedAt: new Date() })
      .where(eq(propertyMeetings.propertyMeetingId, meetingId))
  }

  return NextResponse.json({ ok: true })
}
