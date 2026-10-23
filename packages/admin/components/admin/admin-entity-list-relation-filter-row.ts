import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type { AdminEntityListRelationFilterLayout } from "../../admin-entity-types"

/** Props row for FK / M2M relation filters on the admin list card. */
export type AdminEntityListRelationFilterRow = {
  columnKey: string
  columnLabel: string
  /** Toolbar vs right-hand panel; comes from each filter spec (`uiLayout`). */
  uiLayout: AdminEntityListRelationFilterLayout
  /**
   * `asyncSearch` uses server-backed typeahead instead of a capped Select.
   * When `multiSelect` is true, this is always `select`.
   */
  uiVariant: "select" | "asyncSearch"
  /** When `uiVariant` is `asyncSearch`. */
  asyncSearchFetchLimit?: number
  asyncSearchMatchesHint?: string
  asyncSearchShowMatchesHint?: boolean
  /** When true, show empty-search hint in async popover/side layout. */
  asyncSearchShowEmptyQueryHint?: boolean
  relatedSlug?: AdminEntitySlug
  relatedListLabelColumnKeys?: readonly string[]
  /** When true, use multi-select combobox (OR semantics). */
  multiSelect: boolean
  /** Canonical stored selection (single id or comma-separated sorted ids). */
  value: string
  /** Parsed ids for multi UI; length 0 or 1 when `multiSelect` is false. */
  selectedValues: string[]
  options: { value: string; label: string }[]
  optionsPending: boolean
  /** localStorage keys for per-option favorites/hide; present only when the entity spec sets them. */
  persistenceKeys?: { favorites: string; hidden: string }
}
