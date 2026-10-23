"use client"

import { googleOAuthConnectHref } from "@/lib/google-oauth-connect"

export type CalendarLineStatus = "syncing" | "not_connected" | "error"

type CalendarSyncInlineProps = {
  resourceId: number
  /** e.g. `meeting-calendar-sync-status--${id}` on the status line */
  statusTestIdPrefix: string
  /** e.g. `meeting-calendar-retry` → `meeting-calendar-retry--${id}` on Retry */
  retryTestIdPrefix: string
  status: CalendarLineStatus
  onRetry: () => void
}

/**
 * Inline calendar sync feedback (syncing, connect Google, or retry).
 * Used for property meeting cards and buyer-offer milestone sync.
 */
export function CalendarSyncInline({
  resourceId,
  statusTestIdPrefix,
  retryTestIdPrefix,
  status,
  onRetry,
}: CalendarSyncInlineProps) {
  const statusTid = `${statusTestIdPrefix}--${resourceId}`
  const retryTid = `${retryTestIdPrefix}--${resourceId}`

  if (status === "syncing") {
    return (
      <p className="text-xs text-muted-foreground" data-testid={statusTid}>
        Syncing to calendar…
      </p>
    )
  }
  if (status === "not_connected") {
    return (
      <p
        className="text-xs text-amber-800 dark:text-amber-300"
        data-testid={statusTid}
      >
        Google Calendar not connected.{" "}
        <a
          href={googleOAuthConnectHref()}
          className="font-medium underline hover:no-underline"
        >
          Connect Google
        </a>
      </p>
    )
  }
  return (
    <p className="text-xs text-muted-foreground" data-testid={statusTid}>
      Calendar sync failed.{" "}
      <button
        type="button"
        data-testid={retryTid}
        className="font-medium text-primary underline hover:no-underline"
        onClick={onRetry}
        aria-label="Retry calendar sync"
      >
        Retry
      </button>
    </p>
  )
}

export function MeetingCalendarFooter({
  meetingId,
  status,
  onRetry,
}: {
  meetingId: number
  status: CalendarLineStatus
  onRetry: () => void
}) {
  return (
    <CalendarSyncInline
      resourceId={meetingId}
      statusTestIdPrefix="meeting-calendar-sync-status"
      retryTestIdPrefix="meeting-calendar-retry"
      status={status}
      onRetry={onRetry}
    />
  )
}
