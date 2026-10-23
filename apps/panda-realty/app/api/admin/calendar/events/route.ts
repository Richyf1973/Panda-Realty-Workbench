import { NextRequest, NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth/session"
import {
  createTimedCalendarEvent,
  getCalendarAccessToken,
} from "@/lib/google-calendar-client"
import type { MeetingReminder } from "@/lib/reminder-types"

type CreateEventBody = {
  title: string
  date: string // YYYY-MM-DD
  startTime: string // HH:MM
  durationMinutes: number
  notes?: string
  reminders?: MeetingReminder[]
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: CreateEventBody
  try {
    body = (await req.json()) as CreateEventBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { title, date, startTime, durationMinutes, notes, reminders } = body

  if (!title || typeof title !== "string" || title.trim() === "") {
    return NextResponse.json({ error: "title is required" }, { status: 400 })
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 })
  }
  if (!startTime || !/^\d{2}:\d{2}$/.test(startTime)) {
    return NextResponse.json(
      { error: "startTime (HH:MM) is required" },
      { status: 400 },
    )
  }
  if (!durationMinutes || typeof durationMinutes !== "number" || durationMinutes <= 0) {
    return NextResponse.json(
      { error: "durationMinutes must be a positive number" },
      { status: 400 },
    )
  }

  let token: string
  try {
    token = await getCalendarAccessToken()
  } catch (err) {
    const isNotConnected =
      err instanceof Error && err.message.toLowerCase().includes("not connected")
    if (isNotConnected) {
      return NextResponse.json({ error: "Google Calendar is not connected" }, { status: 503 })
    }
    return NextResponse.json({ error: "Failed to get calendar access token" }, { status: 500 })
  }

  try {
    const [year, month, day] = date.split("-").map(Number) as [number, number, number]
    const [hours, minutes] = startTime.split(":").map(Number) as [number, number]
    const startObj = new Date(Date.UTC(year, month - 1, day, hours, minutes))

    const eventId = await createTimedCalendarEvent(
      token,
      title.trim(),
      startObj,
      durationMinutes,
      reminders,
      notes?.trim() || undefined,
    )

    return NextResponse.json({ id: eventId })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create calendar event"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
