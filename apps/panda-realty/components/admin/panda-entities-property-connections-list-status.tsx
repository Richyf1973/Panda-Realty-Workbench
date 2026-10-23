"use client"

import type { ReactNode } from "react"

import { AdminEntityCrudListRelationSelectControl } from "@repo/admin/components/admin/admin-entity-crud-list-relation-select-control"
import { Label } from "@repo/ui/label"
import { cn } from "@repo/ui/utils"

import type { SelectValue } from "./use-panda-entities-property-connections"

type FavoritesOption = { value: SelectValue; label: string }

export function PandaEntitiesPropertyConnectionsListStatus({
  loadingList,
  listError,
  allFavoritesOptions,
  selectValue,
  onSelectValueChange,
  linkButton,
  isCompact = false,
}: {
  loadingList: boolean
  listError: string | null
  allFavoritesOptions: FavoritesOption[]
  selectValue: SelectValue
  onSelectValueChange: (v: SelectValue) => void
  /** Rendered inline beside the select when an unlinked favorite is selected. */
  linkButton?: ReactNode
  isCompact?: boolean
}) {
  if (loadingList) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }
  if (listError != null) {
    return (
      <p
        role="alert"
        className="text-sm text-destructive"
        data-testid="panda-entities-property-connections--list-error"
      >
        Could not load property connections. {listError}
      </p>
    )
  }
  if (allFavoritesOptions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No favorite properties available.</p>
    )
  }
  return (
    <div className={cn("flex items-center", isCompact ? "gap-2" : "gap-3")}>
      <Label
        htmlFor="panda-entities-pe-select"
        className={cn(
          "shrink-0 font-normal text-muted-foreground",
          isCompact ? "text-xs" : "text-sm",
        )}
      >
        Property connection
      </Label>
      <div className="min-w-0 flex-1 max-w-sm">
        <AdminEntityCrudListRelationSelectControl
          htmlForId="panda-entities-pe-select"
          data-testid="panda-entities-property-connections--select"
          ariaLabel="Property connection"
          required={false}
          value={selectValue}
          onChange={(v) => onSelectValueChange(v as SelectValue)}
          onBlur={() => undefined}
          emptyChoiceLabel="Select property…"
          baseOptions={allFavoritesOptions}
          optionsPending={false}
        />
      </div>
      {linkButton}
    </div>
  )
}
