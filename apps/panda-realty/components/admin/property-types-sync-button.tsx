"use client"

import { useState } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@repo/ui/button"

type Props = {
  onListRefetch: () => void
  adminUiMutationsDisabled?: boolean
}

export function PropertyTypesSyncButton({ onListRefetch, adminUiMutationsDisabled }: Props) {
  const [isPending, setIsPending] = useState(false)
  const [result, setResult] = useState<{ inserted: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (adminUiMutationsDisabled) return null

  async function handleSync() {
    setIsPending(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch("/api/admin/property-types/sync", { method: "POST" })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || "Sync failed")
      }
      const json = (await res.json()) as { inserted: number }
      setResult(json)
      onListRefetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-1 border-b border-border/80 bg-muted/20 px-4 py-2">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={() => void handleSync()}
        >
          <RefreshCw
            className={`mr-1.5 size-4 shrink-0 ${isPending ? "animate-spin" : ""}`}
            aria-hidden
          />
          {isPending ? "Syncing…" : "Sync from Properties"}
        </Button>
        {result != null && (
          <span className="text-sm text-muted-foreground">
            {result.inserted === 0
              ? "Already up to date."
              : `${result.inserted} new type${result.inserted === 1 ? "" : "s"} added.`}
          </span>
        )}
      </div>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
