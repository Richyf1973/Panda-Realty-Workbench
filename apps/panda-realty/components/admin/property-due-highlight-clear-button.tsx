"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { CircleCheck } from "lucide-react"

import { Button } from "@repo/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/tooltip"

/**
 * Clears the due-date green highlight for a property. Posts to the clear route and refetches the
 * properties list so the row de-tints. Re-lights automatically when a later date becomes due.
 */
export function PropertyDueHighlightClearButton({
  propertyListId,
  labels,
}: {
  propertyListId: number
  labels: string[]
}) {
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)

  // labels holds the single next-in-line milestone (or is empty); name it directly.
  const reason = labels.length > 0 ? `${labels[0]}, due today. ` : ""
  const tooltip = `${reason}Click to clear.`

  async function handleClear() {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/properties/${propertyListId}/due-highlight-clear`, {
        method: "POST",
      })
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ["admin", "properties"] })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Clear due highlight"
          data-testid={`property-due-highlight-clear--${propertyListId}`}
          className="border-green-600/40 text-green-700 hover:text-green-800 dark:text-green-400"
          disabled={busy}
          onClick={handleClear}
        >
          <CircleCheck data-icon="inline-start" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  )
}
