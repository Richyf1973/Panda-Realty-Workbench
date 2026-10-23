"use client"

import { useCallback, useEffect, useState } from "react"

export function useDriveSync({
  hasSavedProperty,
  listIdNum,
  onSyncSuccess,
}: {
  hasSavedProperty: boolean
  listIdNum: number
  onSyncSuccess: () => Promise<void>
}) {
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)

  useEffect(() => {
    if (!syncResult) return
    const t = setTimeout(() => setSyncResult(null), 4000)
    return () => clearTimeout(t)
  }, [syncResult])

  const handleDriveSync = useCallback(async () => {
    if (!hasSavedProperty || syncing) return
    setSyncing(true)
    setSyncResult(null)
    setSyncError(null)
    try {
      const res = await fetch("/api/admin/property-list-files/drive-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyListId: listIdNum }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? `Sync failed (${res.status})`)
      }
      const result = (await res.json()) as { added: number; upserted?: number; syncedAt: string }
      setLastSyncedAt(result.syncedAt)
      const parts: string[] = []
      if (result.added > 0) parts.push(`${result.added} new file${result.added !== 1 ? "s" : ""} added`)
      if (result.upserted && result.upserted > 0) parts.push(`${result.upserted} updated`)
      setSyncResult(parts.length > 0 ? parts.join(", ") : "0 new files added")
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Drive sync failed.")
    }
    try {
      await onSyncSuccess()
    } catch {
    } finally {
      setSyncing(false)
    }
  }, [hasSavedProperty, listIdNum, onSyncSuccess, syncing])

  return { syncing, syncResult, syncError, lastSyncedAt, handleDriveSync }
}
