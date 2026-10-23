import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import {
  entityMembers,
  propertyEntities,
  pandaProperties,
} from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"
import {
  getCalendarAccessToken,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/google-calendar-client"
import { isGmailConnected } from "@/lib/gmail-client"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  const memberId = Number.parseInt(id, 10)
  if (!Number.isFinite(memberId) || memberId <= 0) {
    return adminJsonError("Invalid member id", 400)
  }

  // Check Google Calendar is connected
  if (!(await isGmailConnected())) {
    return NextResponse.json(
      { ok: false, reason: "calendar_not_connected" },
      { status: 503 },
    )
  }

  // Fetch the member
  const [member] = await db
    .select()
    .from(entityMembers)
    .where(eq(entityMembers.entityMemberId, memberId))
    .limit(1)

  if (!member) return adminJsonError("Member not found", 404)

  // Resolve property address via entity_id → property_entities → panda_properties
  let propertyLabel = ""
  try {
    const [pe] = await db
      .select({ propertyListId: propertyEntities.propertyListId })
      .from(propertyEntities)
      .where(eq(propertyEntities.entityId, member.entityId))
      .limit(1)

    if (pe?.propertyListId) {
      const [prop] = await db
        .select({
          streetAddress: pandaProperties.streetAddress,
          suburb: pandaProperties.suburb,
        })
        .from(pandaProperties)
        .where(eq(pandaProperties.propertyListId, pe.propertyListId))
        .limit(1)

      if (prop) {
        propertyLabel = [prop.streetAddress, prop.suburb]
          .filter(Boolean)
          .join(", ")
      }
    }
  } catch {
    // Property lookup is best-effort — proceed without it
  }

  const summary = propertyLabel
    ? `Property Viewing – ${member.memberName} @ ${propertyLabel}`
    : `Property Viewing – ${member.memberName}`

  try {
    const accessToken = await getCalendarAccessToken()

    if (member.scheduledViewingDate) {
      const date = new Date(member.scheduledViewingDate)
      let eventId = member.googleCalendarEventId

      if (eventId) {
        await updateCalendarEvent(accessToken, eventId, summary, date)
      } else {
        eventId = await createCalendarEvent(accessToken, summary, date)
        await db
          .update(entityMembers)
          .set({ googleCalendarEventId: eventId })
          .where(eq(entityMembers.entityMemberId, memberId))
      }
    } else {
      // Date cleared — remove calendar event if one exists
      if (member.googleCalendarEventId) {
        await deleteCalendarEvent(accessToken, member.googleCalendarEventId)
        await db
          .update(entityMembers)
          .set({ googleCalendarEventId: null })
          .where(eq(entityMembers.entityMemberId, memberId))
      }
    }

    return NextResponse.json({ ok: true })
  } catch (cause) {
    console.error("[calendar-sync]", cause)
    const message = cause instanceof Error ? cause.message : "Calendar sync failed"
    return NextResponse.json({ ok: false, reason: message }, { status: 500 })
  }
}
