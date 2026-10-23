"use client"

import { CircleCheck } from "lucide-react"

import { Button } from "@repo/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/tooltip"
import type { DueWarningTier } from "@/lib/admin/due-highlight"

// Passive heads-up colours. Gold (amber) is the original far-off tone; red flags the close ones.
const TIER_CLASS: Record<DueWarningTier, string> = {
  upcoming: "border-amber-500/60 text-amber-500 hover:text-amber-600 dark:text-amber-400",
  soon: "border-red-500/60 text-red-500 hover:text-red-600 dark:text-red-400",
}

/**
 * Passive "due" tick for the properties list, sitting in the same slot as the green clear tick.
 * Red ("soon") when the next condition is within 3 days, gold ("upcoming") when further out. It is a
 * heads-up only — no action — and is replaced by the green tick on the day the date becomes due.
 */
export function PropertyDueWarningIndicator({
  propertyListId,
  labels,
  tier,
}: {
  propertyListId: number
  labels: string[]
  tier: DueWarningTier
}) {
  // labels holds the single next-in-line countdown (e.g. "Finance, due in 3 days") or is empty.
  const tooltip = labels.length > 0 ? labels[0] : "Due soon"

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={tooltip}
          data-testid={`property-due-warning--${propertyListId}`}
          data-due-warning-tier={tier}
          className={`cursor-default ${TIER_CLASS[tier]}`}
          tabIndex={0}
        >
          <CircleCheck data-icon="inline-start" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  )
}
