"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { CalendarLineStatus } from "./meeting-calendar-footer"
import type { PropertyDetailMeeting } from "./property-types"

export function useMeetingsCalendarSync(
  meetings: PropertyDetailMeeting[],
  onRefetch: () => void,
) {
  const [calendarLineState, setCalendarLineState] = useState<
    Record<number, CalendarLineStatus>
  >({})

  const autoSyncTriedRef = useRef<Set<number>>(new Set())
  const onRefetchRef = useRef(onRefetch)
  onRefetchRef.current = onRefetch
  const meetingsRef = useRef(meetings)
  meetingsRef.current = meetings

  const syncEffectKey = useMemo(
    () =>
      meetings
        .filter((m) => m.type === "meeting")
        .map((m) => `${m.propertyMeetingId}:${m.googleCalendarEventId ?? ""}`)
        .sort()
        .join("|"),
    [meetings],
  )

  const runCalendarSync = useCallback(async (meetingId: number) => {
    setCalendarLineState((s) => ({ ...s, [meetingId]: "syncing" }))
    try {
      const res = await fetch(`/api/admin/property-meetings/${meetingId}/calendar-sync`, {
        method: "POST",
      })
      if (res.ok) {
        setCalendarLineState((s) => {
          const next = { ...s }
          delete next[meetingId]
          return next
        })
        onRefetchRef.current()
        return
      }
      const body = (await res.json().catch(() => ({}))) as { reason?: string }
      setCalendarLineState((s) => ({
        ...s,
        [meetingId]:
          body.reason === "calendar_not_connected" ? "not_connected" : "error",
      }))
    } catch {
      setCalendarLineState((s) => ({ ...s, [meetingId]: "error" }))
    }
  }, [])

  useEffect(() => {
    const unsynced = meetingsRef.current.filter(
      (m) => m.type === "meeting" && !m.googleCalendarEventId,
    )
    for (const m of unsynced) {
      const id = m.propertyMeetingId
      if (autoSyncTriedRef.current.has(id)) continue
      autoSyncTriedRef.current.add(id)
      void runCalendarSync(id)
    }
  }, [syncEffectKey, runCalendarSync])

  return { calendarLineState, runCalendarSync }
}
