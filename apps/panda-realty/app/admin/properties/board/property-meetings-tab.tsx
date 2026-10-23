"use client"

import { useState } from "react"

import { AddMeetingDialog } from "./add-meeting-dialog"
import { AddReminderDialog } from "./add-reminder-dialog"
import { MeetingCard } from "./meeting-card"
import { EmptyState } from "./panel-shared"
import { useMeetingsCalendarSync } from "./use-meetings-calendar-sync"
import type { PropertyDetailBuyer, PropertyDetailMeeting } from "./property-types"

export { AddMeetingDialog } from "./add-meeting-dialog"

export function MeetingsTab({
  meetings,
  propertyListId,
  buyers,
  meetingDialogOpen,
  reminderDialogOpen,
  onMeetingDialogOpenChange,
  onReminderDialogOpenChange,
  onRefetch,
  defaultMeetingBuyerId,
}: {
  meetings: PropertyDetailMeeting[]
  propertyListId: number
  buyers: PropertyDetailBuyer[]
  meetingDialogOpen: boolean
  reminderDialogOpen: boolean
  onMeetingDialogOpenChange: (open: boolean) => void
  onReminderDialogOpenChange: (open: boolean) => void
  onRefetch: () => void
  defaultMeetingBuyerId?: number
}) {
  const [syncWarning, setSyncWarning] = useState<string | null>(null)
  const { calendarLineState, runCalendarSync } = useMeetingsCalendarSync(meetings, onRefetch)

  const meetingItems = meetings.filter((m) => m.type === "meeting")
  const reminderItems = meetings.filter((m) => m.type === "reminder")

  return (
    <>
      <AddMeetingDialog
        open={meetingDialogOpen}
        onOpenChange={onMeetingDialogOpenChange}
        propertyListId={propertyListId}
        buyers={buyers}
        onAdded={onRefetch}
        onSyncError={setSyncWarning}
        defaultBuyerId={defaultMeetingBuyerId}
      />
      <AddReminderDialog
        open={reminderDialogOpen}
        onOpenChange={onReminderDialogOpenChange}
        propertyListId={propertyListId}
        buyers={buyers}
        onAdded={onRefetch}
      />

      <div data-testid="meetings-tab-content" className="space-y-6">
        {syncWarning && (
          <div
            data-testid="meetings-sync-warning"
            className="flex items-start justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
          >
            <span>{syncWarning}</span>
            <button
              type="button"
              onClick={() => setSyncWarning(null)}
              className="shrink-0 text-amber-600 hover:text-amber-800 dark:text-amber-400"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Meetings
          </h3>
          <div data-testid="meetings-section">
            {meetingItems.length === 0 ? (
              <EmptyState message="No meetings scheduled." />
            ) : (
              <div className="space-y-2">
                {meetingItems.map((m) => {
                  const calendarStatus = m.googleCalendarEventId
                    ? null
                    : (calendarLineState[m.propertyMeetingId] ?? "syncing")
                  return (
                    <MeetingCard
                      key={m.propertyMeetingId}
                      meeting={m}
                      onDeleted={onRefetch}
                      calendarStatus={calendarStatus}
                      onRetryCalendar={(id) => void runCalendarSync(id)}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Reminders
          </h3>
          <div data-testid="reminders-section">
            {reminderItems.length === 0 ? (
              <EmptyState message="No reminders set." />
            ) : (
              <div className="space-y-2">
                {reminderItems.map((m) => (
                  <MeetingCard
                    key={m.propertyMeetingId}
                    meeting={m}
                    onDeleted={onRefetch}
                    calendarStatus={null}
                    onRetryCalendar={() => undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  )
}
