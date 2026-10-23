"use client"

import { AdminEntityAdminListCardHeader } from "./admin-entity-admin-list-card-header"
import { AdminEntityAdminListCardBody } from "./admin-entity-admin-list-card-body"
import type { AdminEntityListRelationFilterRow } from "./admin-entity-list-relation-filter-row"
import type {
  AdminEntityAdminListCardProps,
  ListBooleanFilterSegment,
} from "./admin-entity-admin-list-card-props"
import { cn } from "@repo/ui/utils"
import { Card } from "@repo/ui/card"
import { useAdminEntityAdminListCardDerivedState } from "./admin-entity-admin-list-card-state"

export type { AdminEntityListRelationFilterRow } from "./admin-entity-list-relation-filter-row"
export type { AdminEntityAdminListCardProps } from "./admin-entity-admin-list-card-props"

export function AdminEntityAdminListCard({
  slug,
  listTitle,
  listShowListCardTitle = false,
  listShowListCardTitleOnCompact = false,
  listSearchEnabled = false,
  listSearchValue = "",
  onListSearchChange,
  listSearchTrigger = "debounce",
  onListSearchSubmit,
  onListSearchClear,
  listSearchPlaceholder = "Search",
  listBooleanFilterEnabled = false,
  listBooleanFilterSegment = "all",
  onListBooleanFilterChange,
  listBooleanFilterLabels,
  listBooleanFilterGroupLabel = "Filter",
  listBooleanFilterLayout = "inline",
  listBooleanFilterUiStyle,
  listAppendWhereHintFilterEnabled = false,
  listAppendWhereHintSpecs = [],
  listAppendWhereHintSegments = {},
  onListAppendWhereHintSegmentChange,
  listYearMonthFilterEnabled = false,
  listYearMonthFilterLabel = "Reporting period",
  listYearMonthFilterValue = "__all__",
  listYearMonthFilterAllowAll = true,
  listYearMonthFilterOptions = [],
  listYearMonthFilterPending = false,
  onListYearMonthFilterChange,
  listDateRangeFilterEnabled = false,
  listDateRangeFilterRows = [],
  onListDateRangeChange,
  listRelationFilterEnabled = false,
  listRelationFilterRows = [],
  onRelationFilterChange,
  onRelationMultiFilterChange,
  onClearAllListFilters,
  listFiltersClearDisabled = true,
  listFiltersDifferFromDefaults = false,
  onResetListFiltersToDefaults,
  loadErrorLabel,
  emptyLabel,
  pageSizeOptions,
  listLimit,
  onPageSizeChange,
  isLoading,
  isRefetching,
  onListRefresh,
  listCreateEnabled = false,
  onOpenCreateDialog,
  addNewLabel = "Add new",
  addNewDisabled = false,
  isError,
  errorMessage,
  totalCount,
  totalPages,
  displayPage,
  rowCount,
  listPayload,
  goToPage,
  goNextPage,
  goPrevPage,
  table,
  updateErrorMessage,
  deleteErrorMessage,
  listMobileCardFields = [],
  listMobileCardTitleColumnKey,
  listMobileCardGroups,
  listMobileCardHideTitleFieldLabel = false,
  listHideRowActions = false,
  onMobileCardOpenRow,
  titleRowOpensEditDialog = false,
  onRowClick,
  listCompactListCardDense = false,
  listFiltersToolbarDense = false,
  listHideDockAggregateFooter = false,
  listGrid,
  listCols = [],
  listLayoutMode = "table",
  onListLayoutModeChange,
  renderListGridItem,
  listTableQuickCompact = false,
  listTableColumnDividers = false,
  listStickyStartColumnKey,
  listStickyStartRowLinksWidthPx,
  listQuickDesktopCards = false,
  listRowHighlight,
  sideFilterBypass,
  listSideFiltersPanelCollapsible = false,
  sideFiltersPanelOpen = !listSideFiltersPanelCollapsible,
  setSideFiltersPanelOpen,
}: AdminEntityAdminListCardProps) {
  const {
    listAboveTable,
    isCompactList,
    compactListCardTight,
    listToolbarDenseDesktop,
    listViewportChrome,
    showListCardTitle,
    relationFilterRowsInline,
    relationFilterRowsSide,
    relationFilterRowsAll,
    inlineHintSpecs,
    sideHintSpecs,
    relationFiltersOnSide,
    listStatusFull,
    dockListAggregateFooter,
    summaryLines,
    showDesktopFilters,
    showMobileFilterBar,
    showMobileCards,
    showDesktopGrid,
    showQuickDesktopCards,
    mobileCardTitleKey,
  } = useAdminEntityAdminListCardDerivedState({
    slug,
    listPayload,
    isLoading,
    isRefetching,
    isError,
    totalCount,
    listDateRangeFilterRows,
    onListRefresh,
    listFiltersClearDisabled,
    listCompactListCardDense,
    listFiltersToolbarDense,
    listTitle,
    listShowListCardTitle,
    listShowListCardTitleOnCompact,
    listRelationFilterRows,
    listAppendWhereHintSpecs,
    listRelationFilterEnabled,
    listAppendWhereHintFilterEnabled,
    displayPage,
    totalPages,
    rowCount,
    listHideDockAggregateFooter,
    listSearchEnabled,
    listBooleanFilterEnabled,
    listYearMonthFilterEnabled,
    listDateRangeFilterEnabled,
    listSearchValue,
    listSearchPlaceholder,
    listBooleanFilterSegment,
    listBooleanFilterLabels,
    listBooleanFilterGroupLabel,
    listAppendWhereHintSegments,
    listYearMonthFilterLabel,
    listYearMonthFilterValue,
    listYearMonthFilterAllowAll,
    listYearMonthFilterOptions,
    listMobileCardFields,
    listMobileCardTitleColumnKey,
    listGrid,
    listLayoutMode,
    listQuickDesktopCards,
    sideFilterBypass,
  })

  return (
    <Card
      className={cn(
        "relative h-full min-h-0 min-w-0 overflow-hidden border-border/80 shadow-none",
        relationFiltersOnSide
          ? cn(
              "grid grid-rows-[auto_1fr] gap-0",
              listSideFiltersPanelCollapsible
                ? sideFiltersPanelOpen
                  ? "grid-cols-[1fr_calc(18rem+2.25rem)]"
                  : "grid-cols-[1fr_2.25rem]"
                : "grid-cols-[1fr_18rem]",
            )
          : cn(
              "flex flex-col",
              isCompactList &&
                (compactListCardTight
                  ? "gap-1 py-1.5"
                  : "gap-1.5 py-2"),
            ),
      )}
      data-testid={`admin-entity-list-card--${slug}`}
      aria-busy={isLoading}
    >
      {isRefetching ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden bg-muted/60"
          aria-hidden
          data-testid={`admin-entity-list-refetch-bar--${slug}`}
        >
          <div className="admin-entity-refetch-bar h-full w-1/3 max-w-40 bg-primary/50" />
        </div>
      ) : null}
      <AdminEntityAdminListCardHeader
        slug={slug}
        listTitle={listTitle}
        showListCardTitle={showListCardTitle}
        isCompactList={isCompactList}
        compactListCardTight={compactListCardTight}
        listToolbarDenseDesktop={listToolbarDenseDesktop}
        relationFiltersOnSide={relationFiltersOnSide}
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
        showDesktopFilters={showDesktopFilters}
        listSearchEnabled={listSearchEnabled}
        listSearchValue={listSearchValue}
        onListSearchChange={onListSearchChange}
        listSearchPlaceholder={listSearchPlaceholder}
        listSearchTrigger={listSearchTrigger}
        onListSearchSubmit={onListSearchSubmit}
        onListSearchClear={onListSearchClear}
        listBooleanFilterEnabled={listBooleanFilterEnabled}
        listBooleanFilterLayout={listBooleanFilterLayout}
        listBooleanFilterUiStyle={listBooleanFilterUiStyle}
        listBooleanFilterSegment={listBooleanFilterSegment}
        onListBooleanFilterChange={onListBooleanFilterChange}
        listBooleanFilterLabels={listBooleanFilterLabels}
        listBooleanFilterGroupLabel={listBooleanFilterGroupLabel}
        listAppendWhereHintFilterEnabled={listAppendWhereHintFilterEnabled}
        listAppendWhereHintSpecs={listAppendWhereHintSpecs}
        inlineHintSpecs={inlineHintSpecs}
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
        listRelationFilterEnabled={listRelationFilterEnabled}
        relationFilterRowsInline={relationFilterRowsInline}
        relationFilterRowsAll={relationFilterRowsAll}
        onRelationFilterChange={onRelationFilterChange}
        onRelationMultiFilterChange={onRelationMultiFilterChange}
        onClearAllListFilters={onClearAllListFilters}
        listFiltersClearDisabled={listFiltersClearDisabled}
        listFiltersToolbarDense={listFiltersToolbarDense}
        showMobileFilterBar={showMobileFilterBar}
        summaryLines={summaryLines}
        isError={isError}
        loadErrorLabel={loadErrorLabel}
        totalCount={totalCount}
        listStatusFull={listStatusFull}
      />
      <AdminEntityAdminListCardBody
        slug={slug}
        isCompactList={isCompactList}
        compactListCardTight={compactListCardTight}
        relationFiltersOnSide={relationFiltersOnSide}
        listSideFiltersPanelCollapsible={listSideFiltersPanelCollapsible}
        sideFiltersPanelOpen={sideFiltersPanelOpen}
        setSideFiltersPanelOpen={setSideFiltersPanelOpen}
        isError={isError}
        errorMessage={errorMessage}
        loadErrorLabel={loadErrorLabel}
        listAboveTable={listAboveTable}
        isLoading={isLoading}
        listLimit={listLimit}
        table={table}
        rowCount={rowCount}
        dockListAggregateFooter={dockListAggregateFooter}
        showMobileCards={showMobileCards}
        showQuickDesktopCards={showQuickDesktopCards}
        showDesktopGrid={showDesktopGrid}
        listMobileCardFields={listMobileCardFields}
        listMobileCardTitleColumnKey={listMobileCardTitleColumnKey}
        listMobileCardGroups={listMobileCardGroups}
        listMobileCardHideTitleFieldLabel={listMobileCardHideTitleFieldLabel}
        listHideRowActions={listHideRowActions}
        onMobileCardOpenRow={onMobileCardOpenRow}
        titleRowOpensEditDialog={titleRowOpensEditDialog}
        onRowClick={onRowClick}
        listCols={listCols}
        listGrid={listGrid}
        renderListGridItem={renderListGridItem}
        listTableQuickCompact={listTableQuickCompact}
        listTableColumnDividers={listTableColumnDividers}
        listStickyStartColumnKey={listStickyStartColumnKey}
        listStickyStartRowLinksWidthPx={listStickyStartRowLinksWidthPx}
        listRowHighlight={listRowHighlight}
        emptyLabel={emptyLabel}
        totalCount={totalCount}
        totalPages={totalPages}
        displayPage={displayPage}
        listPayload={listPayload}
        goToPage={goToPage}
        goNextPage={goNextPage}
        goPrevPage={goPrevPage}
        updateErrorMessage={updateErrorMessage}
        deleteErrorMessage={deleteErrorMessage}
        relationFilterRowsSide={relationFilterRowsSide}
        sideFilterBypass={sideFilterBypass}
        sideHintSpecs={sideHintSpecs}
        listAppendWhereHintSegments={listAppendWhereHintSegments}
        onListAppendWhereHintSegmentChange={onListAppendWhereHintSegmentChange}
        onRelationFilterChange={onRelationFilterChange}
        onRelationMultiFilterChange={onRelationMultiFilterChange}
        listSearchEnabled={listSearchEnabled}
        listSearchValue={listSearchValue}
        onListSearchChange={onListSearchChange}
        listSearchTrigger={listSearchTrigger}
        onListSearchSubmit={onListSearchSubmit}
        onListSearchClear={onListSearchClear}
        listSearchPlaceholder={listSearchPlaceholder}
        listBooleanFilterLayout={listBooleanFilterLayout}
        listBooleanFilterEnabled={listBooleanFilterEnabled}
        listBooleanFilterLabels={listBooleanFilterLabels}
        listBooleanFilterGroupLabel={listBooleanFilterGroupLabel}
        listBooleanFilterUiStyle={listBooleanFilterUiStyle}
        listBooleanFilterSegment={listBooleanFilterSegment}
        onListBooleanFilterChange={onListBooleanFilterChange}
        onClearAllListFilters={onClearAllListFilters}
        listFiltersClearDisabled={listFiltersClearDisabled}
        listFiltersDifferFromDefaults={listFiltersDifferFromDefaults}
        onResetListFiltersToDefaults={onResetListFiltersToDefaults}
        mobileCardTitleKey={mobileCardTitleKey}
      />
    </Card>
  )
}
