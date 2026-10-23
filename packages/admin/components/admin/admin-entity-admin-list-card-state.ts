import { useMemo } from "react"

import { buildAdminEntityListFilterSummaryLines } from "../../admin-entity-list-filter-summary"
import { useCompactAdminListViewport } from "@repo/ui/use-compact-admin-list-viewport"
import { useOptionalAdminListViewportChrome } from "../../admin-list-viewport-chrome-context"
import { partitionAdminEntityRelationFilterRowsByUiLayout } from "../../admin-entity-relation-filter-rows-layout"
import { useAdminClientRegistry } from "../../admin-client-registry-context"
import type { AdminEntityAdminListCardProps } from "./admin-entity-admin-list-card-props"

type AdminEntityAdminListCardStateInput = Pick<
  AdminEntityAdminListCardProps,
  | "slug"
  | "listPayload"
  | "isLoading"
  | "isRefetching"
  | "isError"
  | "totalCount"
  | "listDateRangeFilterRows"
  | "onListRefresh"
  | "listFiltersClearDisabled"
  | "listCompactListCardDense"
  | "listFiltersToolbarDense"
  | "listTitle"
  | "listShowListCardTitle"
  | "listShowListCardTitleOnCompact"
  | "listRelationFilterRows"
  | "listAppendWhereHintSpecs"
  | "listRelationFilterEnabled"
  | "listAppendWhereHintFilterEnabled"
  | "displayPage"
  | "totalPages"
  | "rowCount"
  | "listHideDockAggregateFooter"
  | "listSearchEnabled"
  | "listBooleanFilterEnabled"
  | "listYearMonthFilterEnabled"
  | "listDateRangeFilterEnabled"
  | "listSearchValue"
  | "listSearchPlaceholder"
  | "listBooleanFilterSegment"
  | "listBooleanFilterLabels"
  | "listBooleanFilterGroupLabel"
  | "listAppendWhereHintSegments"
  | "listYearMonthFilterLabel"
  | "listYearMonthFilterValue"
  | "listYearMonthFilterAllowAll"
  | "listYearMonthFilterOptions"
  | "listMobileCardFields"
  | "listMobileCardTitleColumnKey"
  | "listGrid"
  | "listLayoutMode"
  | "listQuickDesktopCards"
  | "sideFilterBypass"
>

export function useAdminEntityAdminListCardDerivedState({
  slug,
  listPayload,
  isLoading,
  isRefetching,
  isError,
  totalCount,
  listDateRangeFilterRows = [],
  onListRefresh,
  listFiltersClearDisabled = true,
  listCompactListCardDense = false,
  listFiltersToolbarDense = false,
  listTitle,
  listShowListCardTitle = false,
  listShowListCardTitleOnCompact = false,
  listRelationFilterRows = [],
  listAppendWhereHintSpecs = [],
  listRelationFilterEnabled = false,
  listAppendWhereHintFilterEnabled = false,
  displayPage,
  totalPages,
  rowCount,
  listHideDockAggregateFooter = false,
  listSearchEnabled = false,
  listBooleanFilterEnabled = false,
  listYearMonthFilterEnabled = false,
  listDateRangeFilterEnabled = false,
  listSearchValue = "",
  listSearchPlaceholder = "Search",
  listBooleanFilterSegment = "all",
  listBooleanFilterLabels,
  listBooleanFilterGroupLabel = "Filter",
  listAppendWhereHintSegments = {},
  listYearMonthFilterLabel = "Reporting period",
  listYearMonthFilterValue = "__all__",
  listYearMonthFilterAllowAll = true,
  listYearMonthFilterOptions = [],
  listMobileCardFields = [],
  listMobileCardTitleColumnKey,
  listGrid,
  listLayoutMode = "table",
  listQuickDesktopCards = false,
  sideFilterBypass,
}: AdminEntityAdminListCardStateInput) {
  const { renderAdminEntityListAboveTable, adminUiMutationsDisabled } =
    useAdminClientRegistry()
  const listAboveTable =
    renderAdminEntityListAboveTable?.({
      slug,
      listPayload,
      isLoading,
      isRefetching,
      isError,
      totalCount,
      listDateRangeFilterRows,
      onListRefetch: onListRefresh,
      adminUiMutationsDisabled,
      hasActiveListFilters: !listFiltersClearDisabled,
    }) ?? null
  const isCompactList = useCompactAdminListViewport()
  const compactListCardTight = isCompactList && listCompactListCardDense === true
  const listToolbarDenseDesktop = !isCompactList && listFiltersToolbarDense === true
  const listViewportChrome = useOptionalAdminListViewportChrome()
  const showListCardTitle =
    listTitle.trim() !== "" &&
    ((!isCompactList && listShowListCardTitle === true) ||
      (isCompactList && listShowListCardTitleOnCompact === true))
  const { inlineRows: relationFilterRowsInline, sideRows: relationFilterRowsSide } =
    partitionAdminEntityRelationFilterRowsByUiLayout(listRelationFilterRows)
  const relationFilterRowsAll = [...relationFilterRowsInline, ...relationFilterRowsSide]
  const inlineHintSpecs = listAppendWhereHintSpecs.filter(
    (s) => s.uiLayout !== "side" && s.hidden !== true,
  )
  const sideHintSpecs = listAppendWhereHintSpecs.filter(
    (s) => s.uiLayout === "side" && s.hidden !== true,
  )
  const relationFiltersOnSide =
    !isCompactList &&
    ((listRelationFilterEnabled && relationFilterRowsSide.length > 0) ||
      (listAppendWhereHintFilterEnabled && sideHintSpecs.length > 0))

  const listStatusFull = `Page ${displayPage} of ${totalPages} · ${rowCount} on this page · ${totalCount} total`

  const dockListAggregateFooter =
    listHideDockAggregateFooter !== true &&
    totalCount > 0 &&
    listPayload?.listAggregateSums != null &&
    Object.keys(listPayload.listAggregateSums).length > 0

  const hasListFilters =
    listSearchEnabled ||
    listBooleanFilterEnabled ||
    listAppendWhereHintFilterEnabled ||
    listYearMonthFilterEnabled ||
    listDateRangeFilterEnabled ||
    listRelationFilterEnabled

  // Mirror the server-side filter bypass in the (mobile) filter summary too, so a bypassed
  // favourites/Status reads as off there just like the side panel — display-only, never the real value.
  const summaryBooleanFilterSegment =
    sideFilterBypass?.bypassBooleanFilter ? "all" : listBooleanFilterSegment
  const summaryRelationFilterRows =
    sideFilterBypass && sideFilterBypass.bypassedRelationColumnKeys.size > 0
      ? relationFilterRowsAll.map((row) =>
          sideFilterBypass.bypassedRelationColumnKeys.has(row.columnKey)
            ? { ...row, value: "", selectedValues: [] }
            : row,
        )
      : relationFilterRowsAll

  const summaryLines = useMemo(
    () =>
      buildAdminEntityListFilterSummaryLines({
        listSearchEnabled,
        listSearchValue,
        listSearchPlaceholder,
        listBooleanFilterEnabled,
        listBooleanFilterSegment: summaryBooleanFilterSegment,
        listBooleanFilterLabels,
        listBooleanFilterGroupLabel,
        listAppendWhereHintFilterEnabled,
        listAppendWhereHintSpecs,
        listAppendWhereHintSegments,
        listYearMonthFilterEnabled,
        listYearMonthFilterLabel,
        listYearMonthFilterValue,
        listYearMonthFilterAllowAll,
        listYearMonthFilterOptions,
        listDateRangeFilterEnabled,
        listDateRangeFilterRows,
        listRelationFilterRows: summaryRelationFilterRows,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      listSearchEnabled,
      listSearchValue,
      listSearchPlaceholder,
      listBooleanFilterEnabled,
      summaryBooleanFilterSegment,
      listBooleanFilterLabels,
      listBooleanFilterGroupLabel,
      listAppendWhereHintFilterEnabled,
      listAppendWhereHintSpecs,
      listAppendWhereHintSegments,
      listYearMonthFilterEnabled,
      listYearMonthFilterLabel,
      listYearMonthFilterValue,
      listYearMonthFilterAllowAll,
      listYearMonthFilterOptions,
      listDateRangeFilterEnabled,
      listDateRangeFilterRows,
      listRelationFilterRows,
    ],
  )

  const showDesktopFilters = hasListFilters && !isCompactList
  const showMobileFilterBar = hasListFilters && isCompactList
  const showMobileCards =
    isCompactList && listMobileCardFields.length > 0 && !dockListAggregateFooter
  const showDesktopGrid =
    !showMobileCards &&
    !listQuickDesktopCards &&
    listGrid != null &&
    listLayoutMode === "grid"
  const showQuickDesktopCards = listQuickDesktopCards === true && !showMobileCards
  const mobileCardTitleKey =
    listMobileCardTitleColumnKey ?? listMobileCardFields[0]?.columnKey ?? ""

  return {
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
    hasListFilters,
    summaryLines,
    showDesktopFilters,
    showMobileFilterBar,
    showMobileCards,
    showDesktopGrid,
    showQuickDesktopCards,
    mobileCardTitleKey,
  }
}
