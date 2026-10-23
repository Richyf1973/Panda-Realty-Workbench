"use client"

import { AdminEntityAdminListCardToolbarRow } from "./admin-entity-admin-list-card-toolbar-row"
import { AdminEntityListFiltersToolbar } from "./admin-entity-list-filters-toolbar"
import { AdminEntityListMobileFiltersBar } from "./admin-entity-list-mobile-filters-bar"
import type { AdminEntityAdminListCardHeaderProps } from "./admin-entity-admin-list-card-header-props"
import { cn } from "@repo/ui/utils"
import { Skeleton } from "@repo/ui/skeleton"
import {
  CardDescription,
  CardHeader,
} from "@repo/ui/card"
import { useAdminListClientHiddenRows } from "../../admin-list-client-hidden-rows-context"

export function AdminEntityAdminListCardHeader({
  slug,
  listTitle,
  showListCardTitle,
  isCompactList,
  compactListCardTight,
  listToolbarDenseDesktop,
  relationFiltersOnSide,
  listCreateEnabled,
  onOpenCreateDialog,
  addNewLabel,
  addNewDisabled,
  isLoading,
  isRefetching,
  listViewportChrome,
  listGrid,
  listLayoutMode,
  onListLayoutModeChange,
  onListRefresh,
  pageSizeOptions,
  listLimit,
  onPageSizeChange,
  showDesktopFilters,
  listSearchEnabled,
  listSearchValue,
  onListSearchChange,
  listSearchPlaceholder,
  listSearchTrigger,
  onListSearchSubmit,
  onListSearchClear,
  listBooleanFilterEnabled,
  listBooleanFilterLayout,
  listBooleanFilterUiStyle,
  listBooleanFilterSegment,
  onListBooleanFilterChange,
  listBooleanFilterLabels,
  listBooleanFilterGroupLabel,
  listAppendWhereHintFilterEnabled,
  listAppendWhereHintSpecs,
  inlineHintSpecs,
  listAppendWhereHintSegments,
  onListAppendWhereHintSegmentChange,
  listYearMonthFilterEnabled,
  listYearMonthFilterLabel,
  listYearMonthFilterValue,
  listYearMonthFilterAllowAll,
  listYearMonthFilterOptions,
  listYearMonthFilterPending,
  onListYearMonthFilterChange,
  listDateRangeFilterEnabled,
  listDateRangeFilterRows,
  onListDateRangeChange,
  listRelationFilterEnabled,
  relationFilterRowsInline,
  relationFilterRowsAll,
  onRelationFilterChange,
  onRelationMultiFilterChange,
  onClearAllListFilters,
  listFiltersClearDisabled,
  listFiltersToolbarDense,
  showMobileFilterBar,
  summaryLines,
  isError,
  loadErrorLabel,
  totalCount,
  listStatusFull,
}: AdminEntityAdminListCardHeaderProps) {
  const {
    enabled: hideFromViewEnabled,
    hiddenCount,
    reset: resetHiddenRows,
  } = useAdminListClientHiddenRows()
  return (
    <CardHeader
      className={cn(
        "relative z-10",
        isCompactList
          ? compactListCardTight
            ? "space-y-0.5 pb-0.5 pt-0"
            : "space-y-1 pb-1 pt-0.5"
          : listToolbarDenseDesktop
            ? "space-y-1.5"
            : "space-y-3",
        isCompactList && "min-w-0 px-1.5",
        relationFiltersOnSide && "col-start-1 row-start-1 min-w-0 overflow-hidden",
      )}
    >
      <AdminEntityAdminListCardToolbarRow
        slug={slug}
        listTitle={listTitle}
        showListCardTitle={showListCardTitle}
        isCompactList={isCompactList}
        listToolbarDenseDesktop={listToolbarDenseDesktop}
        listCreateEnabled={listCreateEnabled}
        onOpenCreateDialog={onOpenCreateDialog}
        addNewLabel={addNewLabel}
        addNewDisabled={addNewDisabled}
        isLoading={isLoading}
        isRefetching={isRefetching}
        listViewportChrome={listViewportChrome}
        listGrid={listGrid}
        listLayoutMode={listLayoutMode}
        onListLayoutModeChange={onListLayoutModeChange}
        onListRefresh={onListRefresh}
        pageSizeOptions={pageSizeOptions}
        listLimit={listLimit}
        onPageSizeChange={onPageSizeChange}
      />
      {showDesktopFilters ? (
        <AdminEntityListFiltersToolbar
          slug={slug}
          listSearchEnabled={listSearchEnabled && !relationFiltersOnSide}
          listSearchValue={listSearchValue}
          onListSearchChange={onListSearchChange}
          listSearchPlaceholder={listSearchPlaceholder}
          listBooleanFilterEnabled={listBooleanFilterEnabled && listBooleanFilterLayout !== "side"}
          listBooleanFilterSegment={listBooleanFilterSegment}
          onListBooleanFilterChange={onListBooleanFilterChange}
          listBooleanFilterLabels={listBooleanFilterLabels}
          listBooleanFilterGroupLabel={listBooleanFilterGroupLabel}
          listAppendWhereHintFilterEnabled={
            listAppendWhereHintFilterEnabled && inlineHintSpecs.length > 0
          }
          listAppendWhereHintSpecs={inlineHintSpecs}
          listAppendWhereHintSegments={listAppendWhereHintSegments}
          onListAppendWhereHintSegmentChange={onListAppendWhereHintSegmentChange}
          listYearMonthFilterEnabled={listYearMonthFilterEnabled}
          listYearMonthFilterLabel={listYearMonthFilterLabel}
          listYearMonthFilterValue={listYearMonthFilterValue}
          listYearMonthFilterAllowAll={listYearMonthFilterAllowAll}
          listYearMonthFilterOptions={listYearMonthFilterOptions}
          listYearMonthFilterPending={listYearMonthFilterPending}
          onListYearMonthFilterChange={onListYearMonthFilterChange}
          listDateRangeFilterEnabled={listDateRangeFilterEnabled}
          listDateRangeFilterRows={listDateRangeFilterRows}
          onListDateRangeChange={onListDateRangeChange}
          listRelationFilterEnabled={
            listRelationFilterEnabled &&
            relationFilterRowsInline.length > 0
          }
          relationFilterRows={relationFilterRowsInline}
          onRelationFilterChange={onRelationFilterChange}
          onRelationMultiFilterChange={onRelationMultiFilterChange}
          onClearAllListFilters={onClearAllListFilters}
          listFiltersClearDisabled={listFiltersClearDisabled}
          suppressClearButton={relationFiltersOnSide}
          isLoading={isLoading}
          listFiltersToolbarDense={listFiltersToolbarDense}
        />
      ) : null}
      {showMobileFilterBar ? (
        <div
          className="min-w-0 w-full"
          data-testid={`admin-entity-list-mobile-filters-wrap--${slug}`}
        >
          <AdminEntityListMobileFiltersBar
            slug={slug}
            summaryLines={summaryLines}
            compactChrome={isCompactList}
            toolbarProps={{
              slug,
              listSearchEnabled,
              listSearchValue,
              onListSearchChange,
              listSearchPlaceholder,
              listBooleanFilterEnabled,
              listBooleanFilterSegment,
              onListBooleanFilterChange,
              listBooleanFilterLabels,
              listBooleanFilterGroupLabel,
              listAppendWhereHintFilterEnabled,
              listAppendWhereHintSpecs,
              listAppendWhereHintSegments,
              onListAppendWhereHintSegmentChange,
              listYearMonthFilterEnabled,
              listYearMonthFilterLabel,
              listYearMonthFilterValue,
              listYearMonthFilterAllowAll,
              listYearMonthFilterOptions,
              listYearMonthFilterPending,
              onListYearMonthFilterChange,
              listDateRangeFilterEnabled,
              listDateRangeFilterRows,
              onListDateRangeChange,
              listRelationFilterEnabled:
                listRelationFilterEnabled &&
                relationFilterRowsAll.length > 0,
              relationFilterRows: relationFilterRowsAll,
              onRelationFilterChange,
              onRelationMultiFilterChange,
              onClearAllListFilters,
              listFiltersClearDisabled,
              isLoading,
            }}
          />
        </div>
      ) : null}
      {!isCompactList ? (
        <CardDescription
          data-testid={`admin-entity-list-status--${slug}`}
          className={cn(
            listToolbarDenseDesktop && "text-xs leading-snug text-muted-foreground",
          )}
        >
          {isLoading ? (
            <>
              <span className="sr-only">Loading list</span>
              <Skeleton className="h-4 w-56 max-w-full" />
            </>
          ) : isError ? (
            loadErrorLabel
          ) : totalCount === 0 ? (
            "0 rows"
          ) : (
            listStatusFull
          )}
          {hideFromViewEnabled && hiddenCount > 0 ? (
            <span
              data-testid={`admin-entity-removed-from-view--${slug}`}
              className="ml-2 inline-flex items-center gap-1 text-muted-foreground"
            >
              <span aria-hidden>·</span>
              {hiddenCount} removed from view
              <button
                type="button"
                onClick={resetHiddenRows}
                data-testid={`admin-entity-removed-from-view-reset--${slug}`}
                className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
              >
                Reset
              </button>
            </span>
          ) : null}
        </CardDescription>
      ) : null}
    </CardHeader>
  )
}
