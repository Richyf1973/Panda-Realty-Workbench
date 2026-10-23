/**
 * Layout for one {@link AdminEntityListMobileCardSpec.groups} section (body fields only).
 *
 * - **`rows`** — label left, value right (same as the default flat card).
 * - **`grid2`** — two columns of stacked label + value (denser block, e.g. item + unit + qty).
 */
export type AdminEntityListMobileCardGroupLayout =
  | "rows"
  | "grid2"
  | "collectionSummary"

/**
 * Semantic grouping for mobile list cards. **`titleColumnKey` is rendered separately** and must
 * not appear in any group's `columnKeys`.
 */
export type AdminEntityListMobileCardGroupSpec = {
  /** Optional section label above the group. */
  readonly heading?: string
  /**
   * List columns in this section. Omit or use **`[]`** when {@link mobileCollectionSummary} is set.
   */
  readonly columnKeys?: readonly string[]
  /** Omit → **`rows`**. */
  readonly layout?: AdminEntityListMobileCardGroupLayout
  /**
   * **`layout: "rows"`** only: show **`{formattedQty} {unit}`** (e.g. `460.00 PRS`) above the group's
   * rows. Registers **`qtyColumnKey`** / **`unitColumnKey`** so they must not appear in another group's
   * `columnKeys`.
   */
  readonly mobileQtyUnitLine?: {
    readonly qtyColumnKey: string
    readonly unitColumnKey: string
    /**
     * When the unit column is `AdminEntityColumn.listVirtualRelationLabel` only, list rows may
     * omit a top-level JSON key; read the unit from the related embed instead (camelCase keys).
     */
    readonly unitFromRelatedEmbed?: {
      readonly embedJsonKey: string
      readonly relatedFieldKey: string
    }
  }
  /**
   * **`layout: "rows"`** only: per-card switch between per-unit amounts and **line totals** (each
   * listed column × qty). Requires {@link mobileQtyUnitLine} on the same group. Every key must
   * appear in this group's `columnKeys`.
   */
  readonly mobileLineTotalsToggleForColumnKeys?: readonly string[]
  /**
   * When set, this group renders collection state: if both picked values are empty, a single
   * **uncollected** line; otherwise **CR** and **date** rows using the same list cells as the table.
   * Do not list {@link crColumnKey} / {@link dateColumnKey} in other groups.
   */
  readonly mobileCollectionSummary?: {
    readonly crColumnKey: string
    readonly dateColumnKey: string
    readonly uncollectedText: string
  }
}

/**
 * Desktop admin list: responsive **grid** of row cards instead of a single table.
 * Optional custom card bodies via the app admin client registry (`renderAdminEntityListGridItemBySlug`
 * keyed by `registryGridItemKey`).
 */
export type AdminEntityListGridSpec = {
  /**
   * Initial layout when the URL has no `listLayout` query param.
   * @default "table"
   */
  readonly defaultMode?: "table" | "grid"
  /**
   * For the **default** grid cell (no registry renderer), how many leading **visible** list columns
   * (left-to-right, excluding the actions column) to stack inside each card.
   * @default 4
   */
  readonly previewColumnCount?: number
  /**
   * Registry key for `renderAdminEntityListGridItemBySlug` (custom card bodies).
   * When set and a renderer exists, it replaces the default stacked preview fields.
   */
  readonly registryGridItemKey?: string
}

/**
 * Mobile / narrow list: {@link AdminEntityDefinition.listMobileCard} selects which list columns
 * appear on each read-only card row.
 *
 * **Flat layout:** set **`columnKeys`** (and optional **`titleColumnKey`**). Omit **`groups`**.
 *
 * **Grouped layout:** set **`groups`** and **`titleColumnKey`**. Each list field to show (except the
 * title) must appear in exactly one group, in display order. **`columnKeys`** may be omitted.
 */
export type AdminEntityListMobileCardSpec = {
  /**
   * List `columns[].key` values, top to bottom. Required when **`groups`** is omitted.
   * When **`groups`** is set, omit or keep in sync with the union of group keys + title.
   */
  readonly columnKeys?: readonly string[]
  /** Prominent first line; required when using **`groups`**; defaults to `columnKeys[0]` when flat. */
  readonly titleColumnKey?: string
  readonly groups?: readonly AdminEntityListMobileCardGroupSpec[]
  /**
   * When true, the card title block shows only the value (no uppercase label above {@link titleColumnKey}).
   */
  readonly hideTitleFieldLabel?: boolean
  /**
   * When true, the title value and an **Open** control call the same handler as list **Edit** (opens the
   * CRUD dialog). Use with {@link AdminEntityDefinition.listHideRowActionsOnMobileCards} when compact
   * viewports are view-only but the dialog should still open for reading.
   */
  readonly titleRowOpensEditDialog?: boolean
}
