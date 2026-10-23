import type { SQL } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import type { PgTable } from "drizzle-orm/pg-core"

import type { AdminEntityCrudDialogHeightPreset } from "./admin-entity-crud-dialog-height-presets"
import type { AdminEntityCrudDialogWidthPreset } from "./admin-entity-crud-dialog-width-presets"
import type { AdminEntityPageWidthPreset } from "./admin-entity-page-width-presets"
import type { AdminRelationFilterApiValue } from "./admin-entity-relation-filter-value"
import type {
  AdminEntityListRelationFilterLayout,
  AdminEntityListRelationFilterSpec,
  AdminEntityListManyRelationFilterSpec,
  AdminEntityListAppendWhereHintFilter,
} from "./admin-entity-filter-types"
import type {
  AdminEntityListMobileCardGroupLayout,
  AdminEntityListMobileCardGroupSpec,
  AdminEntityListGridSpec,
  AdminEntityListMobileCardSpec,
} from "./admin-entity-mobile-card-types"
import type {
  AdminValueType,
  AdminCellAlign,
  AdminEntityColumn,
} from "./admin-entity-column-types"

export type {
  AdminValueType,
  AdminCellAlign,
  AdminEntityColumnFormControl,
  AdminEntityColumnListRelation,
  AdminEntityColumnListManyRelation,
  AdminEntityColumnManyRelationForm,
  AdminEntityColumnListChildSumSimple,
  AdminEntityColumnListChildSumIntegerTimesPayrollAllowance,
  AdminEntityColumnListChildSumIntegerTimesPayrollPeriodNumeric,
  AdminEntityColumnListChildSumWithJoinFilter,
  AdminEntityColumnListChildSumProductOfTwoColumns,
  AdminEntityColumnListChildSum,
  AdminEntityColumn,
} from "./admin-entity-column-types"
export {
  adminEntityListChildSumIsProductOfTwoColumns,
  adminEntityListChildSumIsIntegerTimesPayrollAllowance,
  adminEntityListChildSumIsIntegerTimesPayrollPeriodNumeric,
  adminEntityListChildSumIsWithJoinFilter,
} from "./admin-entity-column-types"

/** Create/edit dialog: tighter fields and controls when set to **`compact`**. */
export type AdminEntityCrudDialogFormDensityPreset = "default" | "compact"

/**
 * Declares a visual group of form fields in the admin CRUD dialog.
 * Fields listed are removed from the main grid and rendered in a labelled section
 * (`"sections"` mode) or Radix tab panel (`"tabs"` mode).
 */
export type AdminEntityCrudFormGroup = {
  /** Unique key; used as Radix tab value when `crudFormGroupsMode` is `"tabs"`. */
  readonly key: string
  /** Displayed as the section heading or tab trigger label. */
  readonly label: string
  /** Column keys to include in this group (must be `create: true` or `patch: true` columns). */
  readonly columnKeys: readonly string[]
}

/** Server: one junction to sync after parent create/update (simple M:N). */
export type AdminEntityJunctionSyncOp =
  | {
      readonly junctionEntitySlug: string
      readonly junctionParentFkColumnKey: string
      readonly junctionRelatedFkColumnKey: string
      readonly relatedIdValueType: "integer"
      readonly relatedIds: readonly number[]
    }
  | {
      readonly junctionEntitySlug: string
      readonly junctionParentFkColumnKey: string
      readonly junctionRelatedFkColumnKey: string
      readonly relatedIdValueType: "uuid"
      readonly relatedIds: readonly string[]
    }

export type ListOrderSpec = {
  columnKey: string
  direction: "asc" | "desc"
}

/** Filter list rows where `(year, month)` equals a single reporting period (`YYYY-MM` in the URL). */
/**
 * List toolbar: filter rows where `columnKey` is between two calendar dates (inclusive).
 * Query params use `YYYY-MM-DD`; both must be present and valid or the filter is ignored.
 */
export type AdminEntityListDateRangeFilter = {
  /**
   * Logical column key (`columns[].key` when listed). For default list SQL, must map to a
   * date-comparable column on the list’s Drizzle table; otherwise omit matching DB column and handle
   * the range in {@link AdminEntityListServerContext.appendListWhere} via `dateRangeFilters`.
   */
  readonly columnKey: string
  /** Query param for range start; default `dateFrom`. */
  readonly fromQueryParam?: string
  /** Query param for range end; default `dateTo`. */
  readonly toQueryParam?: string
  /** Toolbar control label. */
  readonly label?: string
  /**
   * When true, compare using **`(column)::date`** so **`timestamp`** columns match whole calendar days
   * in the inclusive range (avoids missing end-of-day rows when bounds are `YYYY-MM-DD`).
   */
  readonly compareAsDateOnly?: boolean
}

export type AdminEntityListYearMonthFilter = {
  /** Query param name; default `reportedPeriod`. */
  readonly queryParam?: string
  /**
   * Mode A — separate integer columns: `WHERE yearCol = ? AND monthCol = ?`.
   * Mode B — {@link dateColumnKey}: `WHERE dateCol >= monthStart AND dateCol < nextMonthStart`.
   * Provide **either** (`yearColumnKey` + `monthColumnKey`) **or** `dateColumnKey`.
   */
  readonly yearColumnKey?: string
  readonly monthColumnKey?: string
  readonly dateColumnKey?: string
  /**
   * When true, the list never uses "all periods": missing or invalid `reportedPeriod` resolves to the
   * current UTC calendar month; the UI omits an "All periods" option.
   */
  readonly required?: boolean
  /**
   * GET path after `apiBase` that returns `{ periods: string[] }` (normalized `YYYY-MM`), newest first.
   * Default `reporting-periods`.
   */
  readonly periodsPath?: string
  /** Toolbar filter control label. */
  readonly label?: string
}

/** `id` column as exposed in list/create API JSON (camelCase). */
export type AdminEntityIdColumn = {
  readonly jsonKey: string
  readonly valueType: AdminValueType
}

/** Copy for the shared admin entity shell (list card, create card, errors). */
export type AdminEntityUi = {
  readonly title: string
  readonly singular: string
  readonly addCardTitle: string
  readonly listTitle: string
  readonly loadErrorLabel: string
  readonly emptyLabel: string
}

/**
 * OR-combined ILIKE filter on list GET. Keys are `columns[].key`; only `valueType: "text"`
 * columns on the **main** table are applied on the server.
 *
 * Optional `relatedTextSearch` adds OR EXISTS branches: each row matches if any related column
 * (e.g. invoice identity fields on `alternate_customer_names`) matches the same search string.
 *
 * Join shape (pick one):
 * - **Default:** `main[fkColumnKey] = related[idColumn]` (FK on the listed entity → related PK), e.g. sales → alternate name row.
 * - **`relatedFkToParentColumnKey`:** `related[that key] = main[fkColumnKey]` (child rows point at the listed parent), e.g. customers → alternate names by `customer_code`.
 */
export type AdminEntityListSearch = {
  readonly columnKeys: readonly string[]
  /**
   * Subset of `columnKeys` that use word-split AND matching. A multi-word search
   * term is split on whitespace and each word must match independently (AND).
   * Columns NOT in this list use the default phrase-substring match.
   * Useful for name fields where words may not be adjacent (e.g. "Linda Heuvel"
   * matching "Linda Margaret Heuvel").
   */
  readonly wordSplitColumnKeys?: readonly string[]
  readonly relatedTextSearch?: readonly {
    /**
     * Listed-entity column used in the EXISTS join: either the FK to the related PK (default), or the parent key when using `relatedFkToParentColumnKey`.
     */
    readonly fkColumnKey: string
    readonly relatedEntitySlug: string
    /** Related entity `columns[].key` entries with `valueType: "text"`. */
    readonly relatedColumnKeys: readonly string[]
    /**
     * When set, the EXISTS subquery matches rows where this related-table column equals `main[fkColumnKey]` (parent key on the listed entity).
     * Omit to use `main[fkColumnKey] = related[idColumn]` instead.
     */
    readonly relatedFkToParentColumnKey?: string
  }[]
  /**
   * Controls when the search query is submitted.
   * `"debounce"` (default) — fires automatically after a short pause while typing.
   * `"submit"` — fires only when the user presses Enter or clicks the search button.
   */
  readonly trigger?: "debounce" | "submit"
}

/**
 * List GET: equality filter on one boolean column. Omit query param (or empty) → no filter.
 * `columnKey` must reference `columns[]` with `valueType: "boolean"`.
 */
export type AdminEntityListBooleanFilter = {
  readonly columnKey: string
  /**
   * Query param name; defaults to `columnKey` (JSON field name, e.g. `isMastered`).
   * Allowed values: `true`, `false` (case-insensitive on the server).
   */
  readonly queryParam?: string
  readonly labels: {
    readonly all: string
    readonly true: string
    readonly false: string
  }
  /**
   * Where this filter renders. Omit / `"inline"` → toolbar (existing behaviour).
   * `"side"` → right-hand sidebar panel.
   */
  readonly uiLayout?: "inline" | "side"
  /**
   * How the filter renders in the side panel. Omit → 3-segment button group (All / true / false).
   * `"switch"` → single Switch toggling between "all" and "true" only (hides the false option).
   */
  readonly uiStyle?: "switch"
  /**
   * Segment to use when the URL param is absent. Defaults to `"all"` (no filter).
   * Set to `"true"` to open the list filtered to truthy rows by default.
   */
  readonly defaultSegment?: "all" | "true" | "false"
}

export type {
  AdminEntityListRelationFilterLayout,
  AdminEntityListRelationFilterSpec,
  AdminEntityListManyRelationFilterSpec,
  AdminEntityListAppendWhereHintFilter,
} from "./admin-entity-filter-types"

export type {
  AdminEntityListMobileCardGroupLayout,
  AdminEntityListMobileCardGroupSpec,
  AdminEntityListGridSpec,
  AdminEntityListMobileCardSpec,
} from "./admin-entity-mobile-card-types"

/**
 * How the admin entity list page `<h1>` behaves on compact viewports (narrow width or short height).
 * Set on **`AdminEntityPageShell`** per app — not on each entity.
 *
 * - **`showUnlessHidden`** — show the heading unless the entity sets {@link AdminEntityDefinition.listHidePageTitleOnCompact}.
 * - **`hideUnlessShown`** — hide the heading unless the entity sets {@link AdminEntityDefinition.listShowPageTitleOnCompact}.
 */
export type AdminEntityPageShellCompactPageTitlePolicy =
  | "showUnlessHidden"
  | "hideUnlessShown"

/** Opt-in whole-row highlight config (see {@link AdminEntityDefinition.listRowHighlight}). */
export type AdminEntityListRowHighlight = {
  /** Row boolean field; when truthy, `className` is applied to the row. */
  readonly field: string
  /** Tailwind classes applied to the highlighted row (table `<tr>`, quick card, mobile card). */
  readonly className: string
  /** Optional row field whose value (string or string[]) is exposed as `data-row-highlight-labels`. */
  readonly labelsField?: string
  /**
   * Optional lower-priority second tier (e.g. an amber "due soon" warning). Applied only when the
   * primary `field` is falsy and `warningField` is truthy — the primary tier always wins.
   */
  readonly warningField?: string
  /** Tailwind classes applied when the warning tier is active. */
  readonly warningClassName?: string
  /** Optional row field exposed as `data-row-highlight-labels` when the warning tier is active. */
  readonly warningLabelsField?: string
}

/**
 * Shape of each export in `lib/admin/entities/*` (client-safe catalog entry).
 * Use `as const satisfies AdminEntityDefinition` on the object to keep literal types
 * while checking required fields.
 */
export type AdminEntityDefinition = {
  /** When true, `/admin/[slug]` and nav include this entity */
  readonly adminPage: boolean
  /**
   * When false, `/api/admin/[slug]` returns 404 (registry + Drizzle mapping only; e.g. junction tables).
   * Omit or true for normal entities.
   */
  readonly adminApi?: boolean
  readonly slug: string
  readonly schemaSqlName: string
  readonly apiBase: string
  readonly queryKey: readonly [string, string]
  readonly nav: { readonly label: string }
  readonly metadataTitle: string
  readonly idColumn: AdminEntityIdColumn
  /** `columns[].key` used in delete confirmation copy */
  readonly deleteLabelColumnKey: string
  readonly columns: readonly AdminEntityColumn[]
  /**
   * Optional list table column order (left-to-right). Must list every visible list column
   * (`list: true` and not `listSuppressedFromTable`) exactly once. Omit to use `columns`
   * definition order (visible list fields only).
   */
  readonly listColumnOrder?: readonly string[]
  /**
   * Optional create/edit dialog field order for the **main** scroll area (above related tabs).
   * Every `columns[].key` with `create: true` or `patch: true` must appear either here or in
   * {@link crudFormAfterRelatedColumnKeys} (those keys are appended when this array is set — see
   * `adminEntityFormColumnsInOrder`). Omit to follow list table order (`listColumnOrder` / list
   * columns), then any create/patch-only columns in definition order.
   */
  readonly formColumnOrder?: readonly string[]
  /**
   * Optional `columns[].key` values rendered after **`crudRelatedCollections`** tabs and above the
   * dialog footer (still inside the `<form>`). When **`formColumnOrder`** is set, keys listed here
   * are still included in `createCols` / `patchCols` (after main-order fields) so they partition
   * into the deferred slot. Omit → all fields stay in the main scroll area.
   */
  readonly crudFormAfterRelatedColumnKeys?: readonly string[]
  /**
   * Named groups of create/edit form fields. Fields declared here are removed from the main
   * grid and rendered in labelled sections or tab panels (controlled by {@link crudFormGroupsMode}).
   * Fields not in any group continue to render in the main grid above.
   */
  readonly crudFormGroups?: readonly AdminEntityCrudFormGroup[]
  /**
   * How grouped fields appear in the CRUD dialog:
   * - `"sections"` (default): titled divider-sections inside the same scroll area as the main grid.
   * - `"tabs"`: Radix Tab panels in a `flex-1` slot below the main fields, above any related collections.
   */
  readonly crudFormGroupsMode?: "sections" | "tabs"
  readonly listOrderBy: readonly ListOrderSpec[]
  /** Override sort order for relation-picker popovers (multi-select). Client-side sort applied after fetch. */
  readonly listRelationPickerOrderBy?: readonly ListOrderSpec[]
  readonly ui: AdminEntityUi
  /** Optional `/admin/[slug]` shell width; omit to use `frontendConfig.admin.entityPageWidth` */
  readonly entityPageWidth?: AdminEntityPageWidthPreset
  /**
   * Optional create/edit modal max width (`DialogContent`). Omit → **`medium`** (`max-w-2xl`).
   * Use **`wide`** / **`extraWide`** / **`fluid`** when the form has a many-relation side rail or large grids.
   */
  readonly crudDialogWidth?: AdminEntityCrudDialogWidthPreset
  /**
   * Optional create/edit modal max height (`DialogContent`). Omit → **`medium`** (90vh cap, 720px).
   * Use **`tall`** / **`extraTall`** for data-heavy dialogs (e.g. related-row tabs that need more viewport).
   */
  readonly crudDialogHeight?: AdminEntityCrudDialogHeightPreset
  /**
   * Create/edit dialog field density. **`compact`** — tighter gaps, smaller controls (see `.admin-entity-crud-dialog-form--compact`).
   * Omit → default spacing.
   */
  readonly crudDialogFormDensity?: AdminEntityCrudDialogFormDensityPreset
  /**
   * Which create dialog footer action is the **native** `type="submit"` (e.g. when the user presses
   * **Enter** in a text field). Defaults to the primary **Create** control (`keepOpen`); use
   * **`createAndAddNew`** for rapid line entry when **Create & add new** is shown.
   */
  readonly createFormPrimarySubmitAction?:
    | "create"
    | "createAndClose"
    | "createAndAddNew"
  /**
   * Controls CRUD on compact admin viewports (same breakpoint as mobile entity lists).
   * Default (omitted) → **editable**: fields, Save/Create, and related inline tables work on compact.
   * Set **`"locked"`** to make compact viewports browse-only (read-only fields, no Save/Create).
   * (`"editable"` is accepted as an explicit alias for the default.)
   */
  readonly crudCompactViewport?: "editable" | "locked"
  /**
   * When true, clicking any row in the desktop list table opens the edit dialog (same as the Edit
   * button). The per-row action buttons remain visible unless also hidden by {@link listHideRowActions}.
   */
  readonly listRowClickOpensEditDialog?: boolean
  /**
   * When true, the list table omits per-row Edit / Delete actions.
   */
  readonly listHideRowActions?: boolean
  /**
   * When true, compact (mobile card) lists omit the per-row actions row; the desktop table still shows
   * Edit / Delete when {@link listHideRowActions} is false.
   */
  readonly listHideRowActionsOnMobileCards?: boolean
  /**
   * When true, the row-links column (external icon links) is rendered as the **first** column
   * instead of the default position (before the actions column at the end).
   */
  readonly listRowLinksFirst?: boolean
  /**
   * Freeze (pin to the left edge) the leading list columns of the standard desktop table up to **and
   * including** this data column key, so the remaining columns scroll horizontally underneath. The
   * leading row-links column is included automatically when {@link listRowLinksFirst} is set.
   *
   * Each frozen column must have a **fixed width** so the cumulative `left` offsets are deterministic:
   * set `listColumnMinWidthPx === listColumnMaxWidthPx` on each frozen data column, and the row-links
   * column width via {@link listStickyStartRowLinksWidthPx}. Only the standard table is affected
   * (quick cards / grid / mobile are unaffected).
   */
  readonly listStickyStartColumnKey?: string
  /** Fixed px width of the leading row-links column when it is part of the {@link listStickyStartColumnKey} frozen band. */
  readonly listStickyStartRowLinksWidthPx?: number
  /**
   * When the edit dialog for **this** entity is opened from another admin list (e.g. a related FK cell),
   * the form is **read-only** (no save) unless this flag is **true**. Opens from this entity’s own
   * admin page are always editable. Omit → **false** (cross-page view-only).
   */
  readonly allowCrossPageAdminEdit?: boolean
  /**
   * When true, `POST` / `PATCH` / `DELETE` on this entity’s admin API must be rejected (list + detail GET only).
   */
  readonly adminMutationsDisabled?: boolean
  /** Optional search query param `search` — ILIKE across `columnKeys` (OR). */
  readonly listSearch?: AdminEntityListSearch
  /** Optional boolean column filter; see `AdminEntityListBooleanFilter`. */
  readonly listBooleanFilter?: AdminEntityListBooleanFilter
  /**
   * Optional segment filter (e.g. "non-zero only") backed by a query param; server merges via
   * `appendListWhere` hints (see `ListAdminEntityPageOptions.appendListWhereHints`).
   * @deprecated Prefer {@link listAppendWhereHintFilters} when an entity needs more than one group.
   */
  readonly listAppendWhereHintFilter?: AdminEntityListAppendWhereHintFilter
  /**
   * Multiple append-where hint groups (each with its own `queryParam`). When set and non-empty,
   * takes precedence over {@link listAppendWhereHintFilter}.
   */
  readonly listAppendWhereHintFilters?: readonly AdminEntityListAppendWhereHintFilter[]
  /** Optional calendar-month period filter (`YYYY-MM` query param); see {@link AdminEntityListYearMonthFilter}. */
  readonly listYearMonthFilter?: AdminEntityListYearMonthFilter
  /**
   * Optional inclusive date range on a single date column (`WHERE col >= from AND col <= to`).
   * Omit either query param or use invalid dates → no date-range filter.
   */
  readonly listDateRangeFilter?: AdminEntityListDateRangeFilter
  /**
   * When **non-empty**, replaces {@link listDateRangeFilter} for toolbar, URL params, and list SQL.
   * Each entry’s `columnKey` must match a physical date column on the list table **or** be handled
   * only in `appendListWhere` (no matching Drizzle column → generic list SQL skips that range).
   * Use **distinct** `fromQueryParam` / `toQueryParam` per entry when multiple ranges are active.
   */
  readonly listDateRangeFilters?: readonly AdminEntityListDateRangeFilter[]
  /**
   * Optional: when `reportedPeriod` (or `queryParam`) is present on list GET, restrict rows to those
   * referenced by the related entity for that `(year, month)` (EXISTS subquery). Omit param → unscoped list.
   */
  readonly listScopeByReportingPeriodInRelated?: {
    readonly queryParam?: string
    readonly relatedEntitySlug: string
    readonly parentFkColumnKey: string
    readonly relatedFkColumnKey: string
    readonly relatedYearColumnKey: string
    readonly relatedMonthColumnKey: string
  }
  /** Optional FK filters backed by related-table list rows (`listRelation` on each column). */
  readonly listRelationFilters?: readonly AdminEntityListRelationFilterSpec[]
  /** Optional M2M filters via junction (`listManyRelation` on the referenced column). */
  readonly listManyRelationFilters?: readonly AdminEntityListManyRelationFilterSpec[]
  /**
   * When an append-where hint (e.g. a map-area `streetFilter`) is active, suppress the listed
   * generic filters so the hint's results are not silently narrowed by them. **Server-side only** —
   * the toolbar controls keep their state; they simply have no effect on the query while the hint is
   * present. Used e.g. so a map polygon search returns every matching street regardless of the
   * favourites toggle (which defaults on) or the Status filter.
   */
  readonly listFiltersBypassedByAppendWhereHint?: readonly {
    /** The append-where hint `queryParam` that, when present & non-empty, triggers the bypass. */
    readonly whenHintPresent: string
    /** Drop the {@link listBooleanFilter} condition (e.g. favourites) from the list query. */
    readonly bypassBooleanFilter?: boolean
    /** Drop these {@link listRelationFilters} `columnKey` conditions (e.g. `propertyStatusId`). */
    readonly bypassRelationFilterColumnKeys?: readonly string[]
  }[]
  /**
   * Optional `SUM(column)` over **all** rows matching the current list filters (same `WHERE` as count/list),
   * not limited to the current page. Keys are `columns[].key`; each column must exist on the base table with
   * `valueType: "numeric"` or `"integer"`. Exposed on list GET as `listAggregateSums` (string decimals).
   */
  readonly listAggregateSumColumnKeys?: readonly string[]
  /**
   * When **true**, list numeric {@link listAggregateSums} are still computed for the API, but the
   * table’s docked aggregate footer is hidden (e.g. app renders a custom summary above the grid).
   */
  readonly listHideDockAggregateFooter?: boolean
  /**
   * When **true**, omit {@link listAggregateSums} on list GET unless the combined list `WHERE` is
   * non-empty (at least one filter contributes). Avoids full-table aggregate queries when totals are
   * only shown for filtered views (e.g. Vibram **sales** banner).
   */
  readonly listAggregateSumsOnlyWhenFiltered?: boolean
  /**
   * Optional **desktop** card grid layout alongside the table (toggle in the list toolbar).
   * On compact viewports, {@link listMobileCard} still wins when configured.
   * Persisted in the page URL as `listLayout=table` / `listLayout=grid` (ignored by list APIs).
   */
  readonly listGrid?: AdminEntityListGridSpec
  /**
   * Opt-in whole-row highlight. When the row's boolean field `field` is truthy, `className` is
   * applied to the row (desktop table `<tr>`, quick-desktop card, and mobile card). Backward
   * compatible — omit to disable. The field is typically a server-computed flag on each list row.
   */
  readonly listRowHighlight?: AdminEntityListRowHighlight
  /**
   * Narrow (mobile) list: read-only **card** layout using these list column keys, in order.
   * Omit → first six visible list columns (see `adminEntityListMobileCardFields` in `@repo/admin`).
   */
  readonly listMobileCard?: AdminEntityListMobileCardSpec
  /**
   * When **true**, the list card shows {@link AdminEntityUi.listTitle} on non-compact (wide) viewports.
   * Omit or **false** → hidden by default (page `<h1>` usually matches; avoids redundant caption).
   */
  readonly listShowListCardTitle?: boolean
  /**
   * When **true**, the list card shows {@link AdminEntityUi.listTitle} on compact viewports.
   * Omit or **false** → the title is hidden on compact (page heading is usually enough).
   */
  readonly listShowListCardTitleOnCompact?: boolean
  /**
   * When **true** on compact viewports, the list {@link Card} uses tighter vertical padding and header
   * spacing so more of the list is visible (optional; long mobile card lists).
   */
  readonly listCompactListCardDense?: boolean
  /**
   * When **true** on **wide** (non-compact) list viewports, the desktop list filters toolbar uses
   * tighter gaps, smaller labels, and shorter controls. Does **not** enable the mobile stacked
   * full-width filter toolbar (`compactVertical`); narrow viewports keep
   * the existing compact / mobile filter layout.
   */
  readonly listFiltersToolbarDense?: boolean
  /**
   * When **true**, the side relation-filter panel starts **collapsed** by default on every page load.
   * A narrow chevron-strip button at the grid border lets the user expand/collapse it.
   * State is not persisted — resets to collapsed on each navigation.
   */
  readonly listSideFiltersPanelCollapsible?: boolean
  /**
   * When **true**, the page `<h1>` ({@link AdminEntityUi.title}) is hidden on **all** viewports.
   * Use when the card toolbar provides enough context and vertical space is at a premium.
   */
  readonly listHidePageTitle?: boolean
  /**
   * When **`AdminEntityPageShell`** uses **`compactPageTitle: "showUnlessHidden"`** (Galaxy default):
   * if **true**, the page `<h1>` ({@link AdminEntityUi.title}) is omitted on compact viewports.
   * Ignored when the shell uses **`"hideUnlessShown"`** — use {@link listShowPageTitleOnCompact} instead.
   */
  readonly listHidePageTitleOnCompact?: boolean
  /**
   * When **`AdminEntityPageShell`** uses **`compactPageTitle: "hideUnlessShown"`** (e.g. Vibram Sales):
   * if **true**, the page `<h1>` stays visible on compact viewports. Omit or **false** → hide on compact
   * (that app’s default).
   */
  readonly listShowPageTitleOnCompact?: boolean
  /**
   * JSON keys allowed on **POST** in addition to `create: true` columns (parsed into `extras`, not inserted as table columns).
   * Apps handle `extras` in route handlers (e.g. atomic child rows in the same transaction).
   */
  readonly extraCreateBodyKeys?: readonly string[]
  /**
   * JSON keys allowed on **PATCH** in addition to `patch: true` columns (parsed into `extras`).
   */
  readonly extraPatchBodyKeys?: readonly string[]
  /**
   * For each key, the client omits that extra from **PATCH** JSON until the entity detail GET
   * (with related collections) succeeds — avoids sending an empty array and wiping children.
   */
  readonly extraPatchOmitUntilDetailLoaded?: readonly string[]
  /**
   * When **true**, opening **edit** from this entity’s **list** does not trust embedded related
   * collections as a detail-equivalent seed — the client runs **`GET /api/admin/[slug]/[id]`** instead.
   * Use when list rows omit server-merged fields that **GET** detail adds (e.g. computed child columns).
   */
  readonly crudRelatedCollectionsAlwaysFetchDetailOnEdit?: boolean
  /**
   * When **true**, **edit**-mode PATCH extras for the related collection keyed **`items`** must use
   * sparse ops only (experimental related-line builder); the client must not fall back to a full
   * snapshot `linesToExtrasPayload`, and the app server should reject non-sparse `items` on PATCH.
   * Use for Vibram inventory count date entities — not for every entity with inline lines.
   */
  readonly crudRelatedItemsSparsePatchOnly?: boolean
  /**
   * When editing this entity, a successful nested PATCH on `nestedChildEntitySlug` refreshes this
   * dialog’s `listDetailSeed` if the child row’s `childFkToParentJsonKey` matches the open row id.
   */
  readonly refreshListDetailSeedAfterNestedChildPatch?: {
    readonly nestedChildEntitySlug: string
    readonly childFkToParentJsonKey: string
  }
  /**
   * When editing this entity, a successful nested PATCH on any of these slugs (e.g. **`sales`** from
   * "edit related" on a junction line) refetches this dialog’s **`listDetailSeed`** so inline embeds
   * and relation options stay in sync. Use with {@link AdminEntityCrudRelatedCollectionTable.openRelatedTargetInNestedCrudDialog}.
   */
  readonly refreshListDetailSeedAfterNestedRelatedEntityPatch?: readonly string[]
  /**
   * When set, **GET** `/api/admin/[slug]/[id]` includes nested arrays keyed by `jsonKey`,
   * loaded from the child table where `parentFkColumnKey` matches the parent id.
   * Also drives the shared CRUD "related rows" tabs + inline editor in `@repo/admin`.
   */
  readonly crudRelatedCollections?: readonly AdminEntityCrudRelatedCollection[]
  /**
   * For nested CRUD inline FK selects: when the parent detail row is loaded, fetch options for
   * `relatedEntitySlug` using that entity’s `listRelationFilters` (see `relationFilterSelections`
   * on list URL). Omit entries for relations that should stay unscoped.
   */
  readonly crudRelationOptionFiltersFromParentDetail?: readonly {
    readonly relatedEntitySlug: string
    readonly selections: readonly (
      | {
          readonly relatedListFilterColumnKey: string
          /**
           * Always send this string as the related list filter (e.g. boolean `"true"`).
           * Use when the value must not be derived from a parent field (avoids mis-mapping
           * unrelated parent keys onto boolean filter params).
           */
          readonly fixedRelationFilterValue: string
        }
      | {
          /** `listRelationFilters[].columnKey` on the **related** list entity. */
          readonly relatedListFilterColumnKey: string
          /** Parent entity detail JSON key (e.g. current row’s `payrollPeriodId`). */
          readonly parentDetailJsonKey: string
          /**
           * When true, an empty parent value does not block scoped mode; use
           * {@link whenEmptyRelationFilterValue} when the related list API needs an explicit sentinel.
           */
          readonly optionalWhenEmpty?: boolean
          /**
           * With {@link optionalWhenEmpty}: when the parent field is empty, set this string in
           * `relationFilterSelections` (e.g. server-side SQL sentinel).
           */
          readonly whenEmptyRelationFilterValue?: string
        }
    )[]
  }[]
  /**
   * When **true**, the **edit** dialog footer omits **Add New** (opens create for another row).
   * List/card create entry points are unchanged.
   */
  readonly crudEditDialogHideFooterAddNew?: boolean
  /**
   * When **true**, the **edit** dialog footer omits **Delete** for the open row.
   * List row delete remains available unless {@link listHideRowActions} applies.
   */
  readonly crudEditDialogHideFooterDelete?: boolean
}

/**
 * One operand for a display-only related-row virtual column. `relationNumeric` resolves values from
 * the same relation option list used by the FK select (`listRelation` on `fkColumnKey`).
 */
export type AdminEntityCrudRelatedVirtualColumnFactor =
  | { readonly kind: "lineNumeric"; readonly columnKey: string }
  /** Constant multiplier (e.g. `1` to surface a single `relationNumeric` as a product). */
  | { readonly kind: "literalNumeric"; readonly value: number }
  /**
   * Numeric value read from the **parent CRUD detail** row (dot path), e.g. period **`perDayAllowance`**
   * on `payrollPeriodRef.perDayAllowance`. Accepts non-negative finite numbers including **0**.
   */
  | { readonly kind: "parentDetailNumeric"; readonly path: string }
  | {
      readonly kind: "relationNumeric"
      /** Child column with `listRelation` (FK id stored on each line). */
      readonly fkColumnKey: string
      /**
       * Numeric field on the related entity’s list row, or a **dot path** into list-embed JSON on
       * that row (e.g. `guardRef.allowance` when payroll list rows embed the linked guard).
       */
      readonly relatedNumericColumnKey: string
      /**
       * When set, the looked-up value is divided by this **dot path** on the **parent CRUD detail**
       * row (e.g. `payrollPeriodRef.days`) so the product matches "per period allowance ÷ period
       * days × line days".
       */
      readonly divideByParentDetailNumericPath?: string
    }

/**
 * Read-only computed column in the related-rows inline table (not persisted; not sent in extras).
 */
export type AdminEntityCrudRelatedVirtualColumn =
  | {
      readonly key: string
      readonly label: string
      readonly kind: "product"
      readonly factorLeft: AdminEntityCrudRelatedVirtualColumnFactor
      readonly factorRight: AdminEntityCrudRelatedVirtualColumnFactor
      /** Passed to list-style numeric formatting for cells and footer totals. */
      readonly currencySymbol?: string
    }
  | {
      readonly key: string
      readonly label: string
      /**
       * Resolved by `AdminClientRegistryValue.evalRelatedInlineVirtualRegistryNumeric(registryKey, line)`.
       */
      readonly kind: "registryInlineNumeric"
      readonly registryKey: string
      readonly currencySymbol?: string
      /**
       * When set, the cell compares the computed amount to this **line** column (numeric string)
       * and applies match/mismatch text classes (e.g. cash sum vs `roundedOffAmount`).
       */
      readonly compareComputedNumericToLineColumnKey?: string
      readonly compareMatchClassName?: string
      readonly compareMismatchClassName?: string
    }

/** Display-only cell: reads `line[embedJsonKey][field]` when the embed is an object. */
export type AdminEntityCrudRelatedEmbedPreviewColumn = {
  readonly key: string
  readonly label: string
  readonly embedJsonKey: string
  readonly field: string
  /**
   * When set, format the embedded value using that entity definition’s column metadata (e.g. numeric
   * + `currencySymbol`, date strings).
   */
  readonly listFormatFrom?: {
    readonly entitySlug: string
    readonly columnKey: string
  }
  /**
   * Table header and cell alignment. When omitted, derived from {@link listFormatFrom} target column:
   * `numeric` / `integer` → **right** (same as main list), else left.
   */
  readonly cellAlign?: AdminCellAlign
  /**
   * When true, show the value in a disabled text input (same row height as other inline CRUD fields).
   * Default: plain truncated text.
   */
  readonly displayAsDisabledInput?: boolean
  /**
   * When set, render a tappable icon link alongside the disabled input cell.
   * - `"tel"` → `<a href="tel:…">` phone icon
   * - `"mailto"` → `<a href="mailto:…">` mail icon
   * Only shown when the cell value is non-empty.
   */
  readonly listCellLinkType?: "tel" | "mailto"
}

/**
 * Inline related rows: embedded on parent admin detail, editable in CRUD tabs.
 * `childEntitySlug` must exist in the app’s `adminEntities` + `adminEntityTables` (often `adminApi: false`).
 */
export type AdminEntityCrudRelatedCollectionTable = {
  /** Response / PATCH / POST JSON key (e.g. `securityServices`). */
  readonly jsonKey: string
  readonly tabLabel: string
  /** Radix `Tabs` value; defaults to a kebab slug derived from `jsonKey`. */
  readonly tabValue?: string
  readonly childEntitySlug: string
  /** Child table column (camelCase) that references the parent row. */
  readonly parentFkColumnKey: string
  /**
   * When set, child rows are matched using **`detail[childFkValueFromParentColumnKey]`** on the
   * **parent** row (e.g. `entityId` on `property_entities`) instead of the parent’s primary key.
   * Use with `parentFkColumnKey` pointing at that FK column on the child table (e.g. `entityId` on
   * `entity_members`). Server list/detail loaders, nested list batching, and delete cascades resolve
   * the value by reading the parent row; the related inline grid presets implicit FKs from
   * `detailPayload[childFkValueFromParentColumnKey]`.
   */
  readonly childFkValueFromParentColumnKey?: string
  /**
   * When true, **do not** delete child rows for this collection when the parent row is deleted
   * (e.g. `entity_members` scoped by `entity_id` must survive removal of a `property_entities`
   * junction row).
   */
  readonly skipDeleteChildRowsOnParentDelete?: boolean
  /** Sort related rows ascending by this child column key. Default: child `idColumn.jsonKey`. */
  readonly orderByColumnKey?: string
  /** Multi-column sort for related rows. Each entry applied in order. Overrides `orderByColumnKey` when present. */
  readonly orderByColumns?: readonly {
    readonly columnKey: string
    readonly direction: "asc" | "desc"
  }[]
  /** Child `columns[].key` values to show as editable cells (parent FK is implicit). */
  readonly inlineEditableColumnKeys: readonly string[]
  /**
   * Read-only columns after inline virtual columns (e.g. server-computed aggregates). Keys must be on
   * the child entity’s `columns[]`, must not appear in `inlineEditableColumnKeys`, and are not sent
   * in PATCH/POST extras by default — except keys also listed in `inlineExtrasPayloadKeys`.
   */
  readonly inlineReadonlyColumnKeys?: readonly string[]
  /**
   * Line keys copied into each PATCH/POST extras row **in addition to** `inlineEditableColumnKeys`
   * (e.g. derived `roundedOffAmount` shown read-only).
   */
  readonly inlineExtrasPayloadKeys?: readonly string[]
  /**
   * A draft row is saved only when this column’s trimmed value is non-empty.
   * Default: first entry in `inlineEditableColumnKeys`.
   */
  readonly persistWhenColumnKeyNonEmpty?: string
  /**
   * When true, a row is saved when it is not "empty" per `lineIsEmptyForPersist` (see
   * `admin-entity-crud-related-collections-draft.ts`) using
   * `persistWhenColumnKeyNonEmpty ?? inlineEditableColumnKeys[0]` and numeric zero sentinels—so
   * e.g. an overtime amount alone can persist without filling an optional FK column.
   * When omitted, the legacy rule applies: only `persistWhenColumnKeyNonEmpty` non-empty.
   */
  readonly persistWhenAnyEditableContent?: boolean
  /**
   * Shown in **create** mode before the parent row exists (no detail fetch yet).
   * Omit for a generic short hint.
   */
  readonly createModeHint?: string
  /**
   * Inline related table on parent **create** is **on** unless set to **false**.
   * Parent FK on draft rows comes from `entityRowId` when editing, or from the parent CRUD form when
   * `AdminEntityCrudRelatedCollectionsSection` receives `parentCrudForm` (create dialog). Set **false**
   * to show only `createModeHint` (hint-only / save-parent-first UX).
   */
  readonly inlineTableOnCreate?: boolean
  /**
   * Optional minimum height in **px** for the full inline related editor.
   * Use when a dense parent form leaves the related grid too short to work in comfortably.
   */
  readonly inlineTableMinHeightPx?: number
  /**
   * When true, removing a **persisted** row (trash on a saved child id) immediately issues
   * `DELETE` to `{child apiBase}/{id}` before updating local draft state. Unsaved drafts still
   * remove locally only. Errors are shown inline on the related table.
   */
  readonly relatedInlineImmediateDeleteViaChildApi?: boolean
  /**
   * Display-only columns after editable cells (e.g. denomination face value × count). Keys must not
   * collide with `inlineEditableColumnKeys`.
   */
  readonly inlineVirtualColumns?: readonly AdminEntityCrudRelatedVirtualColumn[]
  /**
   * When set, after inline `lines` change the client runs
   * `relatedCollectionLinesChangePostProcess[registryLinesChangePostProcessKey]` to derive fields
   * (e.g. rounded amounts from net pay). The hook receives optional `parentCrudForm` when the CRUD
   * dialog passes it (e.g. roll header totals from child lines).
   */
  readonly registryLinesChangePostProcessKey?: string
  /**
   * When set, after inline `lines` change the client also runs
   * `relatedCollectionLinesAsyncPostProcess[registryLinesAsyncChangePostProcessKey]` (e.g. fetch
   * suggested prices) and replaces `lines` when the promise resolves to a new array.
   */
  readonly registryLinesAsyncChangePostProcessKey?: string
  /**
   * Optional toolbar beside **Add empty row**, rendered by
   * `AdminClientRegistryValue.renderCrudRelatedTableToolbar` when the registry handles this key.
   */
  readonly registryRelatedTableToolbarKey?: string
  /**
   * Optional extra controls in each inline row’s **actions** cell (before delete), keyed into
   * `AdminClientRegistryValue.renderCrudRelatedInlineRowActionsByKey`.
   */
  readonly registryRelatedInlineRowActionsKey?: string
  /**
   * When `registryRelatedInlineRowActionsKey` is set, how many **`icon-sm`-width** slots the custom
   * renderer needs (default **1**). Increase for multiple icon buttons in that slot. For label/text
   * controls, prefer `inlineRowActionsColumnWidthRemOverride` instead of inflating this count.
   */
  readonly inlineCustomRowActionIconSlots?: number
  /**
   * If set, the sticky **actions** column uses this total width in **rem** (plus the usual sub-pixel
   * seam), ignoring the icon-slot formula — use when the custom slot renders text buttons or other
   * non-icon controls.
   */
  readonly inlineRowActionsColumnWidthRemOverride?: number
  /**
   * Extra keys copied from each **server** row onto client `LineRow` state (for registry virtuals
   * that read nested payloads). Values that are plain objects or arrays are kept **structured**
   * (not stringified). Omit keys that are already `inlineEditableColumnKeys` / `inlineReadonlyColumnKeys`.
   */
  readonly inlineHydrateKeysFromServerRow?: readonly string[]
  /**
   * For **new** draft rows (`clientKey` not starting with `saved-`), these editable field values are
   * ignored when deciding if the row is "empty" for persist / trailing-draft rules (paired with
   * {@link inlineEmptyDraftTodayLocalIsoDateKeys} and boolean defaults).
   */
  readonly relatedInlineNewDraftTreatFieldValuesAsEmpty?: Readonly<
    Partial<Record<string, string>>
  >
  /**
   * On new empty draft lines, pre-fill these editable keys with **today’s local calendar date**
   * (`YYYY-MM-DD`). Must be listed in `inlineEditableColumnKeys`.
   */
  readonly inlineEmptyDraftTodayLocalIsoDateKeys?: readonly string[]
  /**
   * On new empty draft lines, pre-fill these FK column keys with the **first loaded option**
   * (lowest sort-order item from the relation’s option list). The seeded value is simultaneously
   * treated as "empty" for persist/trailing-draft rules, so a row with only this default does not
   * persist or trigger orphan-draft warnings. Keys must be in `inlineEditableColumnKeys` and must
   * reference `listRelation` columns.
   */
  readonly inlineNewDraftSeedFirstRelationOptionKeys?: readonly string[]
  /**
   * When an FK select changes in the inline table, copy fields from the related row into the line.
   * Related rows are already in memory (loaded for the select options), so no extra network request
   * is needed. The seed is applied only when the new FK value is non-empty; clearing the FK does not
   * overwrite the target field.
   */
  readonly inlineFkFieldSeedFromRelation?: readonly {
    /** Key of the FK column in `inlineEditableColumnKeys` whose select triggers the seed. */
    readonly fkColumnKey: string
    /** Key of the field on the related entity row to read the value from. */
    readonly relatedRowColumnKey: string
    /** Key of the line column to write the seeded value to. */
    readonly targetColumnKey: string
  }[]
  /**
   * Optional left-to-right order for inline table headers, body cells, and footer row. Each entry
   * must be an `inlineEditableColumnKeys` value, an `inlineVirtualColumns[].key`, or an
   * `inlineReadonlyColumnKeys` value. Keys omitted from this list keep their default relative order
   * after all listed keys. When omitted, order is: all editable keys, then all virtual columns, then
   * all readonly keys (legacy behavior).
   */
  readonly inlineTableColumnOrder?: readonly string[]
  /**
   * Read-only cells showing fields from a JSON embed on each line (e.g. `inventory.description`).
   * Use with `inlineHydrateKeysFromServerRow` and/or `listRelation.crudInlineCopyDetailEmbedToLineKey`.
   */
  readonly inlineRelationEmbedColumns?: readonly AdminEntityCrudRelatedEmbedPreviewColumn[]
  /**
   * Pin this column to the **right** of the horizontal scroll area, immediately before the actions
   * column. Must match an editable/virtual/readonly key or an `inlineRelationEmbedColumns[].key`.
   */
  readonly inlinePinnedEndColumnKey?: string
  /**
   * Pin this column to the **left** of the horizontal scroll area. Must match an editable/virtual/readonly
   * key or an `inlineRelationEmbedColumns[].key`. Prefer placing that key first in `inlineTableColumnOrder`.
   */
  readonly inlinePinnedStartColumnKey?: string
  /**
   * Minimum width in **px** for inline table columns keyed by editable, virtual, readonly, or embed column key.
   * Overrides defaults derived from column shape (e.g. currency amounts, async relation pickers).
   */
  readonly inlineColumnMinWidthsPx?: Readonly<Partial<Record<string, number>>>
  /**
   * Optional maximum width in **px** for the same keys as `inlineColumnMinWidthsPx`. Use with
   * `w-full` tables so currency/relation cells do not absorb excess horizontal space beyond what
   * values need.
   */
  readonly inlineColumnMaxWidthsPx?: Readonly<Partial<Record<string, number>>>
  /**
   * Override labels for inline table columns. Keys are column keys (editable, `inlineVirtualColumns[].key`,
   * or `inlineRelationEmbedColumns[].key`), values are the display label overrides. Use when the child
   * entity is reused across multiple parent relationships with different semantic meanings.
   */
  readonly inlineColumnLabelOverrides?: Readonly<Partial<Record<string, string>>>
  /**
   * Per-column fixed seed values to pre-fill when opening the quick-create nested dialog from an
   * async-search cell in this inline grid. Keyed by editable column key; values are merged with
   * `crudAsyncSearchCreateRelated.seedColumnKeysFromSearchText`.
   * Example: `{ entityId: { entityCategoryId: "1" } }` pre-fills buyer category on the entity create form.
   */
  readonly inlineCreateRelatedSeedFixedValues?: Readonly<Partial<Record<string, Readonly<Record<string, string>>>>>
  /**
   * Column keys (editable, `inlineVirtualColumns[].key`, or `inlineRelationEmbedColumns[].key`) for
   * which the footer shows a **sum**. Only rows that would be persisted (same rule as
   * `persistWhenColumnKeyNonEmpty`) are included.
   * For editable columns: intended for `valueType: "numeric"` / `"integer"`; non-finite values skipped.
   * For virtual columns: sums the computed value per row when all factors resolve to finite numbers.
   * For embed preview columns: sums `line[embedJsonKey][field]` per row when numeric.
   */
  readonly footerSumColumnKeys?: readonly string[]
  /**
   * When **true** and `footerSumColumnKeys` has exactly two keys, the parent create/edit form is
   * locked (Save/Create disabled) until those two column sums are equal. A "Balanced" / "Unbalanced"
   * badge is also shown in the collection header row.
   */
  readonly lockParentFormWhenSumsUnequal?: boolean
  /**
   * When the app wraps admin with `AdminNestedEntityCrudProvider`, **saved** rows show an **edit**
   * icon button (same affordance as the main list `admin-entity-row-edit`) that opens a second CRUD
   * dialog for `childEntitySlug` (e.g. payroll lines → full payroll form + children).
   */
  readonly openChildInNestedCrudDialog?: {
    /** `aria-label` on the icon button; falls back to `buttonLabel`, then **"Edit row"**. */
    readonly ariaLabel?: string
    /** Optional fallback for `aria-label` when `ariaLabel` is omitted. */
    readonly buttonLabel?: string
    /**
     * Hover tooltip (Radix **Tooltip**); defaults to the same string as the effective aria-label.
     */
    readonly tooltip?: string
  }
  /**
   * When **`AdminNestedEntityCrudProvider`** wraps admin, adds an **Edit related** control beside the
   * inline relation UI for **`lineColumnKey`** and in each row’s actions. Opens nested CRUD for
   * **`relatedEntitySlug`** using the trimmed cell value as **`rowId`** (must match that entity’s
   * **`idColumn`**).
   */
  readonly openRelatedTargetInNestedCrudDialog?: {
    /** Child line column that holds the related row’s primary key (e.g. **`drNumber`** → **`sales`**). */
    readonly lineColumnKey: string
    readonly relatedEntitySlug: string
    readonly ariaLabel?: string
    readonly buttonLabel?: string
    readonly tooltip?: string
    /**
     * When set, this column is used as the **`rowId`** passed to `openNestedEntityEdit` instead
     * of `lineColumnKey`. Useful when the FK column is in `inlineEditableColumnKeys` (which would
     * render the button beside the field) but you want the button in the trailing actions column
     * instead — point `lineColumnKey` at a non-editable column and `rowIdColumnKey` at the actual
     * FK column.
     */
    readonly rowIdColumnKey?: string
    /**
     * Override the edit dialog title singular (e.g. `"Buyer"` → "Edit Buyer").
     * Falls back to the related entity definition's `ui.singular`.
     */
    readonly dialogEditSingular?: string
  }
}

/**
 * Display-only related tab (no child entity or `jsonKey` payload). Rendered via
 * `AdminClientRegistryValue.renderCrudRelatedCustomPanel`.
 */
export type AdminEntityCrudRelatedCollectionCustom = {
  readonly mode: "custom"
  /**
   * Stable React key / tab identity only — **not** loaded from the API or sent in PATCH/POST extras.
   * Must not appear in `extraCreateBodyKeys` / `extraPatchBodyKeys`.
   */
  readonly jsonKey: string
  readonly tabLabel: string
  readonly tabValue?: string
  readonly customRelatedPanelKey: string
}

export type AdminEntityCrudRelatedCollection =
  | AdminEntityCrudRelatedCollectionTable
  | AdminEntityCrudRelatedCollectionCustom

export function isAdminEntityCrudRelatedCollectionTable(
  c: AdminEntityCrudRelatedCollection,
): c is AdminEntityCrudRelatedCollectionTable {
  return (c as AdminEntityCrudRelatedCollectionCustom).mode !== "custom"
}

export type AdminDocColumn = AdminEntityColumn

/** App entity definitions keyed by slug — pass from each app (no `@admin-context` in `@repo/admin`). */
export type AdminEntityRegistry = Readonly<Record<string, AdminEntityDefinition>>

/** Drizzle tables keyed by admin entity slug. */
export type AdminEntityTablesRegistry = Readonly<Record<string, PgTable>>

/** Subset of app `frontendConfig` used by admin list pagination defaults. */
export type AdminEntityListFrontendConfig = {
  readonly admin: { readonly entityListPageSizeOptions: readonly number[] }
}

/**
 * Drizzle client from each app’s `db` module (`postgres-js` driver). Schema differs per app;
 * keep this opaque inside `@repo/admin`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AdminDrizzleDb = PostgresJsDatabase<any>

/** Passed into `listAdminEntityPage` and list SQL builders. */
export type AdminEntityListServerContext = {
  readonly db: AdminDrizzleDb
  readonly entities: AdminEntityRegistry
  readonly tables: AdminEntityTablesRegistry
  readonly frontendConfig: AdminEntityListFrontendConfig
  /**
   * Optional extra `WHERE` fragments merged into list queries (e.g. EXISTS subqueries keyed off
   * `syntheticTextScope` relation filters).
   */
  readonly appendListWhere?: (args: {
    readonly db: AdminDrizzleDb
    readonly slug: string
    readonly table: PgTable
    readonly relationFilterValues: Readonly<
      Record<string, AdminRelationFilterApiValue>
    >
    /** Parsed from list URL when the entity defines `listAppendWhereHintFilter(s)`. */
    readonly appendListWhereHints?: Readonly<Record<string, string>>
    /**
     * Active inclusive date ranges from the list URL (`listDateRangeFilter` / `listDateRangeFilters`).
     * Entries whose `columnKey` has no physical column on the main table are only meaningful inside
     * this hook (e.g. EXISTS on a related payment header).
     */
    readonly dateRangeFilters?: readonly {
      readonly columnKey: string
      readonly from: string
      readonly to: string
    }[]
  }) => SQL | undefined
}

/**
 * Opaque Drizzle transaction handle from `db.transaction`. Apps cast to their driver’s tx type
 * inside `apply*ExtrasInTransaction` hooks.
 */
export type AdminEntityDbTransaction = unknown

/** Passed into CRUD query helpers (`completeAdminEntityCreate`, etc.). */
export type AdminEntityQueryServerContext = {
  readonly db: AdminDrizzleDb
  readonly entities: AdminEntityRegistry
  readonly tables: AdminEntityTablesRegistry
  /**
   * After the parent row is inserted (and junction sync, if any), apply `extras` from POST
   * (e.g. atomic child rows). Runs inside the same transaction when `completeAdminEntityCreateWithMaybeExtras` is used.
   */
  readonly applyCreateExtrasInTransaction?: (args: {
    readonly ctx: AdminEntityQueryServerContext
    readonly tx: AdminEntityDbTransaction
    readonly slug: string
    readonly insertedParentRow: Record<string, unknown>
    readonly extras: Record<string, unknown>
  }) => Promise<void>
  /**
   * After the parent row is updated (and junction sync, if any), apply `extras` from PATCH.
   */
  readonly applyPatchExtrasInTransaction?: (args: {
    readonly ctx: AdminEntityQueryServerContext
    readonly tx: AdminEntityDbTransaction
    readonly slug: string
    readonly idParam: string
    readonly updatedParentRow: Record<string, unknown>
    readonly extras: Record<string, unknown>
  }) => Promise<void | Record<string, unknown>>
  /**
   * After the parent row and `crudRelatedCollections` are loaded for **GET** detail (and PATCH
   * responses that refetch detail), merge extra keys (e.g. junction metadata not modeled as a child
   * entity). Return the same `detail` object extended or replaced.
   */
  readonly mergeAdminEntityDetailForApi?: (args: {
    readonly ctx: AdminEntityQueryServerContext
    readonly slug: string
    readonly idParam: string
    readonly detail: Record<string, unknown>
  }) => Promise<Record<string, unknown>>
  /**
   * Runs inside the same Drizzle transaction as `insertAdminEntityRowTx` (before the INSERT).
   * Use for FK prerequisites (e.g. ensure a parent header row exists before inserting a child).
   */
  readonly beforeInsertAdminEntityRowInTransaction?: (args: {
    readonly ctx: AdminEntityQueryServerContext
    readonly tx: AdminEntityDbTransaction
    readonly slug: string
    readonly values: Record<string, string>
  }) => Promise<void>
}
