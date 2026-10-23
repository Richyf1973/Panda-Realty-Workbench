/**
 * Placement of one relation list filter in the admin list card.
 * `side` — panel to the right of the table with a searchable list; single-select uses a radio group,
 * multi-select uses checkboxes (same semantics as inline comboboxes).
 */
export type AdminEntityListRelationFilterLayout = "inline" | "side"

/**
 * List GET: equality filter on an FK column that uses `listRelation`.
 * Query param defaults to `columnKey`; value is the related row id (integer, uuid string, or text/citext code).
 * Omit or empty → no filter. Options for the admin select come from the related entity list API.
 */
export type AdminEntityListRelationFilterSpec = {
  readonly columnKey: string
  readonly queryParam?: string
  /**
   * `select` (default) — prefetch a capped page of related rows into Select / side-panel radios.
   * `asyncSearch` — typeahead: each keystroke (debounced) calls the related list API with `search`.
   * Ignored when `multiSelect` is true (multi filters keep the select UI).
   */
  readonly uiVariant?: "select" | "asyncSearch"
  /**
   * Related list `limit` for `asyncSearch` requests. Clamped to the admin list max on the client.
   * Default 50.
   */
  readonly asyncSearchFetchLimit?: number
  /**
   * Optional helper copy for async search filters (always shown when non-empty).
   */
  readonly asyncSearchMatchesHint?: string
  /**
   * When **`true`**, show the helper line under the filter label (derived from the related entity's
   * `listSearch` column labels, or a generic line when none). Omit or **`false`** — no line unless
   * {@link asyncSearchMatchesHint} is set.
   */
  readonly asyncSearchShowMatchesHint?: boolean
  /**
   * Async search popover: when **`true`**, show the "type to query the server…" empty state.
   * Omit or **`false`** — no empty-state hint (default).
   */
  readonly asyncSearchShowEmptyQueryHint?: boolean
  /**
   * When true, the query param may repeat (e.g. `cardTypeId=1&cardTypeId=2`) or be comma-separated;
   * rows match if the FK equals any selected id (OR).
   */
  readonly multiSelect?: boolean
  /**
   * When true (parent entity must define `listYearMonthFilter`), relation filter options are loaded
   * with the active reporting period so the related list API can scope rows (see
   * `listScopeByReportingPeriodInRelated` on the related entity).
   */
  readonly optionListScopedByParentYearMonth?: boolean
  /**
   * Where this filter appears in the list card. Omit or `inline` — header toolbar.
   * `side` — right-hand panel (searchable radio / checkbox list).
   */
  readonly uiLayout?: AdminEntityListRelationFilterLayout
  /**
   * When true, parse this filter from the list URL into `relationFilterValues[columnKey]` as **text**
   * without requiring a physical `columns[].listRelation`. Apps implement SQL via
   * `AdminEntityListServerContext.appendListWhere`.
   */
  readonly syntheticTextScope?: boolean
  /**
   * When true, omit this filter from the admin list toolbar / side panel (still parsed from URL and
   * sent on list GET for scoped relation fetches / `appendListWhere`).
   */
  readonly hiddenFromListToolbar?: boolean
  /**
   * localStorage keys for per-option favorites and hide persistence (multiSelect + side panel only).
   * When set, the filter panel renders star / eye buttons on each option row and persists state
   * across page reloads. Omit on all other filter rows.
   */
  readonly persistenceKeys?: {
    readonly favorites: string
    readonly hidden: string
  }
}

/**
 * List GET: filter rows that have a matching junction row (e.g. card has tag X).
 * `manyRelationColumnKey` must reference a column with `listManyRelation`.
 * Query param defaults to `manyRelationColumnKey`; value is the related row id (integer or uuid).
 */
export type AdminEntityListManyRelationFilterSpec = {
  readonly manyRelationColumnKey: string
  readonly queryParam?: string
  /**
   * When true, multiple related ids may be selected; rows match if the junction links to any of them (OR).
   */
  readonly multiSelect?: boolean
  /**
   * Where this filter appears. Omit or `inline` — header. `side` — right-hand panel next to the table.
   */
  readonly uiLayout?: AdminEntityListRelationFilterLayout
}

/**
 * List toolbar segment filter whose query param is forwarded to list GET and passed into
 * {@link AdminEntityListServerContext.appendListWhere} as `appendListWhereHints`. Empty / "all"
 * omits the param; each `options[].value` must be non-empty.
 */
export type AdminEntityListAppendWhereHintFilter = {
  readonly queryParam: string
  readonly groupLabel: string
  readonly allLabel: string
  readonly options: readonly { readonly value: string; readonly label: string }[]
  /**
   * Where this filter renders. Omit / `"inline"` → toolbar (existing behaviour).
   * `"side"` → right-hand sidebar panel (desktop only; falls back to mobile filter dialog on compact).
   */
  readonly uiLayout?: AdminEntityListRelationFilterLayout
  /**
   * When set, the sidebar panel fetches options from this absolute URL path at runtime
   * instead of using the static `options` array.
   * Response shape: `{ options: { value: string; label: string }[] }`.
   */
  readonly fetchOptionsPath?: string
  /**
   * When set, the sidebar panel shows a sync icon button that POSTs to this path.
   * After a successful sync, the options query for `fetchOptionsPath` is invalidated.
   */
  readonly syncPath?: string
  /**
   * Additional React Query keys to invalidate after a successful sync (besides the
   * hint-filter-options key). Use when the sync also populates a related admin
   * entity list (e.g. syncing suburbs should refresh the suburbs grid too).
   */
  readonly syncInvalidatesQueryKeys?: readonly (readonly string[])[]
  /**
   * Visual style for the options list.
   * "vertical-radio" (default) - scrollable vertical radio list (side panel only).
   * "horizontal-chips" - compact horizontal pill buttons (best for short numeric sets).
   * "combobox" - shadcn Popover + Command; trigger button opens a searchable dropdown with all options pre-loaded.
   * "numeric-range" - two number inputs (min / max); value encoded as "${min}|${max}" (either part may be empty for unbounded).
   * "date-range" - two date inputs (from / to); value encoded as "${YYYY-MM-DD}|${YYYY-MM-DD}" (either part may be empty for unbounded).
   * "segment-button" - horizontal ButtonGroup rendered inline in the toolbar (like the boolean filter); best for ≤4 options.
   */
  readonly uiStyle?: "vertical-radio" | "horizontal-chips" | "combobox" | "numeric-range" | "date-range" | "segment-button"
  /**
   * Render position in the side panel. Omit / `"normal"` → after relation filters (default).
   * `"top"` → immediately after the search input, before boolean and relation filters.
   */
  readonly uiPosition?: "top" | "normal"
  /**
   * Optional group name for collapsible sections in the sidebar panel.
   * All filters sharing the same `collapseGroup` value are rendered together inside a
   * toggleable section labelled with that value. The section starts collapsed unless
   * any filter in the group has an active value.
   */
  readonly collapseGroup?: string
  /**
   * When `true`, multiple options can be selected simultaneously (horizontal-chips only).
   * The value is stored as a comma-separated string of selected option values; empty = "Any" (all).
   */
  readonly multiSelect?: boolean
  /**
   * When set, the combobox trigger formats the raw value into a human-readable label
   * when no matching option is found (e.g. externally-set values).
   * `"first-segment"` — splits the value by `,`, takes the first `~`-delimited part of each
   * entry, and joins with `", "`. Suitable for `street~state,...` encoded street filters.
   */
  readonly currentValueDisplay?: "first-segment"
  /**
   * When `true`, this filter is not rendered in the sidebar panel.
   * Use for programmatically-controlled filters whose value is written directly
   * to the URL by a custom component (e.g. a search bar) rather than via the
   * sidebar UI.
   */
  readonly hidden?: boolean
}
