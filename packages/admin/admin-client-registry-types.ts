import type { QueryClient } from "@tanstack/react-query"
import type {
  ComponentType,
  CSSProperties,
  Dispatch,
  MutableRefObject,
  ReactNode,
  SetStateAction,
} from "react"

import type { AdminEntityRowActionDescriptor } from "./components/admin/admin-entity-row-action-descriptor"
import type { AdminEntityCrudFormSubscribeApi } from "./admin-entity-crud-form-subscribe-api"
import type { LineRow } from "./admin-entity-crud-related-collections-draft"
import type { AdminEntityPageWidthPreset } from "./admin-entity-page-width-presets"
import type { AdminEntityCrudListRelationFieldOptionsMap } from "./admin-entity-crud-relation-field-options-types"
import type {
  AdminEntityColumn,
  AdminEntityCrudRelatedCollectionTable,
  AdminEntityDefinition,
} from "./admin-entity-types"
import type { AdminRelatedRelationNumericMaps } from "./admin-entity-crud-related-virtual"
import type { AdminEntitySlug } from "./admin-entity-slug-client"
import type { AdminEntityListResponse } from "./admin-entity-list-api"
import type { Table as TanStackTable } from "@tanstack/react-table"
import type { AdminEntityTableRow } from "./admin-entity-admin-types"
import type { AdminNestedEditUiContext } from "./components/admin/admin-entity-crud-dialog-state"

/** Optional block directly above the admin entity list table (scroll region). */
export type AdminRenderAdminEntityListAboveTableArgs = {
  readonly slug: AdminEntitySlug
  readonly listPayload: AdminEntityListResponse | undefined
  readonly isLoading: boolean
  readonly isRefetching: boolean
  readonly isError: boolean
  readonly totalCount: number
  readonly listDateRangeFilterRows: readonly {
    columnKey: string
    label: string
    from: string
    to: string
  }[]
  readonly onListRefetch: () => void
  readonly adminUiMutationsDisabled?: boolean
  /**
   * Same semantics as the list toolbar "Clear filters" affordance: **true** when any list filter
   * (search, boolean segment, append-where hints, year/month, date range, relation filters) narrows rows.
   */
  readonly hasActiveListFilters: boolean
}

export type AdminRenderAdminEntityListAboveTable = (
  args: AdminRenderAdminEntityListAboveTableArgs,
) => ReactNode | null | undefined

/** Optional override for desktop list table column keys (see `useAdminEntityAdmin` `listCols`). */
export type AdminResolveListTableColumnKeysArgs = {
  readonly slug: AdminEntitySlug
  readonly cfg: AdminEntityDefinition
  readonly listAppendWhereHintSegments: Readonly<Record<string, string>>
  /** Debounced search string used for the list GET (empty when list search disabled). */
  readonly listSearchDebounced: string
  readonly relationFilterSelections: Readonly<Record<string, string>>
  readonly listLayoutMode: "table" | "grid"
  /** True when the compact admin list viewport is active (mobile cards / tight chrome). */
  readonly isCompactListViewport: boolean
  /** Current boolean filter segment (`"true"` = favourites on, `"false"` = non-favourites, `"all"` = unfiltered). */
  readonly listBooleanFilterSegment: "all" | "true" | "false"
}

/**
 * Return a non-empty key order to replace default `listColumnOrder` list columns for the **table**
 * layout. Return `undefined` / `null` to keep {@link adminEntityListColumnsInOrder} behavior.
 * Implementations should return `undefined` when {@link AdminResolveListTableColumnKeysArgs.isCompactListViewport}
 * is true or {@link AdminResolveListTableColumnKeysArgs.listLayoutMode} is `"grid"` unless the app
 * intentionally wants those modes to share the override.
 */
export type AdminResolveListTableColumnKeys = (
  args: AdminResolveListTableColumnKeysArgs,
) => readonly string[] | null | undefined

/**
 * Optional predicate that decides whether the quick desktop cards layout is active.
 * When provided, replaces the default `hasQuickColumnKeys` check for `listQuickDesktopCards`.
 * Use this when `resolveListTableColumnKeys` returns custom columns for non-quick-card modes
 * (e.g. a favourites-specific column set) that must not trigger the quick cards UI.
 */
export type AdminResolveListQuickDesktopCardsActive = (
  args: AdminResolveListTableColumnKeysArgs,
) => boolean

/** Optional post-process for resolved desktop list table columns (e.g. density tweaks in quick mode). */
export type AdminTransformListTableColumnsArgs =
  AdminResolveListTableColumnKeysArgs & {
    readonly columns: readonly AdminEntityColumn[]
  }

export type AdminTransformListTableColumns = (
  args: AdminTransformListTableColumnsArgs,
) => readonly AdminEntityColumn[] | undefined

/** Custom body for one row in the entity `listGrid` desktop card layout. */
export type AdminRenderAdminEntityListGridItemArgs = {
  readonly slug: AdminEntitySlug
  readonly row: AdminEntityTableRow
  readonly table: TanStackTable<AdminEntityTableRow>
  /**
   * First N visible list column ids (per entity `listGrid.previewColumnCount`), excluding `actions`.
   */
  readonly previewColumnKeys: readonly string[]
}

export type AdminRenderAdminEntityListGridItem = (
  args: AdminRenderAdminEntityListGridItemArgs,
) => ReactNode

export type AdminRenderQuickDesktopCardOwnerRowsArgs = {
  readonly slug: AdminEntitySlug
  readonly row: AdminEntityTableRow
}

export type AdminRenderQuickDesktopCardOwnerRowsResult = {
  readonly content: ReactNode | null | undefined
  readonly suppressDefaultCombinedOwner?: boolean
}

export type AdminRenderQuickDesktopCardOwnerRows = (
  args: AdminRenderQuickDesktopCardOwnerRowsArgs,
) => AdminRenderQuickDesktopCardOwnerRowsResult | null | undefined

export type AdminRenderQuickDesktopCardSuccessfulBuyerRowArgs = {
  readonly slug: AdminEntitySlug
  readonly row: AdminEntityTableRow
}

export type AdminRenderQuickDesktopCardSuccessfulBuyerRowResult = {
  readonly content: ReactNode | null | undefined
  readonly suppressDefaultSuccessfulBuyer?: boolean
}

export type AdminRenderQuickDesktopCardSuccessfulBuyerRow = (
  args: AdminRenderQuickDesktopCardSuccessfulBuyerRowArgs,
) => AdminRenderQuickDesktopCardSuccessfulBuyerRowResult | null | undefined

/** Fired after a nested admin entity PATCH succeeds (second-stack CRUD dialog). */
export type AdminNestedEntityPatchSuccessArgs = {
  readonly nestedSlug: AdminEntitySlug
  readonly nestedRowId: string
  /**
   * JSON row returned by PATCH (same shape as GET detail when present). Passed into
   * `refreshListDetailSeedAfterNestedChildPatch` handling so the parent dialog can read FK fields
   * without a follow-up GET when the PATCH body already includes them.
   */
  readonly patchResponse?: Record<string, unknown>
}

/** Optional chained side-effect after a POST entity create succeeds (e.g. emit Google Contacts warnings). */
export type AdminEntityCreateSuccessFollowupArgs = {
  readonly slug: AdminEntitySlug
  readonly createResponse: Record<string, unknown>
}

/** Optional chained persistence after the main entity PATCH succeeds (before cache + dialog updates). */
export type AdminEntityEditPatchSuccessFollowupArgs = {
  readonly slug: AdminEntitySlug
  readonly rowId: string
  readonly patchResponse: Record<string, unknown>
}

/**
 * Wired per app via `AdminClientRegistryContext.Provider` so `@repo/admin` client
 * code never imports app `tsconfig` path aliases (Turbopack cannot bundle those as client chunks).
 */
export type AdminCreateFormDefaultsGetter = () => Readonly<Record<string, string>>

/** After POST create: close dialog (default) or stay open in edit mode with the created row. */
export type AdminEntityCreateSuccessMode = "close" | "openEditWithCreatedRow"

/**
 * After PATCH update: close dialog (default), stay open and refresh from the response body, or — when
 * the response row's id differs from the patched id (e.g. clone-for-correction) — open edit for the
 * new row.
 */
export type AdminEntityPatchSuccessMode =
  | "close"
  | "keepEditDialogOpen"
  | "openEditWhenResponseIdDiffers"

export type AdminRenderCrudFormAfterMainFieldsArgs = {
  readonly slug: AdminEntitySlug
  readonly variant: "create" | "edit"
  /**
   * Parent entity row id when `variant === "edit"` (stringified bigint / uuid).
   * Always `null` for `create` before submit.
   */
  readonly entityRowId: string | null
  /**
   * Edit: list/detail row seed (same shape as list API), when the dialog was opened from the grid.
   */
  readonly listDetailSeed?: Record<string, unknown>
  /**
   * TanStack Form instance from the CRUD dialog (includes `Field`); also satisfies
   * {@link AdminEntityCrudFormSubscribeApi} for `Subscribe` / rollup fields.
   */
  readonly form?: AdminEntityCrudFormSubscribeApi & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack `Field` generics differ per form
    readonly Field: ComponentType<any>
  }
  /**
   * Columns deferred below related tabs when `crudFormAfterRelatedColumnKeys` is set on the entity.
   */
  readonly crudDeferredFieldCols?: readonly AdminEntityColumn[]
}

/**
 * Fully custom scrollable body for the admin CRUD dialog. When returned for a slug, replaces the
 * auto-generated field grid, form groups, and related collections entirely. The dialog header,
 * submit/cancel footer, and `fieldset` disabled-while-saving wrapper are preserved.
 * Return **`null`** / **`undefined`** to fall back to the default auto-generated layout.
 */
export type AdminRenderCrudDialogFormBodyArgs = {
  readonly slug: AdminEntitySlug
  readonly variant: "create" | "edit"
  readonly entityRowId: string | null
  readonly entityDefinition: AdminEntityDefinition
  /** Mirrors `entityDefinition.crudDialogFormDensity === "compact"` from the CRUD shell. */
  readonly isCompact: boolean
  readonly form: NonNullable<AdminRenderCrudFormAfterMainFieldsArgs["form"]>
  readonly listDetailSeed?: Record<string, unknown>
  readonly crudListRelationFieldOptions?: AdminEntityCrudListRelationFieldOptionsMap
  /**
   * Nested edit only — optional UI seed from `OpenNestedEntityEditArgs.nestedEditUiContext`.
   * Omitted for list-page edit dialogs.
   */
  readonly nestedEditUiContext?: AdminNestedEditUiContext
}

/**
 * Custom inner layout for one `crudFormGroups` section or tab (the grid below the group heading).
 * Use {@link AdminRenderCrudFormGroupBodyArgs.renderGroupField} so labels, validation, and controls
 * match the built-in CRUD field chrome.
 */
export type AdminRenderCrudFormGroupBodyArgs = {
  readonly slug: AdminEntitySlug
  readonly variant: "create" | "edit"
  readonly entityRowId: string | null
  readonly entityDefinition: AdminEntityDefinition
  readonly listDetailSeed?: Record<string, unknown>
  readonly group: {
    readonly key: string
    readonly label: string
    readonly cols: readonly AdminEntityColumn[]
  }
  readonly form: NonNullable<AdminRenderCrudFormAfterMainFieldsArgs["form"]>
  readonly crudListRelationFieldOptions?: AdminEntityCrudListRelationFieldOptionsMap
  readonly wideGrid: boolean
  readonly isCompact: boolean
  /**
   * Extra grid shell classes (e.g. tab panel padding) applied by the dialog in **`tabs`** mode.
   */
  readonly extraGridClassName?: string
  /**
   * Render one column like the default group grid (`gridColumn` in `wrapperStyle` when `wideGrid`).
   */
  readonly renderGroupField: (
    col: AdminEntityColumn,
    wrapperStyle: CSSProperties,
  ) => ReactNode
}

export type AdminRenderCrudFormGroupBody = (
  args: AdminRenderCrudFormGroupBodyArgs,
) => ReactNode | null | undefined

/**
 * Optional full-width body for the admin CRUD dialog on **compact** viewports when the entity is in
 * compact read-only mode (see {@link AdminEntityDefinition.crudCompactViewport}).
 * Return **`null`** / **`undefined`** to use the default form layout (still read-only).
 */
export type AdminRenderCrudDialogCompactBodyArgs = {
  readonly slug: AdminEntitySlug
  readonly variant: "create" | "edit"
  readonly entityRowId: string | null
  readonly entityDefinition: AdminEntityDefinition
  readonly form: NonNullable<AdminRenderCrudFormAfterMainFieldsArgs["form"]>
  readonly listDetailSeed?: Record<string, unknown>
  readonly crudDeferredFieldCols?: readonly AdminEntityColumn[]
  /** Edit: columns in PATCH form order (partitioned; matches dialog `patchCols`). */
  readonly patchCols?: readonly AdminEntityColumn[]
  /** Merged FK labels for the open dialog (customer names, etc.). */
  readonly crudListRelationFieldOptions?: AdminEntityCrudListRelationFieldOptionsMap
}

/** Display-only `crudRelatedCollections` tab with `mode: "custom"`. */
export type AdminRenderCrudRelatedCustomPanelArgs = {
  readonly parentSlug: AdminEntitySlug
  readonly variant: "create" | "edit"
  readonly entityRowId: string | null
  readonly customRelatedPanelKey: string
  readonly detailPayload: Record<string, unknown> | undefined
  readonly detailPending: boolean
  readonly detailError: string | null
}

/** Per-row actions beside delete in `crudRelatedCollections` inline tables (e.g. size breakdown). */
export type AdminRenderCrudRelatedInlineRowActionsArgs = {
  readonly parentSlug: AdminEntitySlug
  readonly variant: "create" | "edit"
  readonly entityRowId: string | null
  readonly collection: AdminEntityCrudRelatedCollectionTable
  readonly detailPayload: Record<string, unknown> | undefined
  readonly line: LineRow
  readonly updateLine: (clientKey: string, patch: Record<string, unknown>) => void
  readonly setLines: Dispatch<SetStateAction<LineRow[]>>
  readonly childCfg: AdminEntityDefinition
  readonly parentCrudForm?: AdminEntityCrudFormSubscribeApi
  readonly adminUiMutationsDisabled?: boolean
}

/** Extra actions on an inline related table toolbar (e.g. auto-fill cash counts). */
export type AdminRenderCrudRelatedTableToolbarArgs = {
  readonly parentSlug: AdminEntitySlug
  readonly variant: "create" | "edit"
  readonly entityRowId: string | null
  readonly collection: AdminEntityCrudRelatedCollectionTable
  readonly detailPayload: Record<string, unknown> | undefined
  readonly lines: readonly LineRow[]
  readonly setLines: Dispatch<SetStateAction<LineRow[]>>
  readonly childCfg: AdminEntityDefinition
  readonly persistKey: string
  readonly zeroSentinelKeys: ReadonlySet<string>
  readonly implicitPersistIgnoreKeys: ReadonlySet<string>
  readonly implicitLineFieldsFromParentFk: Readonly<Record<string, string>> | undefined
  readonly crudRelatedRelationOptionsByColumnKey: Readonly<
    Record<
      string,
      {
        options: { value: string; label: string }[]
        optionsPending: boolean
        /** Present for inline FK columns; used by multi-select popovers. */
        rawListRows?: Record<string, unknown>[]
      }
    >
  >
  readonly relationNumericMaps: AdminRelatedRelationNumericMaps
  /**
   * Parent edit form (when the admin dialog passes it) so toolbars can read live values such as
   * computed `roundedOffAmount` instead of only the stale entity-detail payload.
   */
  readonly parentCrudForm?: AdminEntityCrudFormSubscribeApi
  /**
   * Optional client-side row filter for the related inline grid: full `lines` state is unchanged;
   * only visible rows are narrowed. Cleared when the toolbar passes `null` or the related editor
   * unmounts.
   */
  /** Same semantics as `useState` setter — use `set(() => predicate)` to store a row predicate function. */
  readonly setRelatedInlineVisibleLinesPredicate?: Dispatch<
    SetStateAction<((line: LineRow) => boolean) | null>
  >
  /** Bumps when related inline drafts sync (optional signal for toolbar session logic). */
  readonly relatedDraftGeneration: number
  /**
   * Refetches parent GET `/api/.../[id]`, updates `entity-detail` cache and dialog `listDetailSeed`
   * when present — required after side-effect APIs that change merged detail (e.g. ledger balances).
   */
  readonly refetchParentEntityDetail?: () => Promise<void>
  /**
   * Create-dialog only: after a successful **`POST`** that created the parent row (e.g. related
   * toolbar persisted lines with extras), switch the open dialog from **create** → **edit** using
   * the API response row — same shape as create-mutation **`openEditWithCreatedRow`** success.
   */
  readonly promoteCreateDialogToEditFromApiRow?: (
    createdRow: Record<string, unknown>,
  ) => void
}

/** Context for `relatedCollectionLinesChangePostProcess` hooks (inline related-row tables). */
export type AdminRelatedCollectionLinesPostProcessContext = {
  readonly lines: readonly LineRow[]
  readonly persistKey: string
  readonly zeroSentinelKeys: ReadonlySet<string>
  readonly implicitPersistIgnoreKeys: ReadonlySet<string>
  readonly childCfg: AdminEntityDefinition
  readonly collection: AdminEntityCrudRelatedCollectionTable
  readonly implicitLineFieldsFromParentFk: Readonly<Record<string, string>>
  /**
   * Parent entity detail still loading (`GET /api/.../[id]`). Hooks must not treat placeholder
   * inline rows (e.g. a bare `clientKey` draft) as authoritative — avoids clobbering header totals.
   */
  readonly detailPending?: boolean
  /**
   * Parent CRUD form when the dialog provides it — use to push rollups from inline lines into header
   * fields (e.g. sales gross/discount from line items).
   */
  readonly parentCrudForm?: AdminEntityCrudFormSubscribeApi
  /**
   * Create vs edit inline related editor — use to avoid clobbering server-loaded lines on first paint.
   */
  readonly relatedInlineVariant?: "create" | "edit"
  /**
   * Bumps when the CRUD dialog opens or related drafts sync — reset session-scoped line hooks.
   */
  readonly relatedDraftGeneration?: number
  /**
   * Aborted when the hosting `useEffect` cleans up (e.g. `lines` or `relatedDraftGeneration`
   * changed mid-flight, React Strict Mode). Async hooks must not commit session side effects after
   * `abortSignal.aborted` — the UI may never receive `setLines` for that run.
   */
  readonly abortSignal?: AbortSignal
}

export type AdminCrudFormComputedFieldRenderArgs = {
  readonly variant: "create" | "edit"
  readonly slug: AdminEntitySlug
  readonly col: AdminEntityColumn
  readonly form: AdminEntityCrudFormSubscribeApi
  readonly listDetailSeed?: Record<string, unknown>
  readonly anchorPayrollRowId: string | null
  /**
   * Merged FK option lists for the open CRUD dialog (includes any form-scoped relation fetches).
   * Lets computed-only fields resolve labels (e.g. customer name from the customer-code select).
   */
  readonly crudListRelationFieldOptions?: Readonly<AdminEntityCrudListRelationFieldOptionsMap>
}

/** After a main CRUD field's string value changes (same tick as TanStack `handleChange`). */
export type AdminCrudFormFieldChangeEffectArgs = {
  readonly variant: "create" | "edit"
  readonly slug: AdminEntitySlug
  readonly fieldKey: string
  readonly nextValue: string
  readonly form: AdminEntityCrudFormSubscribeApi
}

export type AdminCrudFormFieldChangeEffect = (
  args: AdminCrudFormFieldChangeEffectArgs,
) => void

export type AdminCrudFormClientSubmitValidatorArgs = {
  readonly variant: "create" | "edit"
  readonly value: Readonly<Record<string, string>>
  /**
   * Same object as `adminEntityCrudExtrasForSaveRef.current` when the registry provides it: related
   * inline payloads (`salesItems`, …) plus client-only keys such as `_inlineDraftIssues`.
   */
  readonly crudExtrasForSave?: Readonly<Record<string, unknown>>
}

/** Return a user-visible message to block submit, or `undefined` to allow. */
export type AdminCrudFormClientSubmitValidator = (
  args: AdminCrudFormClientSubmitValidatorArgs,
) => string | undefined

/**
 * Runs at the start of admin CRUD **Create** / **Save** (after guards, before client validators and
 * payload build). Use to coerce form state that must be non-empty for `buildAdminEntityCreateBody`.
 */
export type AdminCrudFormNormalizeValuesBeforeSubmit = (args: {
  readonly variant: "create" | "edit"
  readonly form: AdminEntityCrudFormSubscribeApi
}) => void

/**
 * Maps a server mutation error to per-field inline error strings.
 * Return `undefined` to fall through to the generic footer error message instead.
 * Receives `entityDefinition` so the mapper can look up column labels/keys dynamically.
 */
export type AdminCrudFormServerErrorToFieldErrors = (args: {
  readonly variant: "create" | "edit"
  readonly error: Error
  readonly entityDefinition: AdminEntityDefinition
}) => Record<string, string> | undefined

/** Sparse related-line PATCH: return `undefined` to use default full related-line serialization; `null` to omit the collection key from the PATCH body (no mutations). */
export type AdminBuildExperimentalRelatedExtrasPayloadArgs = {
  readonly parentSlug: AdminEntitySlug
  readonly collectionJsonKey: string
  readonly variant: "create" | "edit"
  readonly lines: LineRow[]
  readonly detailPayloadItems: unknown[] | undefined
  readonly childCfg: AdminEntityDefinition
  readonly collection: AdminEntityCrudRelatedCollectionTable
  readonly persistKey: string
  readonly persistWhenAnyEditableContent: boolean
  readonly zeroSentinelKeys: ReadonlySet<string>
  readonly implicitLineFields?: Readonly<Record<string, string>>
  readonly extrasPayloadKeys?: readonly string[]
  readonly newDraftTreatFieldValuesAsEmpty?: Readonly<Record<string, string>>
}

export type AdminBuildExperimentalRelatedExtrasPayload = (
  args: AdminBuildExperimentalRelatedExtrasPayloadArgs,
) => unknown[] | null | undefined

export type AdminClientRegistryValue = {
  readonly adminEntities: Readonly<Record<string, AdminEntityDefinition>>
  readonly frontendConfig: {
    readonly admin: {
      readonly entityPageWidth: AdminEntityPageWidthPreset
      readonly entityListPageSizeOptions: readonly number[]
      /** App opt-in for smaller related-line PATCH payloads (paired with server handling). */
      readonly experimentalSparseCrud?: boolean
    }
  }
  /**
   * When true, list/create/delete and edit saves are hidden or read-only (browse-only admin session).
   * Apps set this from server props for non-admin roles when viewer access is enabled.
   */
  readonly adminUiMutationsDisabled?: boolean
  readonly loadAdminEntityDefinition: (
    slug: string,
  ) => Promise<AdminEntityDefinition>
  /**
   * Client-only create-dialog defaults by entity slug (cannot live on `AdminEntityDefinition` — that
   * object crosses the RSC boundary). Merged over `adminEntityFormDefaultValues` when the create
   * form mounts.
   */
  readonly getCreateFormDefaultsBySlug?: Readonly<
    Partial<Record<string, AdminCreateFormDefaultsGetter>>
  >
  /**
   * Render between the main field scroll area and **`crudRelatedCollections`** tabs (edit/create).
   * Only invoked when the entity has at least one related collection. Use for actions tied to the
   * saved parent row (e.g. export) without crowding the dialog footer.
   */
  readonly renderCrudFormBeforeRelatedCollections?: (
    args: AdminRenderCrudFormAfterMainFieldsArgs,
  ) => ReactNode | undefined
  /**
   * Render below the main field grid (still inside the dialog body, above the footer).
   * Use for related records in tabs; main entity fields stay outside this slot.
   */
  readonly renderCrudFormAfterMainFields?: (
    args: AdminRenderCrudFormAfterMainFieldsArgs,
  ) => ReactNode | undefined
  /**
   * When the entity slug is in this set and `renderCrudFormAfterMainFields` returns non-null JSX,
   * that output is shown in a dedicated right-hand column (md+) beside the main fields, form
   * groups, and related collections. Below `md`, the slot stacks under the main column.
   */
  readonly crudFormAfterMainFieldsSideRailSlugs?: ReadonlySet<string>
  /**
   * Replaces the default 12-column inner grid for one `crudFormGroups` section or tab panel.
   * Return **`null`** / **`undefined`** to use the default layout for that group.
   */
  readonly renderCrudFormGroupBody?: AdminRenderCrudFormGroupBody
  /**
   * Fully replaces the scrollable form body (field grid, form groups, related collections) for
   * specific entity slugs. The dialog header, footer, `fieldset` disabled wrapper, and
   * `renderCrudDialogCompactBody` (compact viewport override) are unaffected.
   * Return **`null`** / **`undefined`** to use the default auto-generated layout for that slug.
   */
  readonly renderCrudDialogFormBody?: (
    args: AdminRenderCrudDialogFormBodyArgs,
  ) => ReactNode | null | undefined
  /**
   * When the dialog is on a compact viewport and compact read-only mode applies, return JSX to
   * replace the default main + related + deferred field stack (related collections may still mount
   * hidden to hydrate `adminEntityCrudExtrasForSaveRef`). Return **`null`** to keep the default layout.
   */
  readonly renderCrudDialogCompactBody?: (
    args: AdminRenderCrudDialogCompactBodyArgs,
  ) => ReactNode | null | undefined
  /**
   * Populated by config-driven related-row editors (`crudRelatedCollections`); merged into
   * **POST** / **PATCH** for keys in `extraCreateBodyKeys` / `extraPatchBodyKeys`.
   */
  readonly adminEntityCrudExtrasForSaveRef?: MutableRefObject<
    Record<string, unknown>
  >
  /**
   * Keys (usually from `extraPatchOmitUntilDetailLoaded`) excluded from **PATCH** until removed.
   */
  readonly adminEntityCrudPatchOmitExtrasKeysRef?: MutableRefObject<
    Set<string>
  >
  /**
   * Last chance to merge into admin **`POST`** JSON before fetch (e.g. atomic child rows).
   */
  readonly mergeAdminEntityCreateRequestBody?: (
    slug: string,
    body: Record<string, unknown>,
  ) => Record<string, unknown>
  /**
   * Last chance to merge into admin **`PATCH`** JSON before fetch.
   */
  readonly mergeAdminEntityPatchRequestBody?: (
    slug: string,
    rowId: string,
    patch: Record<string, unknown>,
  ) => Record<string, unknown>
  /**
   * After a successful **POST** entity create, before dialog transition. Use for side-effects that
   * read the create response (e.g. emit Google Contacts warnings).
   */
  readonly adminEntityCreateSuccessFollowup?: (
    args: AdminEntityCreateSuccessFollowupArgs,
  ) => Promise<void>
  /**
   * After a successful main **PATCH** (same mutation `onSuccess`), before list/detail invalidation
   * and dialog close. Use for second requests that cannot share the PATCH body (e.g. nested extras
   * held in an isolated client registry).
   */
  readonly adminEntityEditPatchSuccessFollowup?: (
    args: AdminEntityEditPatchSuccessFollowupArgs,
  ) => Promise<void>
  /**
   * After a successful **nested** entity PATCH (`AdminNestedEntityCrudDialogHostOpen`), while the
   * nested dialog is still mounted — runs **before** query invalidation and `onClose`. Use when the
   * nested PATCH cannot include related extras that must still be persisted in a second request.
   */
  readonly adminNestedEntityEditPatchSuccessFollowup?: (
    args: AdminNestedEntityPatchSuccessArgs,
  ) => Promise<void>
  /** Optional sparse related-lines payload for PATCH (inventory-style experiments). */
  readonly buildExperimentalRelatedExtrasPayload?: AdminBuildExperimentalRelatedExtrasPayload
  /**
   * Per-entity create success handling. Omit entry → close dialog after successful POST (historical default).
   */
  readonly adminEntityCreateSuccessBySlug?: Readonly<
    Partial<Record<string, AdminEntityCreateSuccessMode>>
  >
  /**
   * Per-entity PATCH success handling. Omit entry → close dialog after successful PATCH (default).
   * `keepEditDialogOpen` refreshes `values` / `listDetailSeed` from the JSON response and keeps editing.
   */
  readonly adminEntityPatchSuccessBySlug?: Readonly<
    Partial<Record<string, AdminEntityPatchSuccessMode>>
  >
  /**
   * When true for a slug, edit **Save** sends only changed scalar PATCH fields and dirty
   * `extraPatchBodyKeys` payloads (smaller JSON; server already supports omitted keys).
   */
  readonly adminEntityPartialPatchBySlug?: Readonly<
    Partial<Record<string, true>>
  >
  /**
   * When set, nested entity edit (`AdminNestedEntityCrudDialogHostOpen`) invokes
   * `ref.current` after a successful PATCH (before closing). Host apps can refetch a parent
   * entity's `listDetailSeed` (e.g. payroll period after nested payroll save).
   */
  readonly adminNestedEntityPatchSuccessListenerRef?: MutableRefObject<
    ((args: AdminNestedEntityPatchSuccessArgs) => void | Promise<void>) | null
  >
  /**
   * After a nested admin entity PATCH succeeds, invalidate list/detail queries beyond the nested
   * row's `entity-detail` key (e.g. parent entity list when a child row affects rollups).
   */
  readonly invalidateQueriesAfterNestedEntityPatchSuccess?: (
    queryClient: QueryClient,
    args: AdminNestedEntityPatchSuccessArgs,
  ) => void
  /**
   * Resolve {@link AdminEntityCrudRelatedVirtualColumn} `kind: "registryInlineNumeric"`.
   */
  readonly evalRelatedInlineVirtualRegistryNumeric?: (
    registryKey: string,
    line: LineRow,
  ) => number | null
  /**
   * Optional map keyed by `AdminEntityCrudRelatedCollection.registryLinesChangePostProcessKey`.
   */
  readonly relatedCollectionLinesChangePostProcess?: Readonly<
    Record<
      string,
      (ctx: AdminRelatedCollectionLinesPostProcessContext) => LineRow[] | null
    >
  >
  /**
   * Optional map keyed by `AdminEntityCrudRelatedCollection.registryLinesAsyncChangePostProcessKey`.
   */
  readonly relatedCollectionLinesAsyncPostProcess?: Readonly<
    Record<
      string,
      (
        ctx: AdminRelatedCollectionLinesPostProcessContext,
      ) => Promise<LineRow[] | null>
    >
  >
  /**
   * App-specific `columns[].formComputedDisplay` renderers (virtual CRUD-only fields).
   */
  readonly renderCrudFormComputedField?: (
    args: AdminCrudFormComputedFieldRenderArgs,
  ) => ReactNode | null
  /**
   * Optional per-slug hook after any main-string CRUD field changes (create/edit), e.g. derive
   * other form fields from one amount input.
   */
  readonly crudFormFieldChangeEffectBySlug?: Readonly<
    Partial<Record<string, AdminCrudFormFieldChangeEffect>>
  >
  /**
   * Optional per-slug client-side gate before POST/PATCH from the admin CRUD dialog; show the
   * returned message in the dialog instead of submitting.
   */
  readonly crudFormClientSubmitValidatorBySlug?: Readonly<
    Partial<Record<string, AdminCrudFormClientSubmitValidator>>
  >
  /**
   * Per-slug hook before client validators / payload build; coerce form values that would otherwise
   * fail `buildAdminEntityCreateBody` / patch builders (e.g. numeric fields that must default to 0).
   */
  readonly crudFormNormalizeValuesBeforeSubmitBySlug?: Readonly<
    Partial<Record<string, AdminCrudFormNormalizeValuesBeforeSubmit>>
  >
  /**
   * After client-side POST/PATCH payload validation finds blocking scalar issues (empty required
   * fields, invalid booleans), before focusing the first field. Apps may open collapsed form sections.
   */
  readonly notifyAdminEntityCrudPayloadFieldIssues?: (args: {
    readonly slug: AdminEntitySlug
    readonly fieldKeys: readonly string[]
  }) => void
  /**
   * Per-slug mapper from a server mutation error to per-field inline error strings.
   * When the mapper returns a non-empty record, errors appear next to the relevant fields
   * and the generic footer error is suppressed. Return `undefined` to keep the footer error.
   */
  readonly crudFormServerErrorToFieldErrorsBySlug?: Readonly<
    Partial<Record<string, AdminCrudFormServerErrorToFieldErrors>>
  >
  /**
   * Renders `AdminEntityCrudRelatedCollectionCustom` tabs on the parent CRUD dialog.
   */
  readonly renderCrudRelatedCustomPanel?: (
    args: AdminRenderCrudRelatedCustomPanelArgs,
  ) => ReactNode | null | undefined
  /**
   * Renders optional controls on an inline related table toolbar when
   * `AdminEntityCrudRelatedCollectionTable.registryRelatedTableToolbarKey` is set.
   */
  readonly renderCrudRelatedTableToolbar?: (
    args: AdminRenderCrudRelatedTableToolbarArgs,
  ) => ReactNode | null | undefined
  /**
   * Optional per-row actions for `AdminEntityCrudRelatedCollectionTable.registryRelatedInlineRowActionsKey`.
   */
  readonly renderCrudRelatedInlineRowActionsByKey?: Readonly<
    Record<
      string,
      (args: AdminRenderCrudRelatedInlineRowActionsArgs) => ReactNode | null | undefined
    >
  >
  /**
   * Renders above the list table (inside the list card, below filter chrome). Use for filter-scoped
   * summaries; {@link AdminEntityDefinition.listAggregateSumColumnKeys} supplies non–page-limited sums on GET.
   */
  readonly renderAdminEntityListAboveTable?: AdminRenderAdminEntityListAboveTable
  /**
   * Optional desktop list table column key order (table layout only unless the implementation
   * returns keys for other modes). Used with {@link adminEntityListColumnsByKeys} in
   * `useAdminEntityAdmin`.
   */
  readonly resolveListTableColumnKeys?: AdminResolveListTableColumnKeys
  /**
   * When provided, replaces the default `hasQuickColumnKeys` flag used to decide whether the quick
   * desktop cards layout is active. Provide this when `resolveListTableColumnKeys` returns custom
   * column sets for non–quick-card modes (e.g. a favourites-specific column set) that must not
   * activate the quick cards UI.
   */
  readonly resolveListQuickDesktopCardsActive?: AdminResolveListQuickDesktopCardsActive
  /**
   * After list column keys resolve, optionally replace column defs (return new objects; do not mutate
   * `cfg.columns`). Return `undefined` to keep the default {@link adminEntityListColumnsByKeys} /
   * {@link adminEntityListColumnsInOrder} result.
   */
  readonly transformListTableColumns?: AdminTransformListTableColumns
  /**
   * Optional grid card renderers for entity `listGrid` — keys match `listGrid.registryGridItemKey`.
   */
  readonly renderAdminEntityListGridItemBySlug?: Readonly<
    Partial<Record<string, AdminRenderAdminEntityListGridItem>>
  >
  /**
   * Optional interactive owner rows for quick desktop cards. Used when a product needs richer owner
   * actions than the default `combinedOwner` text line can provide.
   */
  readonly renderQuickDesktopCardOwnerRows?: AdminRenderQuickDesktopCardOwnerRows
  /**
   * Optional interactive successful-buyer row for quick desktop cards. Used when a product needs
   * richer accepted-buyer actions than the default `successfulBuyer` text line can provide.
   */
  readonly renderQuickDesktopCardSuccessfulBuyerRow?: AdminRenderQuickDesktopCardSuccessfulBuyerRow
  /**
   * Optional extra icon-link buttons rendered per list row, in a "links" column before the
   * row actions column. Return an array of link descriptors for a given slug + row; return
   * `null` / `undefined` to skip for that row. When `href` is `null` the button is rendered
   * disabled (greyed out).
   */
  readonly renderAdminEntityListRowLinks?: (args: {
    readonly slug: string
    readonly row: AdminEntityTableRow
    /** Dense desktop list (e.g. Panda properties quick table); registry may shrink or omit links. */
    readonly compactRowLinks?: boolean
  }) => readonly {
    readonly href: string | null
    readonly icon: ReactNode
    readonly tooltip: string
  }[] | null | undefined
  /**
   * Optional extra action buttons rendered before the standard edit/delete controls inside
   * the row actions cell. Return a ReactNode for a given slug + row.
   */
  readonly renderAdminEntityListRowExtraActions?: (args: {
    readonly slug: string
    readonly row: AdminEntityTableRow
  }) => ReactNode
  /**
   * Structured row actions for the responsive collapse: `pinned` stays inline at any width
   * (and is where per-row dialogs are mounted); `collapsible` actions fold into a single overflow
   * menu (with Edit/Delete) when the table is too narrow. Preferred over
   * {@link renderAdminEntityListRowExtraActions} when a slug has a crowded action strip.
   */
  readonly renderAdminEntityListRowActions?: (args: {
    readonly slug: string
    readonly row: AdminEntityTableRow
  }) => {
    readonly pinned?: ReactNode
    readonly collapsible?: AdminEntityRowActionDescriptor[]
    /** Render only `pinned` — no Edit/Delete/overflow (e.g. browse-only map results rows). */
    readonly pinnedOnly?: boolean
  } | null
  /**
   * Slugs whose desktop list table gets a per-row "remove from this view" checkbox.
   * The hide is client-only (in-memory, non-persistent): it filters rows out of the
   * on-screen table, never touching the database or the export, and clears on reload
   * or a fresh search. Rendered as a table-only cell so it never appears in the
   * quick-card / mobile-card layouts. Lists not listed here are unaffected.
   */
  readonly adminEntityListRowHideFromViewSlugs?: readonly AdminEntitySlug[]
  /**
   * Called after PATCH success at key points (keepEditDialogOpen and nested-patch parent-refresh).
   * Use for entity-specific side-effect notifications (e.g. bump a buyer-offers refetch signal when
   * the entity slug is relevant). Keeps entity-slug checks in the app registry rather than the
   * shared hook.
   */
  readonly onAdminEntityPatchSuccessNotify?: (slug: AdminEntitySlug) => void
  /**
   * Optional async hook awaited just before the admin CRUD **PATCH** mutation fires.
   * Use to flush pending side-writes (e.g. an embedded editable sub-form) so they land in the
   * same user action as the main entity save. Set `ref.current` from within the custom form body;
   * the admin edit form reads it on each submit.
   */
  readonly adminEntityCrudBeforePatchRef?: MutableRefObject<(() => Promise<void>) | null>
}
