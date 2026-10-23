"use client"

import type { ReactNode } from "react"

import type { AdminRenderCrudFormGroupBodyArgs } from "@repo/admin/admin-client-registry-context"
import {
  ADMIN_ENTITY_CRUD_FORM_FIELDS_GRID_CLASS,
  ADMIN_ENTITY_CRUD_FORM_GRID_TEMPLATE_COLUMNS_WIDE,
} from "@repo/admin/admin-entity-form-grid"
import { cn } from "@repo/ui/utils"

/**
 * Flags row: Seller + To be contacted share one flex container; date + last viewed stay on the same 12-col row.
 */
export function renderPandaEntitiesCrudFormGroupBody(
  args: AdminRenderCrudFormGroupBodyArgs,
): ReactNode | null {
  if (args.slug !== "entities" || args.group.key !== "flags") return null

  const { group, wideGrid, isCompact, extraGridClassName, renderGroupField } =
    args
  const pick = (k: string) => group.cols.find((c) => c.key === k)
  const isSeller = pick("isSeller")
  const toBeContacted = pick("toBeContacted")
  const toBeContactedDate = pick("toBeContactedDate")
  const lastViewedProperty = pick("lastViewedProperty")
  if (
    !isSeller ||
    !toBeContacted ||
    !toBeContactedDate ||
    !lastViewedProperty
  ) {
    return null
  }

  return (
    <div
      className={cn(
        ADMIN_ENTITY_CRUD_FORM_FIELDS_GRID_CLASS,
        isCompact && "admin-entity-crud-form-fields-grid--compact",
        extraGridClassName,
      )}
      style={{
        gridTemplateColumns: wideGrid
          ? ADMIN_ENTITY_CRUD_FORM_GRID_TEMPLATE_COLUMNS_WIDE
          : "1fr",
      }}
      data-testid="panda-entities-form-flags-section-grid"
    >
      <div
        className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:gap-6"
        style={{
          gridColumn: wideGrid ? "span 4 / span 4" : undefined,
        }}
        data-testid="panda-entities-form-flags-toggles"
      >
        {renderGroupField(isSeller, {})}
        {renderGroupField(toBeContacted, {})}
      </div>
      {renderGroupField(toBeContactedDate, {
        gridColumn: wideGrid ? "span 4 / span 4" : undefined,
      })}
      {renderGroupField(lastViewedProperty, {
        gridColumn: wideGrid ? "span 4 / span 4" : undefined,
      })}
    </div>
  )
}
