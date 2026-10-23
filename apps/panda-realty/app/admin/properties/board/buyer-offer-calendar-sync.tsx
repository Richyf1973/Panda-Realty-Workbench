"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { CalendarSyncInline, type CalendarLineStatus } from "./meeting-calendar-footer"

/**
 * Auto-syncs buyer-offer milestone dates to Google Calendar on mount (once per offer id),
 * with the same inline status / Connect / Retry pattern as property meetings.
 */
export function BuyerOfferCalendarSync({
  buyerOfferId,
  onSynced,
}: {
  buyerOfferId: number
  onSynced: () => void
}) {
  const [status, setStatus] = useState<CalendarLineStatus | null>(null)
  const autoTriedRef = useRef(false)
  const onSyncedRef = useRef(onSynced)
  onSyncedRef.current = onSynced

  const runSync = useCallback(async () => {
    setStatus("syncing")
    try {
      const res = await fetch(`/api/admin/buyer-offers/${buyerOfferId}/calendar-sync`, {
        method: "POST",
      })
      const data = (await res.json()) as { ok?: boolean; reason?: string }
      if (res.ok && data.ok) {
        setStatus(null)
        onSyncedRef.current()
        return
      }
      if (res.status === 503 && data.reason === "calendar_not_connected") {
        setStatus("not_connected")
      } else {
        setStatus("error")
      }
    } catch {
      setStatus("error")
    }
  }, [buyerOfferId])

  useEffect(() => {
    autoTriedRef.current = false
    setStatus(null)
  }, [buyerOfferId])

  useEffect(() => {
    if (autoTriedRef.current) return
    autoTriedRef.current = true
    void runSync()
  }, [buyerOfferId, runSync])

  if (status === null) return null

  return (
    <CalendarSyncInline
      resourceId={buyerOfferId}
      statusTestIdPrefix="buyer-offer-calendar-sync-status"
      retryTestIdPrefix="buyer-offer-calendar-retry"
      status={status}
      onRetry={() => void runSync()}
    />
  )
}
