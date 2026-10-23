"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Switch } from "@repo/ui/switch"
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/tooltip"

import { SHARE_TOGGLE_ERROR, type ShareToggleField, shareToggleMessage } from "@/lib/share-toggle-toast"

/**
 * A per-file share switch with a visible audience label (Buyer / Seller).
 * Owns the PATCH call, pending state, and confirmation toast; the parent
 * decides what `checked` reflects and reacts via `onConfirmed`.
 */
export function LabelledShareToggle({
  checked,
  kind,
  id,
  field,
  label,
  labelTestId,
  switchTestId,
  patchFn,
  onConfirmed,
}: {
  checked: boolean
  kind: string
  id: number
  field: ShareToggleField
  label: string
  labelTestId: string
  switchTestId: string
  patchFn: (kind: string, id: number, value: boolean) => Promise<boolean>
  onConfirmed: (value: boolean) => void
}) {
  const [pending, setPending] = useState(false)

  async function handleChange(value: boolean) {
    setPending(true)
    try {
      const ok = await patchFn(kind, id, value)
      if (ok) {
        onConfirmed(value)
        toast.success(shareToggleMessage(field, value))
      } else {
        toast.error(SHARE_TOGGLE_ERROR)
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span data-testid={labelTestId} className="text-xs text-muted-foreground">
        {label}
      </span>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Switch
            checked={checked}
            onCheckedChange={handleChange}
            disabled={pending}
            aria-label={`Share with ${label.toLowerCase()}`}
            data-testid={switchTestId}
          />
        </TooltipTrigger>
        <TooltipContent side="top">{label}</TooltipContent>
      </Tooltip>
    </span>
  )
}
