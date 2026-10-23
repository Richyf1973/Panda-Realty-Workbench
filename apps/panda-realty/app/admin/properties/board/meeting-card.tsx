"use client"

import { useState } from "react"
import { Bell, CalendarClock, Loader2, Trash2 } from "lucide-react"

import { deleteMeetingAction } from "./add-meeting-action"
import { MeetingCalendarFooter, type CalendarLineStatus } from "./meeting-calendar-footer"
import { formatScheduledAtForCard } from "@/lib/meeting-scheduled-at"
import type { PropertyDetailMeeting } from "./property-types"

export function MeetingCard({
  meeting,
  onDeleted,
  calendarStatus,
  onRetryCalendar,
}: {
  meeting: PropertyDetailMeeting
  onDeleted: () => void
  calendarStatus: CalendarLineStatus | null
  onRetryCalendar: (meetingId: number) => void
}) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await deleteMeetingAction(meeting.propertyMeetingId)
    onDeleted()
  }

  const isReminder = meeting.type === "reminder"
  const calendarFooterStatus =
    !isReminder && !meeting.googleCalendarEventId ? calendarStatus : null

  return (
    <div
      data-testid={`meeting-card--${meeting.propertyMeetingId}`}
      data-scheduled-at={meeting.scheduledAt.toISOString()}
      className="rounded-lg border border-border bg-card px-4 py-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          {isReminder ? (
            <Bell className="mt-0.5 size-4 shrink-0 text-amber-500" />
          ) : (
            <CalendarClock className="mt-0.5 size-4 shrink-0 text-blue-500" />
          )}
          <div>
            <p
              data-testid={`meeting-card-title--${meeting.propertyMeetingId}`}
              className="font-medium text-foreground"
            >
              {meeting.title}
            </p>
            {meeting.buyerName && (
              <p
                data-testid={`meeting-card-buyer--${meeting.propertyMeetingId}`}
                className="text-xs text-muted-foreground"
              >
                {meeting.buyerName}
              </p>
            )}
            <p
              data-testid={`meeting-card-date--${meeting.propertyMeetingId}`}
              className="mt-0.5 text-xs text-muted-foreground"
            >
              {formatScheduledAtForCard(meeting.scheduledAt)}
              {!isReminder && meeting.durationMinutes ? ` · ${meeting.durationMinutes} min` : ""}
            </p>
            {meeting.notes && (
              <p
                data-testid={`meeting-card-notes--${meeting.propertyMeetingId}`}
                className="mt-1 text-xs text-muted-foreground"
              >
                {meeting.notes}
              </p>
            )}
          </div>
        </div>
        <button
          data-testid={`meeting-card-delete--${meeting.propertyMeetingId}`}
          onClick={() => void handleDelete()}
          disabled={deleting}
          className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
          aria-label="Delete"
        >
          {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
        </button>
      </div>
      {calendarFooterStatus != null && (
        <div className="mt-2 border-t border-border/50 pt-2">
          <MeetingCalendarFooter
            meetingId={meeting.propertyMeetingId}
            status={calendarFooterStatus}
            onRetry={() => onRetryCalendar(meeting.propertyMeetingId)}
          />
        </div>
      )}
    </div>
  )
}
