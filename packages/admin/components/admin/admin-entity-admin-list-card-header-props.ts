import type { AdminEntityListRelationFilterRow } from "./admin-entity-list-relation-filter-row"
import type { AdminEntityListAppendWhereHintFilter, AdminEntityListGridSpec } from "../../admin-entity-types"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type { AdminEntityListFilterSummaryLine } from "../../admin-entity-list-filter-summary"
import type { AdminListViewportChromeValue } from "../../admin-list-viewport-chrome-context"

type ListBooleanFilterSegment = "all" | "true" | "false"

export type AdminEntityAdminListCardHeaderProps = {
  slug: AdminEntitySlug
  listTitle: string
  showListCardTitle: boolean
  isCompactList: boolean
  compactListCardTight: boolean
  listToolbarDenseDesktop: boolean
  relationFiltersOnSide: boolean
  listCreateEnabled: boolean
  onOpenCreateDialog?: () => void
  addNewLabel: string
  addNewDisabled: boolean
  isLoading: boolean
  isRefetching: boolean
  listViewportChrome: AdminListViewportChromeValue | null
  listGrid?: AdminEntityListGridSpec
  listLayoutMode: "table" | "grid"
  onListLayoutModeChange?: (mode: "table" | "grid") => void
  onListRefresh: () => void
  pageSizeOptions: readonly number[]
  listLimit: number
  onPageSizeChange: (raw: string) => void
  showDesktopFilters: boolean
  listSearchEnabled?: boolean
  listSearchValue?: string
  onListSearchChange?: (value: string) => void
  listSearchPlaceholder?: string
  listSearchTrigger?: "debounce" | "submit"
  onListSearchSubmit?: (value?: string) => void
  onListSearchClear?: () => void
  listBooleanFilterEnabled?: boolean
  listBooleanFilterLayout?: "inline" | "side"
  listBooleanFilterUiStyle?: "switch"
  listBooleanFilterSegment?: ListBooleanFilterSegment
  onListBooleanFilterChange?: (value: ListBooleanFilterSegment) => void
  listBooleanFilterLabels?: { all: string; true: string; false: string }
  listBooleanFilterGroupLabel?: string
  listAppendWhereHintFilterEnabled?: boolean
  listAppendWhereHintSpecs?: readonly AdminEntityListAppendWhereHintFilter[]
  inlineHintSpecs: readonly AdminEntityListAppendWhereHintFilter[]
  listAppendWhereHintSegments?: Record<string, string>
  onListAppendWhereHintSegmentChange?: (queryParam: string, value: string) => void
  listYearMonthFilterEnabled?: boolean
  listYearMonthFilterLabel?: string
  listYearMonthFilterValue?: string
  listYearMonthFilterAllowAll?: boolean
  listYearMonthFilterOptions?: { value: string; label: string }[]
  listYearMonthFilterPending?: boolean
  onListYearMonthFilterChange?: (value: string) => void
  listDateRangeFilterEnabled?: boolean
  listDateRangeFilterRows?: readonly { columnKey: string; label: string; from: string; to: string }[]
  onListDateRangeChange?: (columnKey: string, from: string, to: string) => void
  listRelationFilterEnabled?: boolean
  relationFilterRowsInline: AdminEntityListRelationFilterRow[]
  relationFilterRowsAll: AdminEntityListRelationFilterRow[]
  onRelationFilterChange?: (columnKey: string, value: string) => void
  onRelationMultiFilterChange?: (columnKey: string, values: string[]) => void
  onClearAllListFilters?: () => void
  listFiltersClearDisabled?: boolean
  listFiltersToolbarDense?: boolean
  showMobileFilterBar: boolean
  summaryLines: readonly AdminEntityListFilterSummaryLine[]
  isError: boolean
  loadErrorLabel: string
  totalCount: number
  listStatusFull: string
}
