"use client"

import { Checkbox } from "@repo/ui/checkbox"
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/tooltip"
import { useAdminListClientHiddenRows } from "@repo/admin/admin-list-client-hidden-rows-context"
import { useAdminListRowRenderMode } from "@repo/admin/admin-list-row-render-mode-context"

/**
 * Per-row "remove from this view" checkbox for the properties list. Lives at the
 * start of the (sticky, always-visible) action-icon cluster. Ticking it hides the
 * row from the on-screen table only — client memory, non-persistent, no DB write.
 * Renders only in the desktop table layout (not the map quick-card / mobile cards).
 */
export function PropertyListRowHideFromViewCheckbox({
  propertyListId,
}: {
  propertyListId: number
}) {
  const { enabled, hide } = useAdminListClientHiddenRows()
  const renderMode = useAdminListRowRenderMode()
  if (!enabled || renderMode !== "table") return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center" tabIndex={0}>
          <Checkbox
            checked={false}
            onCheckedChange={() => hide(String(propertyListId))}
            aria-label="Remove from this view"
            data-testid={`admin-entity-row-hide-from-view--properties--${propertyListId}`}
          />
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        Remove from this view only — does not delete
      </TooltipContent>
    </Tooltip>
  )
}
