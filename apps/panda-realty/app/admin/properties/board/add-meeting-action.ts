"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/db"
import { propertyMeetings } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"
import { isGmailConnected, getGmailAccessToken } from "@/lib/gmail-client"
import { deleteCalendarEvent } from "@/lib/google-calendar-client"
import {
  scheduledAtIsoFromMeetingFormParts,
  scheduledAtIsoFromReminderFormParts,
} from "@/lib/meeting-scheduled-at"
import { snapDurationMinutes } from "@/lib/meeting-time-utils"
import { syncPropertyMeetingToGoogleCalendar } from "@/lib/property-meeting-calendar-sync"
import type { MeetingReminder } from "@/lib/reminder-types"

export type AddMeetingInput = {
  propertyListId: number
  propertyEntityId: number | null
  title: string
  /** `YYYY-MM-DD` from the date picker */
  scheduledDate: string
  /** `HH:MM` (snapped to quarter hour on client; server recomputes) */
  scheduledTime: string
  durationMinutes: number | null
  notes: string | null
  reminders: MeetingReminder[]
}

export type AddMeetingSuccess = {
  success: true
  meetingId: number
  /** Google Calendar sync attempted after insert */
  calendarSync: "synced" | "not_connected" | "failed"
}

export async function addMeetingAction(
  input: AddMeetingInput,
): Promise<AddMeetingSuccess | { success: false; error: string }> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: "Unauthorized" }

  if (!input.title.trim()) return { success: false, error: "Title is required" }

  const scheduled = scheduledAtIsoFromMeetingFormParts(input.scheduledDate, input.scheduledTime)
  if (!scheduled.ok) return { success: false, error: scheduled.error }

  const durationMinutes =
    input.durationMinutes != null && Number.isFinite(input.durationMinutes)
      ? snapDurationMinutes(input.durationMinutes)
      : null

  const [row] = await db
    .insert(propertyMeetings)
    .values({
      propertyListId: input.propertyListId,
      propertyEntityId: input.propertyEntityId ?? null,
      type: "meeting",
      title: input.title.trim(),
      scheduledAt: new Date(scheduled.iso),
      durationMinutes,
      notes: input.notes?.trim() || null,
      remindersJson: input.reminders.length > 0 ? JSON.stringify(input.reminders) : null,
    })
    .returning({ propertyMeetingId: propertyMeetings.propertyMeetingId })

  revalidatePath("/admin/properties")

  const meetingId = row!.propertyMeetingId
  const syncResult = await syncPropertyMeetingToGoogleCalendar(meetingId)

  let calendarSync: AddMeetingSuccess["calendarSync"]
  if (syncResult.ok) {
    calendarSync = "synced"
  } else if (syncResult.reason === "calendar_not_connected") {
    calendarSync = "not_connected"
  } else {
    calendarSync = "failed"
  }

  return { success: true, meetingId, calendarSync }
}

export type AddReminderInput = {
  propertyListId: number
  propertyEntityId: number | null
  title: string
  scheduledDate: string
  /** `null` or empty means start of day in the schedule timezone */
  scheduledTime: string | null
  notes: string | null
  reminders: MeetingReminder[]
}

export async function addReminderAction(
  input: AddReminderInput,
): Promise<{ success: true; meetingId: number } | { success: false; error: string }> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: "Unauthorized" }

  if (!input.title.trim()) return { success: false, error: "Title is required" }

  const scheduled = scheduledAtIsoFromReminderFormParts(input.scheduledDate, input.scheduledTime)
  if (!scheduled.ok) return { success: false, error: scheduled.error }

  const [row] = await db
    .insert(propertyMeetings)
    .values({
      propertyListId: input.propertyListId,
      propertyEntityId: input.propertyEntityId ?? null,
      type: "reminder",
      title: input.title.trim(),
      scheduledAt: new Date(scheduled.iso),
      durationMinutes: null,
      notes: input.notes?.trim() || null,
      remindersJson: input.reminders.length > 0 ? JSON.stringify(input.reminders) : null,
    })
    .returning({ propertyMeetingId: propertyMeetings.propertyMeetingId })

  revalidatePath("/admin/properties")

  return { success: true, meetingId: row!.propertyMeetingId }
}

export async function deleteMeetingAction(
  propertyMeetingId: number,
): Promise<{ success: true } | { success: false; error: string }> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const [existing] = await db
    .select({ googleCalendarEventId: propertyMeetings.googleCalendarEventId })
    .from(propertyMeetings)
    .where(eq(propertyMeetings.propertyMeetingId, propertyMeetingId))
    .limit(1)

  if (!existing) return { success: false, error: "Meeting not found" }

  await db.delete(propertyMeetings).where(eq(propertyMeetings.propertyMeetingId, propertyMeetingId))

  revalidatePath("/admin/properties")

  if (existing.googleCalendarEventId && (await isGmailConnected())) {
    void getGmailAccessToken()
      .then((token) => deleteCalendarEvent(token, existing.googleCalendarEventId!))
      .catch(() => {/* non-fatal */})
  }

  return { success: true }
}
