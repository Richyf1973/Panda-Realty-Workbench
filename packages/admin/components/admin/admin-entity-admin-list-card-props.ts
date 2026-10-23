import type { Dispatch, SetStateAction } from "react"
import type { Table as TanStackTable } from "@tanstack/react-table"

import type {
  AdminEntityListMobileCardField,
  AdminEntityListMobileCardResolvedGroup,
} from "../../admin-entity-list-mobile-card-fields"
import type { AdminEntityListRelationFilterRow } from "./admin-entity-list-relation-filter-row"
import type { AdminEntityTableRow } from "../../admin-entity-admin-types"
import type { AdminEntityListResponse } from "../../admin-entity-list-api"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type {
  AdminEntityColumn,
  AdminEntityListAppendWhereHintFilter,
  AdminEntityListGridSpec,
  AdminEntityListRowHighlight,
} from "../../admin-entity-types"
import type { AdminRenderAdminEntityListGridItem } from "../../admin-client-registry-context"

export type ListBooleanFilterSegment = "all" | "true" | "false"

export type AdminEntityAdminListCardProps = {
  slug: AdminEntitySlug
  listTitle: string
  /** When true, list card title is shown on non-compact viewports (default: hidden). */
  listShowListCardTitle?: boolean
  /** When true, list card title stays visible on compact viewports (default: hidden). */
  listShowListCardTitleOnCompact?: boolean
  /** Tighter list card vertical padding on compact (from entity `listCompactListCardDense`). */
  listCompactListCardDense?: boolean
  /** Dense desktop filter toolbar + list status (from entity `listFiltersToolbarDense`). */
  listFiltersToolbarDense?: boolean
  /** When true, shows search field wired to list API `search` query param. */
  listSearchEnabled?: boolean
  listSearchValue?: string
  onListSearchChange?: (value: string) => void
  listSearchTrigger?: "debounce" | "submit"
  onListSearchSubmit?: (value?: string) => void
  onListSearchClear?: () => void
  listSearchPlaceholder?: string
  listBooleanFilterEnabled?: boolean
  listBooleanFilterSegment?: ListBooleanFilterSegment
  onListBooleanFilterChange?: (value: ListBooleanFilterSegment) => void
  listBooleanFilterLabels?: {
    all: string
    true: string
    false: string
  }
  listBooleanFilterGroupLabel?: string
  /** When `"side"`, the boolean filter renders in the side panel instead of the toolbar. */
  listBooleanFilterLayout?: "inline" | "side"
  /** When `"switch"`, the side-panel boolean filter renders as a Switch instead of a 3-segment button group. */
  listBooleanFilterUiStyle?: "switch"
  listAppendWhereHintFilterEnabled?: boolean
  /** Toolbar groups (same order as entity `listAppendWhereHintFilters` / single `listAppendWhereHintFilter`). */
  listAppendWhereHintSpecs?: readonly AdminEntityListAppendWhereHintFilter[]
  /** Keys are each spec's `queryParam`; values are active option or `""` for "all". */
  listAppendWhereHintSegments?: Record<string, string>
  onListAppendWhereHintSegmentChange?: (
    queryParam: string,
    value: string,
  ) => void
  listYearMonthFilterEnabled?: boolean
  listYearMonthFilterLabel?: string
  /** Radix Select: use `__all__` in `onListYearMonthFilterChange` for "all periods". */
  listYearMonthFilterValue?: string
  /** When false, omits the "All periods" option (required reporting period). */
  listYearMonthFilterAllowAll?: boolean
  listYearMonthFilterOptions?: { value: string; label: string }[]
  listYearMonthFilterPending?: boolean
  onListYearMonthFilterChange?: (value: string) => void
  listDateRangeFilterEnabled?: boolean
  /** One row per `listDateRangeFilter(s)` spec (label + current from/to). */
  listDateRangeFilterRows?: readonly {
    columnKey: string
    label: string
    from: string
    to: string
  }[]
  onListDateRangeChange?: (columnKey: string, from: string, to: string) => void
  listRelationFilterEnabled?: boolean
  /** Each row includes `uiLayout` from the entity filter spec (`inline` vs `side`). */
  listRelationFilterRows?: AdminEntityListRelationFilterRow[]
  onRelationFilterChange?: (columnKey: string, value: string) => void
  onRelationMultiFilterChange?: (columnKey: string, values: string[]) => void
  /** Clears search, boolean segment, and relation list filters; resets to page 1. */
  onClearAllListFilters?: () => void
  /** When true, the clear-filters control is disabled (no active filters or loading). */
  listFiltersClearDisabled?: boolean
  /** True when the current filters differ from the entity defaults (boolean segment vs its default). */
  listFiltersDifferFromDefaults?: boolean
  /** Resets all list filters to the entity defaults (boolean segment → its default, not "all"). */
  onResetListFiltersToDefaults?: () => void
  loadErrorLabel: string
  emptyLabel: string
  pageSizeOptions: readonly number[]
  listLimit: number
  onPageSizeChange: (raw: string) => void
  isLoading: boolean
  /** Background refetch while existing list data stays visible. */
  isRefetching: boolean
  onListRefresh: () => void
  /** When set with `onOpenCreateDialog`, shows an "add" control in the list toolbar. */
  listCreateEnabled?: boolean
  onOpenCreateDialog?: () => void
  addNewLabel?: string
  addNewDisabled?: boolean
  isError: boolean
  errorMessage?: string
  totalCount: number
  totalPages: number
  displayPage: number
  rowCount: number
  listPayload: AdminEntityListResponse | undefined
  goToPage: (page: number) => void
  goNextPage: () => void
  goPrevPage: () => void
  table: TanStackTable<AdminEntityTableRow>
  updateErrorMessage?: string
  deleteErrorMessage?: string
  /** Mobile card layout (see {@link AdminEntityDefinition.listMobileCard}). */
  listMobileCardFields?: readonly AdminEntityListMobileCardField[]
  listMobileCardTitleColumnKey?: string
  listMobileCardGroups?: readonly AdminEntityListMobileCardResolvedGroup[]
  /** Mobile card: show title value without the uppercase field label above it. */
  listMobileCardHideTitleFieldLabel?: boolean
  listHideRowActions?: boolean
  /** Mobile cards: title + Open open the edit dialog (see entity `listMobileCard.titleRowOpensEditDialog`). */
  onMobileCardOpenRow?: (row: AdminEntityTableRow) => void
  titleRowOpensEditDialog?: boolean
  /** Desktop table: clicking any row opens the edit dialog (see entity `listRowClickOpensEditDialog`). */
  onRowClick?: (row: AdminEntityTableRow) => void
  /** When true with {@link AdminEntityDefinition.listAggregateSumColumnKeys}, omit docked table footer sums. */
  listHideDockAggregateFooter?: boolean
  /** Desktop grid layout (see entity `listGrid`). */
  listGrid?: AdminEntityListGridSpec
  /** List column defs for grid preview labels / default stacked fields */
  listCols?: readonly AdminEntityColumn[]
  listLayoutMode?: "table" | "grid"
  onListLayoutModeChange?: (mode: "table" | "grid") => void
  renderListGridItem?: AdminRenderAdminEntityListGridItem
  /** Desktop table: tighter cell padding (e.g. Panda properties quick table). */
  listTableQuickCompact?: boolean
  /** Desktop table: subtle right border on each column to aid readability in wide tables. */
  listTableColumnDividers?: boolean
  /** Desktop table: freeze leading columns up to and including this key (see entity `listStickyStartColumnKey`). */
  listStickyStartColumnKey?: string
  /** Desktop table: fixed px width of the leading row-links column when frozen. */
  listStickyStartRowLinksWidthPx?: number
  /** Panda Properties: desktop quick mode renders stacked cards instead of the compact table. */
  listQuickDesktopCards?: boolean
  /** Opt-in whole-row highlight: apply `className` when the row's boolean `field` is truthy. */
  listRowHighlight?: AdminEntityListRowHighlight
  /**
   * Display-only mirror of the server-side append-where filter bypass (see
   * {@link AdminEntityDefinition.listFiltersBypassedByAppendWhereHint}). When active, the side
   * panel renders the affected boolean filter / relation filters in their off position so the UI
   * matches the bypassed query, without mutating the underlying segment/relation values.
   */
  sideFilterBypass?: {
    bypassBooleanFilter: boolean
    bypassedRelationColumnKeys: ReadonlySet<string>
  }
  /** When true, the side filter panel starts collapsed; a chevron strip at the border toggles it. */
  listSideFiltersPanelCollapsible?: boolean
  /**
   * Side-panel open state, owned above the hidden-rows provider so it survives the list-card
   * remount that fires on every filter/search change. Required when the panel is collapsible.
   */
  sideFiltersPanelOpen?: boolean
  setSideFiltersPanelOpen?: Dispatch<SetStateAction<boolean>>
}
