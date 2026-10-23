"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Wrench } from "lucide-react"
import { useCompactAdminListViewport } from "@repo/ui/use-compact-admin-list-viewport"
import { Button } from "@repo/ui/button"

import type { AdminRenderAdminEntityListAboveTableArgs } from "@repo/admin/admin-client-registry-types"
import { LeadImportToolbar } from "@/components/admin/lead-import-toolbar"
import { PropertiesExportToolbar } from "@/components/admin/properties-export-toolbar"
import { PropertiesImportToolbar } from "@/components/admin/properties-import-toolbar"
import { PropertyMapFilter } from "@/components/admin/property-map-filter"
import { PropertiesGeneralSearchBar } from "@/components/admin/properties-general-search-bar"

type Props = Pick<
  AdminRenderAdminEntityListAboveTableArgs,
  "onListRefetch" | "adminUiMutationsDisabled" | "totalCount" | "hasActiveListFilters"
>

export function PropertiesAboveTableWrapper({
  onListRefetch,
  adminUiMutationsDisabled,
  totalCount,
  hasActiveListFilters,
}: Props) {
  const isCompact = useCompactAdminListViewport()
  const [toolsOpen, setToolsOpen] = useState(false)

  const actionsSection = (
    <div className="flex flex-wrap gap-2 items-center" data-testid="properties-import-toolbar-container">
      <PropertiesImportToolbar
        onListRefetch={onListRefetch}
        adminUiMutationsDisabled={adminUiMutationsDisabled}
      />
      <LeadImportToolbar
        onImported={onListRefetch}
        adminUiMutationsDisabled={adminUiMutationsDisabled}
      />
      <PropertiesExportToolbar
        totalCount={totalCount}
        hasActiveListFilters={hasActiveListFilters}
        adminUiMutationsDisabled={adminUiMutationsDisabled}
      />
    </div>
  )

  if (!isCompact) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <PropertyMapFilter />
          <PropertiesGeneralSearchBar />
        </div>
        {actionsSection}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Search gets full width on its own row */}
      <PropertiesGeneralSearchBar />
      {/* Secondary row: Map Filter left, Tools toggle right */}
      <div className="flex items-center justify-between gap-2">
        <PropertyMapFilter />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5 px-2.5"
          onClick={() => setToolsOpen((v) => !v)}
          aria-expanded={toolsOpen}
          aria-label={toolsOpen ? "Hide import tools" : "Show import tools"}
          data-testid="properties-tools-toggle"
        >
          <Wrench className="size-3.5 shrink-0" aria-hidden />
          Tools
          {toolsOpen ? (
            <ChevronUp className="size-3.5 shrink-0" aria-hidden />
          ) : (
            <ChevronDown className="size-3.5 shrink-0" aria-hidden />
          )}
        </Button>
      </div>
      {toolsOpen && actionsSection}
    </div>
  )
}
