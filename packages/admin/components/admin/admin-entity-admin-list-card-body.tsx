"use client"

import { type Dispatch, type ReactNode, type SetStateAction } from "react"
import type { Table as TanStackTable } from "@tanstack/react-table"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { AdminEntityAdminListCardPagination } from "./admin-entity-admin-list-card-pagination"
import { AdminEntityAdminListCardTableSkeleton } from "./admin-entity-admin-list-card-table-skeleton"
import { AdminEntityListRelationFilterSidePanel } from "./admin-entity-list-relation-filter-side-panel"
import { EntityDataTable } from "./entity-data-table"
import { EntityDataTableGrid } from "./entity-data-table-grid"
import { EntityDataTableMobileCards } from "./entity-data-table-mobile-cards"
import { EntityDataTableQuickDesktopCards } from "./entity-data-table-quick-desktop-cards"
import type {
  AdminEntityListMobileCardField,
  AdminEntityListMobileCardResolvedGroup,
} from "../../admin-entity-list-mobile-card-fields"
import type { AdminEntityListRelationFilterRow } from "./admin-entity-list-relation-filter-row"
import type { AdminEntityListAppendWhereHintFilter, AdminEntityListGridSpec } from "../../admin-entity-types"
import type { AdminEntityColumn, AdminEntityListRowHighlight } from "../../admin-entity-types"
import type { AdminRenderAdminEntityListGridItem } from "../../admin-client-registry-context"
import type { AdminEntityListResponse } from "../../admin-entity-list-api"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type { AdminEntityTableRow } from "../../admin-entity-admin-types"
import { cn } from "@repo/ui/utils"
import { ClientOnly } from "@repo/ui/client-only"
import { Skeleton } from "@repo/ui/skeleton"
import { CardContent } from "@repo/ui/card"
import { Button } from "@repo/ui/button"

type ListBooleanFilterSegment = "all" | "true" | "false"

type AdminEntityAdminListCardBodyProps = {
  slug: AdminEntitySlug
  isCompactList: boolean
  compactListCardTight: boolean
  relationFiltersOnSide: boolean
  listSideFiltersPanelCollapsible?: boolean
  sideFiltersPanelOpen: boolean
  setSideFiltersPanelOpen?: Dispatch<SetStateAction<boolean>>
  isError: boolean
  errorMessage?: string
  loadErrorLabel: string
  listAboveTable: ReactNode
  isLoading: boolean
  listLimit: number
  table: TanStackTable<AdminEntityTableRow>
  rowCount: number
  dockListAggregateFooter: boolean
  showMobileCards: boolean
  showQuickDesktopCards: boolean
  showDesktopGrid: boolean
  listMobileCardFields: readonly AdminEntityListMobileCardField[]
  listMobileCardTitleColumnKey?: string
  listMobileCardGroups?: readonly AdminEntityListMobileCardResolvedGroup[]
  listMobileCardHideTitleFieldLabel?: boolean
  listHideRowActions?: boolean
  onMobileCardOpenRow?: (row: AdminEntityTableRow) => void
  titleRowOpensEditDialog?: boolean
  onRowClick?: (row: AdminEntityTableRow) => void
  listCols?: readonly AdminEntityColumn[]
  listGrid?: AdminEntityListGridSpec
  renderListGridItem?: AdminRenderAdminEntityListGridItem
  listTableQuickCompact?: boolean
  listTableColumnDividers?: boolean
  listStickyStartColumnKey?: string
  listStickyStartRowLinksWidthPx?: number
  listRowHighlight?: AdminEntityListRowHighlight
  emptyLabel: string
  totalCount: number
  totalPages: number
  displayPage: number
  listPayload: AdminEntityListResponse | undefined
  goToPage: (page: number) => void
  goNextPage: () => void
  goPrevPage: () => void
  updateErrorMessage?: string
  deleteErrorMessage?: string
  // side panel props
  relationFilterRowsSide: AdminEntityListRelationFilterRow[]
  /** Display-only mirror of the server-side append-where filter bypass; see card props. */
  sideFilterBypass?: {
    bypassBooleanFilter: boolean
    bypassedRelationColumnKeys: ReadonlySet<string>
  }
  sideHintSpecs: readonly AdminEntityListAppendWhereHintFilter[]
  listAppendWhereHintSegments?: Record<string, string>
  onListAppendWhereHintSegmentChange?: (queryParam: string, value: string) => void
  onRelationFilterChange?: (columnKey: string, value: string) => void
  onRelationMultiFilterChange?: (columnKey: string, values: string[]) => void
  listSearchEnabled?: boolean
  listSearchValue?: string
  onListSearchChange?: (value: string) => void
  listSearchTrigger?: "debounce" | "submit"
  onListSearchSubmit?: (value?: string) => void
  onListSearchClear?: () => void
  listSearchPlaceholder?: string
  listBooleanFilterLayout?: "inline" | "side"
  listBooleanFilterEnabled?: boolean
  listBooleanFilterLabels?: { all: string; true: string; false: string }
  listBooleanFilterGroupLabel?: string
  listBooleanFilterUiStyle?: "switch"
  listBooleanFilterSegment?: ListBooleanFilterSegment
  onListBooleanFilterChange?: (value: ListBooleanFilterSegment) => void
  onClearAllListFilters?: () => void
  listFiltersClearDisabled?: boolean
  /** True when current filters differ from entity defaults — gates the empty-state recovery affordance. */
  listFiltersDifferFromDefaults?: boolean
  /** Resets filters to entity defaults; backs the empty-state "Clear filters" button. */
  onResetListFiltersToDefaults?: () => void
  mobileCardTitleKey: string
}

export function AdminEntityAdminListCardBody({
  slug,
  isCompactList,
  relationFiltersOnSide,
  listSideFiltersPanelCollapsible = false,
  sideFiltersPanelOpen,
  setSideFiltersPanelOpen,
  compactListCardTight,
  isError,
  errorMessage,
  loadErrorLabel,
  listAboveTable,
  isLoading,
  listLimit,
  table,
  rowCount,
  dockListAggregateFooter,
  showMobileCards,
  showQuickDesktopCards,
  showDesktopGrid,
  listMobileCardFields,
  listMobileCardGroups,
  listMobileCardHideTitleFieldLabel = false,
  listHideRowActions = false,
  onMobileCardOpenRow,
  titleRowOpensEditDialog = false,
  onRowClick,
  listCols = [],
  listGrid,
  renderListGridItem,
  listTableQuickCompact = false,
  listTableColumnDividers = false,
  listStickyStartColumnKey,
  listStickyStartRowLinksWidthPx,
  listRowHighlight,
  emptyLabel,
  totalCount,
  totalPages,
  displayPage,
  listPayload,
  goToPage,
  goNextPage,
  goPrevPage,
  updateErrorMessage,
  deleteErrorMessage,
  relationFilterRowsSide,
  sideFilterBypass,
  sideHintSpecs,
  listAppendWhereHintSegments,
  onListAppendWhereHintSegmentChange,
  onRelationFilterChange,
  onRelationMultiFilterChange,
  listSearchEnabled,
  listSearchValue,
  onListSearchChange,
  listSearchTrigger,
  onListSearchSubmit,
  onListSearchClear,
  listSearchPlaceholder,
  listBooleanFilterLayout,
  listBooleanFilterEnabled,
  listBooleanFilterLabels,
  listBooleanFilterGroupLabel,
  listBooleanFilterUiStyle,
  listBooleanFilterSegment,
  onListBooleanFilterChange,
  onClearAllListFilters,
  listFiltersClearDisabled,
  listFiltersDifferFromDefaults,
  onResetListFiltersToDefaults,
  mobileCardTitleKey,
}: AdminEntityAdminListCardBodyProps) {
  // Display-only filter bypass: when a hint (e.g. a map-area streetFilter) drops a filter from the
  // server query, show that filter in its off position so the panel matches the results. The real
  // segment/relation values stay put, so clearing the hint restores the panel as the user left it.
  const sideBooleanFilterSegment =
    sideFilterBypass?.bypassBooleanFilter ? "all" : listBooleanFilterSegment
  const bypassedRelationColumnKeys = sideFilterBypass?.bypassedRelationColumnKeys
  const sideRelationFilterRows =
    bypassedRelationColumnKeys && bypassedRelationColumnKeys.size > 0
      ? relationFilterRowsSide.map((row) =>
          bypassedRelationColumnKeys.has(row.columnKey)
            ? { ...row, value: "", selectedValues: [] }
            : row,
        )
      : relationFilterRowsSide
  return (
    <>
      <CardContent className={cn(
        "flex h-full min-h-0 min-w-0 flex-1 flex-col gap-0 space-y-0 overflow-hidden px-0",
        relationFiltersOnSide && "col-start-1 row-start-2",
      )}>
        {isError ? (
          <p
            className="shrink-0 px-4 text-sm text-destructive"
            role="alert"
            data-testid={`admin-entity-list-error--${slug}`}
          >
            {errorMessage ?? loadErrorLabel}
          </p>
        ) : null}
        {!isError && listAboveTable ? (
          <div
            className={cn(
              "shrink-0 border-b border-border py-3",
              isCompactList ? "px-1.5" : "px-4",
            )}
          >
            {listAboveTable}
          </div>
        ) : null}
        {isLoading && !isError ? (
          <AdminEntityAdminListCardTableSkeleton
            slug={slug}
            isCompactList={isCompactList}
            listLimit={listLimit}
          />
        ) : null}
        {!isLoading && !isError ? (
          <>
            <div
              className={cn(
                "min-h-0 min-w-0 flex-1",
                dockListAggregateFooter
                  ? "flex flex-col overflow-hidden"
                  : "scrollbar-galaxy overflow-auto",
              )}
              data-testid={
                dockListAggregateFooter
                  ? undefined
                  : showMobileCards
                    ? `admin-entity-mobile-list-scroll--${slug}`
                    : showQuickDesktopCards
                      ? `admin-entity-quick-cards-scroll--${slug}`
                      : showDesktopGrid
                        ? `admin-entity-grid-scroll--${slug}`
                        : `admin-entity-table-scroll--${slug}`
              }
            >
              {showMobileCards ? (
                <EntityDataTableMobileCards
                  table={table}
                  entitySlug={slug}
                  fields={listMobileCardFields}
                  titleColumnKey={mobileCardTitleKey}
                  groups={listMobileCardGroups}
                  listHideRowActions={listHideRowActions}
                  compactChrome={isCompactList}
                  compactListCardDense={compactListCardTight}
                  hideTitleFieldLabel={listMobileCardHideTitleFieldLabel}
                  onMobileCardOpenRow={onMobileCardOpenRow}
                  titleRowOpensEditDialog={titleRowOpensEditDialog}
                  listRowHighlight={listRowHighlight}
                />
              ) : showQuickDesktopCards ? (
                <EntityDataTableQuickDesktopCards
                  table={table}
                  entitySlug={slug}
                  listCols={listCols}
                  listHideRowActions={listHideRowActions}
                  onRowClick={onRowClick}
                  listRowHighlight={listRowHighlight}
                />
              ) : showDesktopGrid ? (
                <EntityDataTableGrid
                  table={table}
                  entitySlug={slug}
                  listCols={listCols}
                  previewColumnCount={listGrid!.previewColumnCount ?? 4}
                  renderCustomItem={renderListGridItem}
                  listHideRowActions={listHideRowActions}
                />
              ) : (
                <EntityDataTable
                  table={table}
                  entitySlug={slug}
                  dockAggregateFooter={dockListAggregateFooter}
                  compactCellPadding={listTableQuickCompact}
                  showColumnDividers={listTableColumnDividers}
                  onRowClick={onRowClick}
                  listRowHighlight={listRowHighlight}
                  stickyStartColumnKey={listStickyStartColumnKey}
                  stickyStartRowLinksWidthPx={listStickyStartRowLinksWidthPx}
                />
              )}
            </div>
            {rowCount === 0 ? (
              <p
                className="shrink-0 border-t border-border px-4 py-3 text-sm text-muted-foreground"
                data-testid={`admin-entity-list-empty--${slug}`}
              >
                {listFiltersDifferFromDefaults && onResetListFiltersToDefaults ? (
                  <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                    No matches for the current filters.
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-sm"
                      onClick={onResetListFiltersToDefaults}
                      data-testid={`admin-entity-list-empty-clear-filters--${slug}`}
                    >
                      Clear filters
                    </Button>
                  </span>
                ) : (
                  emptyLabel
                )}
              </p>
            ) : null}
          </>
        ) : null}
        {!isLoading && !isError && totalCount > 0 ? (
          <AdminEntityAdminListCardPagination
            slug={slug}
            isCompactList={isCompactList}
            listPayload={listPayload}
            displayPage={displayPage}
            totalPages={totalPages}
            rowCount={rowCount}
            totalCount={totalCount}
            goPrevPage={goPrevPage}
            goNextPage={goNextPage}
            goToPage={goToPage}
          />
        ) : null}
        {updateErrorMessage ? (
          <p
            className="px-4 pt-2 text-sm text-destructive"
            role="alert"
            data-testid={`admin-entity-update-error--${slug}`}
          >
            {updateErrorMessage}
          </p>
        ) : null}
        {deleteErrorMessage ? (
          <p
            className="px-4 pt-2 text-sm text-destructive"
            role="alert"
            data-testid={`admin-entity-delete-error--${slug}`}
          >
            {deleteErrorMessage}
          </p>
        ) : null}
      </CardContent>
      {relationFiltersOnSide ? (
        <div className="col-start-2 row-start-1 row-end-3 flex min-h-0 flex-row overflow-hidden">
          {listSideFiltersPanelCollapsible ? (
            <button
              type="button"
              onClick={() => setSideFiltersPanelOpen?.((v) => !v)}
              aria-expanded={sideFiltersPanelOpen}
              aria-label={sideFiltersPanelOpen ? "Collapse filters" : "Expand filters"}
              data-testid={`admin-entity-filter-side-panel-toggle--${slug}`}
              className="flex h-full w-9 shrink-0 items-center justify-center border-l border-border bg-muted/15 text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
            >
              {sideFiltersPanelOpen ? (
                <ChevronLeft className="size-4" aria-hidden />
              ) : (
                <ChevronRight className="size-4" aria-hidden />
              )}
            </button>
          ) : null}
          <div className={cn("min-h-0 flex-1 overflow-hidden", listSideFiltersPanelCollapsible && !sideFiltersPanelOpen ? "hidden" : "flex flex-col")}>
            <ClientOnly
              fallback={
                listSideFiltersPanelCollapsible ? null : (
                  <aside
                    className="scrollbar-galaxy flex h-full min-h-0 max-h-full w-full shrink-0 flex-col gap-4 overflow-y-auto border-l border-border bg-muted/15 px-3 py-3 sm:px-4"
                    aria-hidden
                    data-testid={`admin-entity-relation-filters-side--${slug}--ssr-fallback`}
                  >
                    {relationFilterRowsSide.map((row) => (
                      <div key={row.columnKey} className="flex flex-col gap-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-24 w-full rounded-md" />
                      </div>
                    ))}
                    {sideHintSpecs.map((spec) => (
                      <div key={spec.queryParam} className="flex flex-col gap-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-24 w-full rounded-md" />
                      </div>
                    ))}
                  </aside>
                )
              }
            >
              <AdminEntityListRelationFilterSidePanel
                slug={slug}
                rows={sideRelationFilterRows}
                hintFilterSpecs={sideHintSpecs}
                hintFilterSegments={listAppendWhereHintSegments}
                onHintFilterChange={onListAppendWhereHintSegmentChange}
                onRelationFilterChange={onRelationFilterChange}
                onRelationMultiFilterChange={onRelationMultiFilterChange}
                searchEnabled={listSearchEnabled}
                searchValue={listSearchValue}
                onSearchChange={onListSearchChange}
                searchTrigger={listSearchTrigger}
                onSearchSubmit={onListSearchSubmit}
                onSearchClear={onListSearchClear}
                searchPlaceholder={listSearchPlaceholder}
                booleanFilter={listBooleanFilterLayout === "side" && listBooleanFilterEnabled ? listBooleanFilterLabels : undefined}
                booleanFilterGroupLabel={listBooleanFilterGroupLabel}
                booleanFilterUiStyle={listBooleanFilterUiStyle}
                booleanFilterSegment={sideBooleanFilterSegment}
                onBooleanFilterChange={onListBooleanFilterChange}
                onClearAllFilters={onClearAllListFilters}
                clearFiltersDisabled={listFiltersClearDisabled}
              />
            </ClientOnly>
          </div>
        </div>
      ) : null}
    </>
  )
}
