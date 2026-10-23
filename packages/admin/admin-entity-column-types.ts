export type AdminValueType =
  | "uuid"
  | "integer"
  | "text"
  | "numeric"
  | "timestamp"
  | "boolean"

/** Horizontal alignment for list table header and body cells. */
export type AdminCellAlign = "left" | "center" | "right"

/**
 * Create/edit CRUD dialog: widget for string-backed columns.
 * Ignored for `listRelation` FK selects and boolean columns. Omitted → single-line `input`.
 */
export type AdminEntityColumnFormControl = "input" | "textarea"

/**
 * List table: LEFT JOIN a related row and embed it as JSON (camelCase keys, PostgREST-style).
 * Sorting on this FK column uses `labelColumnKeys` (concat label) unless `listCellShow` is `storedFk`,
 * in which case ORDER BY / keyset cursors use the main-table FK column. When
 * `orderByRelatedColumnKey` is set, ORDER BY / keyset cursors use that related column instead of the
 * label SQL. The list API selects `_cursor_<columnKey>` for whichever sort expression is active
 * (stripped before JSON response).
 *
 * `relatedEntitySlug` must match a key in `adminEntities` / `adminEntityTables`.
 */
export type AdminEntityColumnListRelation = {
  readonly relatedEntitySlug: string
  /** Nested object on each list row (e.g. `cardTypes`). Must not collide with a column `key`. */
  readonly embedJsonKey: string
  /** Related-row `columns[].key` values; joined with ` · ` for list sort + admin cell label. */
  readonly labelColumnKeys: readonly string[]
  /**
   * List cell display for this FK column. Default `relatedLabel`: {@link labelColumnKeys} from the embed.
   * `storedFk`: show the main-table FK value (e.g. TIN) while the embed is still loaded for filters/CRUD.
   */
  readonly listCellShow?: "relatedLabel" | "storedFk"
  /**
   * Optional related-row column key to sort by instead of the concatenated relation label.
   * Use when the related table exposes a dedicated display order column.
   */
  readonly orderByRelatedColumnKey?: string
  /**
   * Main CRUD dialog only: fetch FK options from the related list API scoped by this **parent form**
   * field's current value (e.g. customer code). The related entity must define {@link AdminEntityDefinition.listRelationFilters}
   * whose `columnKey` matches {@link crudRelationFilterRelatedColumnKey} (or this form column key when omitted).
   */
  readonly crudRelationFilterFromFormColumnKey?: string
  /**
   * When {@link crudRelationFilterFromFormColumnKey} is set, equality filter key on the **related**
   * entity's `listRelationFilters` (defaults to the same string as the parent form column key).
   */
  readonly crudRelationFilterRelatedColumnKey?: string
  /**
   * Main CRUD create/edit: **`asyncSearch`** loads options via debounced server `search`. When the
   * control receives non-empty **`relationFilterSelections`** (e.g. parent-scoped related lists), the
   * same query also runs with an empty search so the first page can **prefetch** before the user
   * types. **`preloadedSearch`** pre-fetches all options (same as the default `select`) but renders
   * the same searchable combobox UI as `asyncSearch` with client-side filtering — ideal for long
   * lists where the full set is known upfront. Omit → classic **Select** from relation option prefetch.
   */
  readonly crudFormUiVariant?: "select" | "asyncSearch" | "preloadedSearch"
  /** Related list `limit` for `crudFormUiVariant: "asyncSearch"` (clamped to admin list max). */
  readonly crudAsyncSearchFetchLimit?: number
  /** Optional helper line under the field (always shown when non-empty). */
  readonly crudAsyncSearchMatchesHint?: string
  /**
   * When **`true`**, show the helper line above the async combobox (derived from related `listSearch`
   * labels, or generic "results load…" when none). Omit or **`false`** — no line unless
   * {@link crudAsyncSearchMatchesHint} is set.
   */
  readonly crudAsyncSearchShowMatchesHint?: boolean
  /**
   * When true, the closed combobox and each search result show **`{storedId} - {label}`** (label from
   * {@link labelColumnKeys}) instead of the label alone.
   */
  readonly crudAsyncSearchCompoundIdAndLabel?: boolean
  /**
   * **`crudFormUiVariant: "select"`** (default): when true, the closed **`Select`** trigger shows only
   * the stored FK id (e.g. DR#); dropdown items still use {@link labelColumnKeys} for full labels.
   */
  readonly crudSelectTriggerShowIdOnly?: boolean
  /**
   * Inline related-table cell select: label shown when the FK value is null/empty.
   * Defaults to `"Select…"` when omitted.
   */
  readonly crudSelectEmptyLabel?: string
  /**
   * Inline related-table cell: **`Popover`** multi-select; each chosen related list row becomes its own
   * line (current empty line takes the first pick; further picks append rows). Uses the same scoped
   * relation option fetch as **`Select`** (avoids **`Select`** portal positioning issues inside dialogs).
   */
  readonly crudInlineRelationMultiSelectAppendRows?: boolean
  /**
   * With {@link crudInlineRelationMultiSelectAppendRows}: related-row keys shown as table-style cells
   * (first key emphasized). Defaults to {@link labelColumnKeys} when omitted.
   */
  readonly crudInlineMultiSelectRowColumnKeys?: readonly string[]
  /**
   * After an inline related-row FK changes, `GET` the related row and assign the JSON object to
   * this key on the line (e.g. `inventory` when `itemCode` points at `inventories`).
   */
  readonly crudInlineCopyDetailEmbedToLineKey?: string
  /**
   * Async search popover: when **`true`**, show the "type to query the server…" empty state.
   * Omit or **`false`** — empty search shows no hint (default).
   */
  readonly asyncSearchShowEmptyQueryHint?: boolean
  /**
   * Async search: footer control to open the **related** entity's create dialog prefilled from the
   * current search text when there is no exact id match (including "substring" server hits like
   * `hbpt5068` vs typed `hbpt506`). Requires the app shell to wrap admin with
   * **`AdminNestedEntityCrudProvider`** (see `@repo/admin/components/admin/admin-nested-entity-crud`).
   */
  readonly crudAsyncSearchCreateRelated?: {
    /**
     * Related entity `columns[].key` values to set from the trimmed search string (same text for each).
     * Example: `["itemCode"]` for inventories whose PK is item code.
     */
    readonly seedColumnKeysFromSearchText: readonly string[]
    /** Fixed seed values to pre-fill in the create dialog. Example: `{ entityCategoryId: "1" }`. */
    readonly seedFixedValues?: Record<string, string>
    /** Footer button label. Default: "New …" using the related entity's `ui.singular`. */
    readonly buttonLabel?: string
    /**
     * When **`true`**, the create button is never disabled due to an exact search-text match
     * against an existing row (e.g. same name already exists but duplicates are intentionally
     * allowed). Default `false` — existing-match disables the button.
     */
    readonly allowCreateOnExactMatch?: boolean
    /**
     * Optional async intercept called before opening the nested create dialog. If it returns
     * `{ existingId }`, the control selects that existing record directly (same as picking from
     * the dropdown) and skips the dialog entirely. Return `null` to proceed with the dialog.
     *
     * Use case: the option list is customer-scoped, so a globally-existing item won't appear in
     * the dropdown — but attempting to create it would hit a PK-duplicate error. This callback
     * can fetch the global list and resolve the existing id instead.
     *
     * **RSC:** not serializable when the entity is passed from a Server Component (e.g.
     * `AdminEntityPageShell`). Those props are stripped; the client registry's
     * `adminEntities[slug]` restores the full definition at runtime.
     */
    readonly onBeforeCreate?: (args: {
      searchText: string
    }) => Promise<{ existingId: string } | null>
  }
  /**
   * When **`true`**, `fetchAdminEntityRelationFilterOptions` will paginate through all pages instead of
   * stopping at the first page (max 100). Use for `preloadedSearch` relations where the full option set
   * may exceed 100 records (e.g. customer-scoped inventory items).
   */
  readonly crudRelationPreloadAllPages?: boolean
  /**
   * When **`crudFormUiVariant` is `preloadedSearch`**, merged into the related list `GET` as
   * `appendWhereHints` (same as list toolbar append-where params). Empty / omit → unscoped preload.
   */
  readonly crudRelationPreloadAppendWhereHints?: Readonly<Record<string, string>>
  /**
   * Optional page `limit` for **`fetchAdminEntityRelationFilterOptions`** when preloading this relation
   * (capped at **500** server-side for safety). Omit → default admin list max page size (100).
   */
  readonly crudRelationPreloadFetchLimit?: number
}

/**
 * List many-to-many: junction row links parent ↔ related; display is aggregated labels from the related table.
 * Mutually exclusive with `listRelation` on the same column.
 *
 * Implemented as a correlated subquery + `json_agg` of junction + nested related row
 * (see `admin-entity-embed-sql.ts`). The listing column is often `listVirtual: true`.
 */
export type AdminEntityColumnListManyRelation = {
  readonly junctionEntitySlug: string
  /** Junction FK → parent row (e.g. `cardId` when listing `cards`). */
  readonly junctionParentFkColumnKey: string
  /** Junction FK → related row (e.g. `tagId`); nested object uses `relatedEntitySlug` columns. */
  readonly junctionRelatedFkColumnKey: string
  readonly relatedEntitySlug: string
  /** Array on each list row (e.g. `cardTags`). Must not collide with a column `key`. */
  readonly embedJsonKey: string
  /** Key for the nested related object on each junction element (e.g. `relatedTags` on cards — must not match a column `key`). */
  readonly embedRelatedJsonKey: string
  /** Related-row keys; joined with ` · ` for the admin list cell label. */
  readonly labelColumnKeys: readonly string[]
  /**
   * Related-entity column keys for `ORDER BY` inside `string_agg` (stable ordering).
   * Defaults to `labelColumnKeys` when omitted.
   */
  readonly aggregateOrderByColumnKeys?: readonly string[]
  /** Delimiter between aggregated values; default `", "`. */
  readonly aggregateDelimiter?: string
  /**
   * Create/edit: sync junction rows in the same transaction as the parent row when the junction
   * is a simple parent+related FK pair (auto-detected; opt out with `enabled: false`).
   */
  readonly form?: AdminEntityColumnManyRelationForm
}

/**
 * List-only aggregate: `SUM(child.sumColumnKey)` over rows where `child.childFkColumnKey` equals
 * the parent row's primary key (correlated subquery on list; batch merge on detail / related collections).
 *
 * Use with `listVirtual: true`, `sortable: false`, and omit from `listOrderBy`. Mutually exclusive
 * with `listRelation` / `listManyRelation` on the same column.
 */
export type AdminEntityColumnListChildSumSimple = {
  readonly childEntitySlug: string
  /** FK column on the child table (camelCase Drizzle key) → parent PK. */
  readonly childFkColumnKey: string
  /** Numeric column on the child table to sum. */
  readonly sumColumnKey: string
}

/**
 * Like {@link AdminEntityColumnListChildSumSimple}, but sums
 * `SUM(childIntegerColumnKey * <allowance>)` joined on
 * `payrolls.payroll_id = child.allowancePayrollFkColumnKey`, filtered by
 * `child.childFkColumnKey = parent PK`.
 *
 * - **`allowanceMultSource` omitted or `"payrollAllowance"`** — multiply by joined
 *   `payrolls.allowance`.
 * - **`"coveringPayrollGuardAllowance"`** — join `guards` on `payrolls.guard_id` and multiply by
 *   `guards.allowance` (master guard rate for the payroll row's guard).
 *
 * When **`divideAllowanceByPayrollPeriodDays`** is true, the allowance (payroll or guard) is divided
 * by the joined payroll row's period's **`payroll_periods.days`** before multiplying by the child
 * integer (prorate full-period allowance to a daily rate).
 *
 * Requires registered **`payrolls`** (+ Drizzle table). The guard variant also requires **`guards`**
 * with numeric **`allowance`** and **`payrolls.guard_id`**. Period division requires **`payroll-periods`**
 * in the registry and Drizzle tables.
 */
export type AdminEntityColumnListChildSumIntegerTimesPayrollAllowance = {
  readonly kind: "sumIntegerTimesPayrollAllowance"
  readonly childEntitySlug: string
  readonly childFkColumnKey: string
  readonly childIntegerColumnKey: string
  readonly allowancePayrollFkColumnKey: string
  readonly allowanceMultSource?:
    | "payrollAllowance"
    | "coveringPayrollGuardAllowance"
  readonly divideAllowanceByPayrollPeriodDays?: boolean
}

/**
 * Sums `SUM(childIntegerColumnKey * payroll_periods.<periodNumericColumnKey>)` for each child row,
 * joining the **covering** payroll line (`payrolls.payroll_id = child.childFkColumnKey`) to its period.
 * Use for amounts that scale with OT days and a per-period rate stored on **`payroll-periods`**
 * (e.g. per-day replacement allowance), distinct from prorated payroll/guard allowance.
 */
export type AdminEntityColumnListChildSumIntegerTimesPayrollPeriodNumeric = {
  readonly kind: "sumIntegerTimesPayrollPeriodNumeric"
  readonly childEntitySlug: string
  readonly childFkColumnKey: string
  readonly childIntegerColumnKey: string
  /** Drizzle / entity column key on **`payroll-periods`** (e.g. `perDayAllowance`). */
  readonly periodNumericColumnKey: string
}

/**
 * Like {@link AdminEntityColumnListChildSumSimple}, but joins a second table
 * (`joinEntitySlug`) via `child.childJoinFkColumnKey = joinTable.joinPkColumnKey`
 * and filters by `joinTable.<joinFilterColumnKey> = filterValue` before summing.
 *
 * Use when the sum must be scoped to a subset of child rows identified by a
 * column on a joined table (e.g. sum qty for child items whose inventory class = 'A').
 */
export type AdminEntityColumnListChildSumWithJoinFilter = {
  readonly kind: "sumChildWithJoinFilter"
  readonly childEntitySlug: string
  readonly childFkColumnKey: string
  readonly sumColumnKey: string
  /** Entity slug of the table to INNER JOIN onto the child. */
  readonly joinEntitySlug: string
  /** FK column key on the child table that references the joined table's PK. */
  readonly childJoinFkColumnKey: string
  /** PK column key on the joined table. */
  readonly joinPkColumnKey: string
  /** Column key on the joined table to filter by. */
  readonly joinFilterColumnKey: string
  /** Literal value to match against `joinFilterColumnKey`. */
  readonly filterValue: string
}

/**
 * Sums `SUM(leftColumnKey * rightColumnKey)` on the child table, filtered by `childFkColumnKey = parent PK`.
 * Both columns must be numeric. Use for monetary totals (e.g. qty × price).
 */
export type AdminEntityColumnListChildSumProductOfTwoColumns = {
  readonly kind: "sumProductOfTwoColumns"
  readonly childEntitySlug: string
  readonly childFkColumnKey: string
  /** First factor column key on the child table (camelCase Drizzle key). */
  readonly leftColumnKey: string
  /** Second factor column key on the child table (camelCase Drizzle key). */
  readonly rightColumnKey: string
}

export type AdminEntityColumnListChildSum =
  | AdminEntityColumnListChildSumSimple
  | AdminEntityColumnListChildSumIntegerTimesPayrollAllowance
  | AdminEntityColumnListChildSumIntegerTimesPayrollPeriodNumeric
  | AdminEntityColumnListChildSumWithJoinFilter
  | AdminEntityColumnListChildSumProductOfTwoColumns

export function adminEntityListChildSumIsProductOfTwoColumns(
  spec: AdminEntityColumnListChildSum,
): spec is AdminEntityColumnListChildSumProductOfTwoColumns {
  return (
    (spec as AdminEntityColumnListChildSumProductOfTwoColumns).kind ===
    "sumProductOfTwoColumns"
  )
}

export function adminEntityListChildSumIsIntegerTimesPayrollAllowance(
  spec: AdminEntityColumnListChildSum,
): spec is AdminEntityColumnListChildSumIntegerTimesPayrollAllowance {
  return (
    (spec as AdminEntityColumnListChildSumIntegerTimesPayrollAllowance).kind ===
    "sumIntegerTimesPayrollAllowance"
  )
}

export function adminEntityListChildSumIsIntegerTimesPayrollPeriodNumeric(
  spec: AdminEntityColumnListChildSum,
): spec is AdminEntityColumnListChildSumIntegerTimesPayrollPeriodNumeric {
  return (
    (spec as AdminEntityColumnListChildSumIntegerTimesPayrollPeriodNumeric)
      .kind === "sumIntegerTimesPayrollPeriodNumeric"
  )
}

export function adminEntityListChildSumIsWithJoinFilter(
  spec: AdminEntityColumnListChildSum,
): spec is AdminEntityColumnListChildSumWithJoinFilter {
  return (
    (spec as AdminEntityColumnListChildSumWithJoinFilter).kind ===
    "sumChildWithJoinFilter"
  )
}

/**
 * Optional create/edit UI for a `listManyRelation` column (checkbox group by default).
 * Eligibility is automatic when the junction table has exactly two `create: true` columns matching
 * the parent and related FK keys (see `lib/admin/admin-entity-many-relation-form.ts`).
 */
export type AdminEntityColumnManyRelationForm = {
  /**
   * When false, never show the control.
   * When **omitted**, the junction must be a strict two-FK create pair (no other required create columns).
   * When **true**, a relaxed rule applies: only the parent and related FK columns are required on create;
   * any other `create: true` junction columns must be optional (`optionalOnCreate: true`).
   */
  readonly enabled?: boolean
  /**
   * JSON body key for an array of related primary keys (`tagIds`, etc.).
   * Default: derived from `junctionRelatedFkColumnKey` (`tagId` → `tagIds`).
   */
  readonly relationIdsBodyKey?: string
  /**
   * Form grid span on sm+ (1–12 of the admin CRUD template). Use **6** to share a row with
   * another **6**-span field (same pattern as paired FK selects).
   */
  readonly formGridSpan?: number
}

/** Column metadata for admin UI, request parsing, and list ordering. */
export type AdminEntityColumn = {
  key: string
  sqlName: string
  label: string
  valueType: AdminValueType
  /** Human-readable SQL type for admin page copy */
  docSqlType?: string
  /**
   * List table header, delete label, and other non-form surfaces use the column `label`.
   * When set, create/edit (and inline CRUD) use this for visible field labels and control `aria-label`s.
   */
  formLabel?: string
  /**
   * When this column backs a {@link AdminEntityDefinition.listRelationFilters} row, use this for the
   * filter control label instead of `label` (e.g. FK stores TIN but options show customer names).
   */
  relationFilterLabel?: string
  list: boolean
  /**
   * When true with `list: true`, the column is included in list API rows and `listColumnOrder`
   * (if set) must **omit** this key — it does not render as its own table column (e.g. helper
   * flags composed into another cell via {@link listCellAffixWhenTrue}).
   */
  listSuppressedFromTable?: boolean
  create: boolean
  patch: boolean
  sortable: boolean
  /**
   * When true, list **ORDER BY** and cursor predicates use **`(column)::bigint`** so text/citext
   * values that hold numeric identifiers sort numerically (e.g. delivery receipt numbers).
   */
  listSortAsNumeric?: boolean
  monospace?: boolean
  /**
   * List-only: not a column on the main Drizzle table (e.g. aggregated M2M labels).
   * Must not be used in `listOrderBy` or as a server sort key.
   */
  listVirtual?: boolean
  /**
   * When set, list SELECT embeds the related row as JSON (`embedJsonKey`) via LEFT JOIN.
   * Also drives the **Select** for this column in the main CRUD dialog and in
   * `crudRelatedCollections` inline row editors (options from the related entity list API).
   */
  listRelation?: AdminEntityColumnListRelation
  /**
   * Renders a second, smaller/muted line inside **this** list cell, sourced from another relation
   * column's embed. Use on a `listRelation` cell (e.g. customer name) to show a related detail
   * underneath (e.g. invoice / alternate-billing name). `sourceColumnKey` must reference a column
   * that has `listRelation`; its embed is kept in the list response even when that source column is
   * `list: false`. The secondary text joins `labelColumnKeys` from the source embed with `separator`
   * (default ` · `), skipping empty values; the line is omitted entirely when the result is empty.
   * Shared by the desktop table and the mobile card (same cell renderer).
   */
  listCellSecondaryFromRelation?: {
    readonly sourceColumnKey: string
    readonly labelColumnKeys: readonly string[]
    readonly separator?: string
  }
  /** When set, list SELECT adds `embedJsonKey` (JSON array of junction + nested related row). */
  listManyRelation?: AdminEntityColumnListManyRelation
  /** When set, list SELECT adds this column as a correlated `SUM` over the child table. */
  listChildSum?: AdminEntityColumnListChildSum
  /**
   * List-only computed label: `yearColumnKey::text || '-' || lpad(month::text, 2, '0')`.
   * Use with `listVirtual: true`, `list: true`, `sortable: false`, `create: false`, `patch: false`.
   * The referenced year/month columns should stay in the row for filters and CRUD (often `list: false`
   * on those two if replaced by this column in `listColumnOrder`).
   */
  listYearMonthPair?: {
    readonly yearColumnKey: string
    readonly monthColumnKey: string
  }
  /**
   * Philippine-style **12% VAT included in gross**: list-only numeric derived from a stored gross column.
   * Use with `listVirtual: true`, `valueType: "numeric"`, `create: false`, `patch: false`, `sortable: false`.
   * **Net** = gross ÷ 1.12; **VAT** = gross − net (≈ 12% of net).
   */
  listVirtualVat12InclusiveSplit?: {
    readonly grossColumnKey: string
    readonly component: "net" | "vat"
  }
  /**
   * List-only: text built from another column's {@link listRelation} embed (`labelColumnKeys` on the related row).
   * Use with `listVirtual: true`; `sourceColumnKey` must reference a column that has `listRelation`.
   * Each label key is formatted like that field's list cell on the **related** entity (dates with
   * `dateStringFormControl: "calendar"`, currency numerics, etc.) when the admin client supplies the registry.
   */
  listVirtualRelationLabel?: {
    readonly sourceColumnKey: string
    readonly labelColumnKeys: readonly string[]
  }
  /**
   * List query **ORDER BY** only: use a physical column on the related row already **LEFT JOIN**ed via
   * **`sourceColumnKey`**'s {@link listRelation}. Does not add a SELECT alias (sort expressions only).
   * Use with `listVirtual: true`, `list: false`, `sortable: true`, `create: false`, `patch: false`.
   * Mutually exclusive with other list-virtual kinds on the same column (see registry validation).
   */
  listVirtualOrderByRelatedColumn?: {
    readonly sourceColumnKey: string
    readonly relatedColumnKey: string
  }
  /**
   * List-only numeric: **`coalesce(left,0) × coalesce(right,0)`** from two physical columns on the same row.
   * Use with `listVirtual: true`, `valueType: "numeric"`, `create: false`, `patch: false`, `sortable: false`.
   * Both referenced columns must exist on the main table (need not be `list: true`).
   */
  listVirtualProductOfTwo?: {
    readonly leftColumnKey: string
    readonly rightColumnKey: string
  }
  /**
   * List-only numeric: **`coalesce(base,0) − Σ coalesce(subtract_i,0)`** from physical columns.
   * Use with `listVirtual: true`, `valueType: "numeric"`, `create: false`, `patch: false`, `sortable: false`.
   * Mutually exclusive with `listVirtualRelationLabel`, `listVirtualVat12InclusiveSplit`, and
   * `listYearMonthPair` (when that pair is active for the same column).
   */
  listVirtualSubtractFromBase?: {
    readonly baseColumnKey: string
    readonly subtractColumnKeys: readonly string[]
  }
  /**
   * List-only numeric: correlated **Σ linked sale net** − **`subtractMainColumnKey`** on the main row,
   * where each net is **`gross − discount − returns_allowed − taxes`** on **`relatedEntitySlug`**, summed
   * over **`junctionEntitySlug`** rows with **`junctionParentFkColumnKey`** = main PK.
   */
  listVirtualJunctionLinkedNetMinusMainColumn?: {
    readonly junctionEntitySlug: string
    readonly junctionParentFkColumnKey: string
    readonly junctionRelatedFkColumnKey: string
    readonly relatedEntitySlug: string
    readonly relatedPkColumnKey: string
    readonly grossColumnKey: string
    readonly discountColumnKey: string
    readonly returnsAllowedColumnKey: string
    readonly taxesColumnKey: string
    readonly subtractMainColumnKey: string
  }
  /**
   * List-only numeric: correlated **Σ linked sale net** (same net line as
   * {@link listVirtualJunctionLinkedNetMinusMainColumn}, without subtracting a main-row column).
   */
  listVirtualJunctionLinkedNetSum?: {
    readonly junctionEntitySlug: string
    readonly junctionParentFkColumnKey: string
    readonly junctionRelatedFkColumnKey: string
    readonly relatedEntitySlug: string
    readonly relatedPkColumnKey: string
    readonly grossColumnKey: string
    readonly discountColumnKey: string
    readonly returnsAllowedColumnKey: string
    readonly taxesColumnKey: string
  }
  /**
   * List-only scalar: correlated **`(SELECT … LIMIT 1)`** from **`junctionEntitySlug`** where
   * **`junctionParentFkColumnKey`** equals the main row PK.
   *
   * **Junction only:** set **`junctionSelectColumnKey`** (omit related fields).
   *
   * **Through a related row:** set **`relatedEntitySlug`**, **`junctionRelatedFkColumnKey`** (junction
   * column equal to the related entity's PK), and **`relatedPickColumnKey`**.
   *
   * Use with `listVirtual: true`, `create: false`, `patch: false`, `sortable: false`.
   * Mutually exclusive with other list-virtual kinds on the same column (see registry validation).
   */
  listVirtualJunctionScalarPick?: {
    readonly junctionEntitySlug: string
    readonly junctionParentFkColumnKey: string
    readonly junctionSelectColumnKey?: string
    readonly relatedEntitySlug?: string
    readonly junctionRelatedFkColumnKey?: string
    readonly relatedPickColumnKey?: string
  }
  /**
   * List-only boolean: **true** when a row exists in `existsTableFqn` where `existsDateColumnName`
   * equals the main row's `mainDateColumnKey` (same calendar date as `sales.sales_date`).
   * Use with `listVirtual: true`, `valueType: "boolean"`, `create: false`, `patch: false`, `sortable: false`.
   * `existsTableFqn` must be a safe schema-qualified identifier (e.g. `vibram_sales.verified_dates`).
   */
  listVirtualDateExistsInTable?: {
    readonly mainDateColumnKey: string
    readonly existsTableFqn: string
    readonly existsDateColumnName: string
  }
  /**
   * List-only integer: **`round((extract(epoch from end) − extract(epoch from start)) / 86400)`**
   * when both timestamps are non-null; otherwise **null**. Matches typical **"whole days between
   * instants"** UI (e.g. sale average → check average).
   * Use with `listVirtual: true`, `valueType: "integer"`, `create: false`, `patch: false`, `sortable: false`.
   */
  listVirtualRoundedDayDiffTimestamps?: {
    readonly endTimestampColumnKey: string
    readonly startTimestampColumnKey: string
  }
  /**
   * List-only integer: when **`maturityDateColumnKey`** (Postgres `date` as `YYYY-MM-DD`) is strictly
   * **after** today's calendar date in **`Asia/Manila`**, returns **`maturity::date − that Manila date`**
   * (signed whole days); otherwise **null**. **`crNumberColumnKey`** / payment qualified name + column
   * names are still required for validation and embed paths (join keys to `payments`).
   * Use with `listVirtual: true`, `valueType: "integer"`, `create: false`, `patch: false`, `sortable: false`.
   * Identifier strings are interpolated as raw SQL fragments and must match **`^[a-z_][a-z0-9_]*$`**
   * (columns) or **`^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$`** (`paymentsQualifiedName`).
   */
  listVirtualPostdatedDaysUntilMaturity?: {
    readonly maturityDateColumnKey: string
    readonly crNumberColumnKey: string
    readonly paymentsQualifiedName: string
    readonly paymentsCollectionDateColumnName: string
    readonly paymentsCrNumberColumnName: string
  }
  /**
   * List-only numeric: **`(SELECT coalesce(sum(child_col), 0) FROM child_table WHERE child_fk = parent_pk)`**.
   * Generates a correlated subquery summing one column of a child table grouped by the parent FK.
   * Use with `listVirtual: true`, `valueType: "numeric"`, `create: false`, `patch: false`, `sortable: false`.
   */
  listVirtualChildColumnSum?: {
    /** Slug of the child entity (must be in `adminEntityTables`). */
    readonly childEntitySlug: string
    /** Column key on the child entity that holds the parent FK. */
    readonly childParentFkColumnKey: string
    /** Column key on the child entity whose values are summed. */
    readonly childSumColumnKey: string
  }
  /**
   * List-only text: **`NULLIF(array_to_string(array_remove(ARRAY[…]::text[], NULL), separator), '')`**
   * — joins non-null values from `columnKeys` with `separator`; returns null when all are null/empty.
   * Use with `listVirtual: true`, `valueType: "text"`, `create: false`, `patch: false`, `sortable: false`.
   */
  listVirtualConcatNonNull?: {
    readonly columnKeys: readonly string[]
    readonly separator: string
  }
  /**
   * When set with `valueType: "integer"` and `list: true`, list cells use a colored pill and
   * signed day-count labels (`admin-entity-list-day-count-label`).
   * Bands use **`Math.abs(days)`** (green **≤ greenThrough**, orange **orangeFrom–orangeThrough**, red **≥ redFrom**).
   */
  listDayCountBadgeBands?: {
    readonly greenThrough: number
    readonly orangeFrom: number
    readonly orangeThrough: number
    readonly redFrom: number
  }
  /**
   * When set with `valueType: "integer"` and `list: true`, list cells use a colored pill
   * showing the raw integer (no unit suffix). Ascending scale: value **≥ greenFrom** → green,
   * **orangeFrom ≤ value < greenFrom** → orange, **value < orangeFrom** → red.
   * Requires `orangeFrom < greenFrom`.
   */
  listIntegerBadgeBands?: {
    readonly greenFrom: number
    readonly orangeFrom: number
  }
  /**
   * List cell: beside the formatted text for this column, show a small hover tooltip when
   * `sourceColumnKey` is truthy (usually a {@link listSuppressedFromTable} boolean).
   */
  listCellAffixWhenTrue?: {
    readonly sourceColumnKey: string
    readonly tooltip: string
    readonly ariaLabel?: string
  }
  /**
   * List cell: render this cell BLANK (as if its value were empty) when ANY of the named sibling
   * columns on the same row has a non-empty value. Presentational only — the underlying row data is
   * untouched. Use to suppress a fallback figure when a preferred one is present (e.g. panda map
   * results hide the historical sale price/date once a contract or appraised price exists).
   */
  listCellHideWhenSiblingPresentKeys?: readonly string[]
  /**
   * List cell: when true, renders a green `CircleCheck` icon when the value is truthy; renders
   * blank (empty) when falsy. No `X` icon for false — use this for optional positive flags
   * (e.g. isCashOffer, noConditions) where absence should not draw attention.
   */
  listBooleanCircleCheckWhenTrue?: boolean
  /**
   * List cell: clicking opens the **edit** CRUD dialog for another admin entity (e.g. DR → Sales).
   */
  listCellOpensRelatedAdminEdit?: {
    readonly relatedEntitySlug: string
    /** Main-row column whose value is the related entity's id (e.g. `drNumber` → `sales.dr_number`). */
    readonly relatedRowIdColumnKey: string
    /**
     * Opt-in: when there is **no** related row to open, render this plain muted text instead of a
     * disabled link-button showing `—`. Use it when the empty state has real meaning the user should
     * read (e.g. an uncollected sale → "Not yet collected"), so the cell isn't a dead-looking button.
     * Omit to keep the default disabled-`—` rendering.
     */
    readonly emptyLabel?: string
  }
  /**
   * List table: render the related label (or stored value) as a pill badge.
   * When the value is empty, shows "None" in muted style for semantics.
   * Typically used on `listRelation` FK columns (e.g. status).
   */
  listCellBadge?: true
  /**
   * Narrow (mobile) list card: omit the per-field label (`<dt>`) for this column when section context
   * or value shape is enough (desktop table headers unchanged).
   */
  listMobileCardHideFieldLabel?: boolean
  /**
   * Narrow (mobile) list card: in **`rows`** (and flat) layout, render the label full-width **above**
   * the value instead of in a narrow left column — use when long wrapped values look awkward next to a
   * short label (desktop table headers unchanged).
   */
  listMobileCardLabelStackedAbove?: boolean
  /**
   * Narrow (mobile) list card: do not render this field's row when the row value is null, undefined,
   * or a blank string. If every field in a grouped section is omitted, the whole section (including its heading) is skipped.
   */
  listMobileCardOmitRowWhenEmpty?: boolean
  /**
   * List table: header and cell text alignment. Omitted → center for bool columns (`docSqlType`
   * bool/boolean or `valueType: "boolean"`), **right** for `valueType: "numeric"`, else left.
   */
  cellAlign?: AdminCellAlign
  /**
   * List table (desktop grid): minimum cell width in **px** for this column's `<th>` / `<td>`.
   * Helps keep wide headers or values from shrinking below a usable size when the table stretches.
   */
  listColumnMinWidthPx?: number
  /**
   * List table: maximum cell width in **px**. Use for narrow identifiers (e.g. small integer IDs).
   * When set, header and body cells use ellipsis overflow so long values do not widen the column.
   */
  listColumnMaxWidthPx?: number
  /**
   * List table: max cell width in **px** with **wrapped** text (no ellipsis). Pair with
   * {@link listColumnWrapMaxLines} for multi-line clamp (e.g. dense address columns).
   */
  listColumnWrapMaxWidthPx?: number
  /**
   * When {@link listColumnWrapMaxWidthPx} is set, max lines before clamp (default **2**).
   */
  listColumnWrapMaxLines?: number
  placeholder?: string
  formInputId?: string
  /** Plain text fields only; default `input`. */
  formControl?: AdminEntityColumnFormControl
  inputMode?: "text" | "decimal" | "numeric" | "search" | "email" | "tel" | "url"
  /**
   * When set on `valueType: "numeric"`, the list shows `"{symbol} #,##0.00"` (en-US grouping).
   * Create/edit uses a left symbol addon and a text field: plain digits + one `.` while focused;
   * blurred display matches the same `#,##0.00` grouping as the list (stored/API value stays ungrouped).
   */
  currencySymbol?: string
  /**
   * When set with `currencySymbol`, list cells, blurred currency fields, and related inline currency
   * inputs allow a single leading `-` (signed amounts). Omitted → unsigned decimal only (minus stripped).
   */
  currencyAmountAllowLeadingMinus?: boolean
  /**
   * When set on plain `valueType: "numeric"` (no `currencySymbol`), create/edit and related-row
   * editors allow a single leading `-` (e.g. signed counts / deltas). Omitted → unsigned decimal only.
   */
  numericInputAllowLeadingMinus?: boolean
  /**
   * When set on `valueType: "integer"` (plain integer fields, not FK selects), create/edit and
   * related-row editors allow a single leading `-`. Omitted → digits only.
   */
  integerInputAllowLeadingMinus?: boolean
  /**
   * When set on `valueType: "integer"` without `listRelation`, related inline (and create/edit)
   * editors allow comma-separated unsigned integers (e.g. `37, 5, 23`) so a post-process can split
   * one draft into multiple lines. Incompatible with `integerInputAllowLeadingMinus` and with
   * `integerFormOptions` (select controls).
   */
  integerInputAllowCommaSeparatedQuantities?: boolean
  /**
   * When set on `valueType: "integer"` without `listRelation`, create/edit (and related inline
   * editors) use a **Select** instead of a numeric text field. Form state stays stringified
   * integers (e.g. `"3"`). Ignored when `integerInputAllowLeadingMinus` is set (incompatible).
   */
  integerFormOptions?: readonly {
    readonly value: number
    readonly label: string
  }[]
  /**
   * When set on `valueType: "text"` without `listRelation`, create/edit (and related inline
   * editors) use a **Select**. Values must match one of the option `value` strings (validated on
   * create/patch in `admin-api`).
   */
  textFormOptions?: readonly {
    readonly value: string
    readonly label: string
  }[]
  /**
   * When `valueType` is `timestamp`, list cells (and the delete-confirm label when this column is
   * `deleteLabelColumnKey`) use the **UTC** calendar date of the parsed instant:
   * - **`date-us`** — like the default calendar button (**`Mar 1, 2026`**).
   * - **`date-dmy`** — **`DD/MM/YYYY`** (e.g. **`27/11/2015`**).
   * Omitted → pass-through string from the API (often ISO-8601).
   */
  timestampListDisplay?: "date-us" | "date-dmy" | "datetime-us"
  /**
   * When `valueType` is `timestamp`, use a **Popover + Calendar** in create/edit instead of a
   * plain text field. Selected days are sent as **UTC midnight** ISO strings (see
   * `adminEntityTimestampCalendarSelectionToUtcIso`).
   */
  timestampFormControl?: "calendar"
  /**
   * When `valueType` is **`text`** and the column stores a Postgres **`date`** as **`YYYY-MM-DD`**, use
   * Popover + Calendar in create/edit (same local-day selection semantics as the timestamp calendar).
   *
   * **`yearMonthEnd`** — month + year selects only; stored value must be the **last calendar day** of that
   * month (validated on POST).
   */
  dateStringFormControl?: "calendar" | "yearMonthEnd" | "textInput"
  inputClassName?: string
  /** Create: empty value is allowed and the field is omitted from the insert body */
  optionalOnCreate?: boolean
  /** PATCH: empty string clears nullable DB columns (stored as SQL NULL) */
  patchEmptyClears?: boolean
  /** Inline related table: convert the text value to uppercase when the input is blurred. */
  textUppercaseOnBlur?: boolean
  /** Create/edit CRUD dialog: convert the text value to uppercase in real-time as the user types (onChange). */
  textUppercaseOnChange?: boolean
  /**
   * Create/edit dialog: how many of the 12 grid tracks this field occupies when the viewport is at
   * least **`ADMIN_ENTITY_CRUD_FORM_GRID_BREAKPOINT_MIN_PX`** (Tailwind **`sm`**), packed into
   * `grid-template-areas` (see `buildAdminEntityCrudFormGridLayout`). Narrower viewports stack one
   * field per row. Omitted → full width (12). Integers 1–12; out-of-range values are clamped in the UI.
   */
  formGridSpan?: number
  /**
   * Not a DB column: shown only in create/edit form. Omitted from server POST/PATCH column parsing
   * and from client-built JSON bodies (same filtering pattern as `listVirtual`).
   */
  crudFormVirtual?: boolean
  /**
   * Create/edit: render a read-only control; the field value is still sent when the column is a
   * real table field (`patch` / `create`).
   */
  formControlReadOnly?: boolean
  /**
   * **Edit dialog only:** show this column as read-only when **`patch: false`** (e.g. natural PK).
   * Omitted from client PATCH bodies and from server update payloads; **`PATCH` must not** include
   * this key (same as other non-patchable columns).
   */
  crudEditReadOnly?: boolean
  /**
   * When `crudFormVirtual` is set, selects an app-registered renderer via
   * `AdminClientRegistryValue.renderCrudFormComputedField` (string id per product).
   */
  formComputedDisplay?: string
  /**
   * When set, this field is hidden in **both create and edit** forms when the function returns `true`.
   * Hidden fields are excluded from the grid layout and not rendered (not mounted in TanStack Form).
   * Use for fields that are only relevant under certain form conditions (e.g. an FK that only applies
   * to a specific category value).
   *
   * **Do not use** when the entity definition is passed from a React Server Component into a Client
   * Component (e.g. `AdminEntityPageShell`): functions are not serializable. Prefer
   * {@link AdminEntityColumn.crudFormVisibleOnlyWhen} instead.
   */
  formHiddenWhen?: (formValues: Record<string, string>) => boolean
  /**
   * When set, the CRUD form **only** shows this column when
   * `String(formValues[columnKey] ?? "") === equals` (plain string compare).
   * Serializable alternative to {@link AdminEntityColumn.formHiddenWhen} for RSC → client props.
   */
  crudFormVisibleOnlyWhen?: { readonly columnKey: string; readonly equals: string }
  /**
   * When set, list table cells render the field value as a tappable link using the given URI scheme.
   * - `"tel"` → `<a href="tel:…">` — triggers the OS dialler on mobile / desktop
   * - `"mailto"` → `<a href="mailto:…">` — opens the default mail client
   * Only rendered when the cell value is a non-empty string; empty cells stay blank.
   */
  listCellLinkType?: "tel" | "mailto"
  /**
   * List table: render the cell value (an image URL string) as a small square thumbnail instead of the
   * raw URL text. Empty / broken values fall back to a muted "—". Keeps the column narrow and scannable.
   * Opt-in per column — the shared renderer's default for `text` columns is unchanged.
   */
  listCellImage?: {
    /** Row column key whose value becomes the `<img alt>` (e.g. the entity name). Omit → empty alt. */
    readonly altColumnKey?: string
  }
  /**
   * List table: when the cell value is a JSON array of strings (e.g. a `jsonb` notes column typed as
   * `text`), render each entry as a bulleted line instead of the raw `["…","…"]` JSON. Pair with
   * {@link listColumnWrapMaxWidthPx} / {@link listColumnWrapMaxLines} to cap the column width and clamp
   * lines. Non-array values fall through to the normal text rendering. Opt-in per column.
   */
  listCellJsonStringList?: true
}
