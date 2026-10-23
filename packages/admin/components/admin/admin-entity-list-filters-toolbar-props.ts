import type { AdminEntityListRelationFilterRow } from "./admin-entity-list-relation-filter-row"
import type { AdminEntityListAppendWhereHintFilter } from "../../admin-entity-types"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type { ListBooleanFilterSegment } from "../../admin-entity-list-filter-summary"

export type AdminEntityListFiltersToolbarProps = {
  slug: AdminEntitySlug
  className?: string
  listSearchEnabled?: boolean
  listSearchValue?: string
  onListSearchChange?: (value: string) => void
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
  listAppendWhereHintFilterEnabled?: boolean
  listAppendWhereHintSpecs?: readonly AdminEntityListAppendWhereHintFilter[]
  listAppendWhereHintSegments?: Record<string, string>
  onListAppendWhereHintSegmentChange?: (
    queryParam: string,
    value: string,
  ) => void
  listYearMonthFilterEnabled?: boolean
  listYearMonthFilterLabel?: string
  listYearMonthFilterValue?: string
  listYearMonthFilterAllowAll?: boolean
  listYearMonthFilterOptions?: { value: string; label: string }[]
  listYearMonthFilterPending?: boolean
  onListYearMonthFilterChange?: (value: string) => void
  listDateRangeFilterEnabled?: boolean
  listDateRangeFilterRows?: readonly {
    columnKey: string
    label: string
    from: string
    to: string
  }[]
  onListDateRangeChange?: (columnKey: string, from: string, to: string) => void
  listRelationFilterEnabled?: boolean
  /** Inline and (in mobile dialog) side relation filters — caller merges rows as needed. */
  relationFilterRows?: AdminEntityListRelationFilterRow[]
  onRelationFilterChange?: (columnKey: string, value: string) => void
  onRelationMultiFilterChange?: (columnKey: string, values: string[]) => void
  onClearAllListFilters?: () => void
  listFiltersClearDisabled?: boolean
  isLoading?: boolean
  /** Full-width controls (mobile filter dialog). */
  compactVertical?: boolean
  /** Tighter desktop toolbar (gaps, labels, control heights). Ignored when `compactVertical` is true. */
  listFiltersToolbarDense?: boolean
  /** When true, omit the Clear control (e.g. rendered in the mobile dialog footer). */
  suppressClearButton?: boolean
}

/** List filter body: toolbar props (minus layout-only / outer wrapper) + resolved `dense` layout. */
export type AdminEntityListFiltersToolbarItemsProps = Omit<
  AdminEntityListFiltersToolbarProps,
  "className" | "listFiltersToolbarDense"
> & {
  denseDesktop: boolean
  labelClass: string
  fieldWrap: string
}
