"use client"

import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import {
  getCoreRowModel,
  useReactTable,
  type SortingState,
  type Updater,
} from "@tanstack/react-table"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import type { AdminEntityCrudDialogState } from "./admin-entity-crud-dialog-state"
import { buildAdminEntityAdminColumns } from "./admin-entity-admin-columns"
import { cellString } from "../../admin-entity-admin-cell"
import {
  adminEntityListAppendWhereHintSpecs,
  adminEntityListUrl,
  buildAdminEntityListSearchParams,
  defaultAdminEntityListPrimarySortFromCfg,
  emptyAdminEntityListAppendWhereHintSegments,
  ADMIN_ENTITY_LIST_LAYOUT_PARAM,
  ADMIN_ENTITY_URL_DIALOG_VIEW_ONLY_PARAM,
  ADMIN_ENTITY_URL_OPEN_EDIT_PARAM,
  parseAdminEntityListFromSearchParams,
  parseAdminEntityUrlOpenEditDialog,
  stableAdminEntityListQueryFromLocationSearch,
  stableAdminEntityListStateQueryString,
  stableAppendWhereHintSegmentsKey,
  type ListFetchInput,
  type ParsedAdminEntityListUrlState,
} from "../../admin-entity-admin-list-fetch"
import { effectiveListDateRangeFilterSpecs } from "../../admin-entity-list-date-range-specs"
import { adminListFiltersDifferFromSegment } from "../../admin-entity-list-filters-differ"
import type { AdminEntityTableRow } from "../../admin-entity-admin-types"
import { ADMIN_ENTITY_LIST_MAX_LIMIT } from "../../admin-entity-list-api"
import type { AdminEntityListResponse } from "../../admin-entity-list-api"
import { adminEntityFormColumnsInOrder } from "../../admin-entity-form-column-order"
import {
  adminEntityColumnShowsManyRelationForm,
  adminEntityManyRelationFormValueFromListRow,
} from "../../admin-entity-many-relation-form"
import { useAdminClientRegistry } from "../../admin-client-registry-context"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import { adminEntityRelationOptionLabel } from "../../admin-entity-relation-filter-option-label"
import {
  ADMIN_ENTITY_RELATION_FILTER_OPTIONS_STALE_MS,
  adminEntityRelationFilterOptionsQueryKey,
  adminEntityRelationSlugsForParentCrudRelatedCollections,
  fetchAdminEntityRelationFilterOptions,
  serializeRelationFilterOptionsQueryExtras,
} from "../../admin-entity-relation-filter-options-query"
import {
  collectAdminRelationOptionPreloadSpecs,
  relationOptionPreloadQueryIndexForListRel,
  relationOptionPreloadQueryIndexForManyForm,
} from "../../admin-entity-relation-option-preload-specs"
import { adminEntityRelationOptionsEnsureSelected } from "../../admin-entity-relation-options"
import {
  type AdminEntityColumn,
  type AdminEntityDefinition,
  type AdminEntityListRelationFilterSpec,
  isAdminEntityCrudRelatedCollectionTable,
} from "../../admin-entity-types"
import {
  relationFilterStoredValues,
  serializeRelationFilterStored,
} from "../../admin-entity-relation-filter-value"
import {
  adminEntityCreateFormListDateFilterDefaults,
  buildAdminEntityPatchFormValuesFromApiRow,
} from "../../admin-entity-crud-form-values"
import { ADMIN_CRUD_INLINE_DRAFT_ISSUES_REF_KEY } from "../../admin-entity-crud-related-collections-draft"
import { adminEntityListDetailSeedFromRow } from "../../admin-entity-list-detail-seed"
import { resolveAdminNestedPatchParentRefreshPlan } from "../../admin-nested-patch-parent-refresh"
import {
  notifyAdminRelatedInlineDraftSync,
  notifyAdminRelatedInlineForcedEmbedRefresh,
} from "../../admin-related-inline-draft-sync"
import { adminEntityPatchExtrasBaselineFromRow } from "../../admin-entity-patch-partial"
import { readApiErrorMessage } from "../../read-api-error"
import {
  defaultAdminEntityYearMonthPeriodUtcNow,
  formatAdminEntityYearMonthPeriodLabel,
} from "../../admin-entity-list-year-month-period-parse"
import { useCompactAdminListViewport } from "@repo/ui/use-compact-admin-list-viewport"

import { useAdminEntityListTableColumns } from "./use-admin-entity-list-table-columns"
import {
  initialRelationFilterSelections,
  initialSortingStateForCfg,
} from "./use-admin-entity-admin-helpers"
import { useAdminEntityRelationOptionData } from "./use-admin-entity-relation-option-data"
import { useAdminEntityCrudMutations } from "./use-admin-entity-crud-mutations"
import { useAdminEntityCrudDialogActions } from "./use-admin-entity-crud-dialog-actions"

export type { AdminEntityCrudDialogState }

export function useAdminEntityAdmin(
  slug: AdminEntitySlug,
  cfg: AdminEntityDefinition,
  /** Query string without `?`, from RSC — must match the request URL for hydration. */
  listUrlSearch: string,
  options?: {
    /**
     * When true, the internal list query is disabled. Use this on pages that manage
     * their own data fetching (e.g. via router.refresh + SSR) and only need the
     * CRUD dialog wiring from this hook.
     */
    disableListQuery?: boolean
  },
) {
  const {
    frontendConfig,
    adminUiMutationsDisabled = false,
    adminEntities,
    loadAdminEntityDefinition,
    adminEntityCreateSuccessBySlug,
    adminEntityPatchSuccessBySlug,
    adminEntityPartialPatchBySlug,
    mergeAdminEntityCreateRequestBody,
    mergeAdminEntityPatchRequestBody,
    adminEntityCreateSuccessFollowup,
    adminEntityEditPatchSuccessFollowup,
    adminEntityCrudExtrasForSaveRef,
    adminEntityCrudPatchOmitExtrasKeysRef,
    adminNestedEntityPatchSuccessListenerRef,
    renderAdminEntityListRowLinks,
    renderAdminEntityListRowExtraActions,
    renderAdminEntityListRowActions,
    resolveListTableColumnKeys,
    resolveListQuickDesktopCardsActive,
    transformListTableColumns,
    onAdminEntityPatchSuccessNotify,
  } = useAdminClientRegistry()
  const isCompactListViewport = useCompactAdminListViewport()
  const queryClient = useQueryClient()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const listUrlStableRef = useRef<string | null>(null)
  const skipNextSearchPageResetRef = useRef(false)
  const skipNextBooleanPageResetRef = useRef(false)
  const skipNextRelationFilterPageResetRef = useRef(false)
  const skipNextYearMonthPageResetRef = useRef(false)
  const skipNextAppendWhereHintPageResetRef = useRef(false)
  const skipNextDateRangePageResetRef = useRef(false)
  const urlWriteSnapshotRef = useRef<{
    cfg: AdminEntityDefinition
    slug: AdminEntitySlug
    pathname: string
    pageSizeOptions: readonly number[]
    listBooleanFilterEnabled: boolean
    listBooleanFilterParam: string | undefined
    listYearMonthFilterEnabled: boolean
    listYearMonthFilterParam: string | undefined
    listAppendWhereHintFilterEnabled: boolean
    listDateRangeFilterEnabled: boolean
    listRelationFilterEnabled: boolean
    listLimit: number
    listFetch: ListFetchInput
    displayPage: number
    listSearchForRequest: string
    listBooleanFilterSegment: "all" | "true" | "false"
    listBooleanFilterForUrl: boolean | undefined
    relationFilterSelections: Record<string, string>
    listYearMonthPeriod: string
    listAppendWhereHintSegments: Record<string, string>
    listDateRanges: Record<string, { from: string; to: string }>
    listSortForApi: { columnKey: string; direction: "asc" | "desc" }
    listLayoutMode: "table" | "grid"
  } | null>(null)

  const createCols = useMemo(
    () => adminEntityFormColumnsInOrder(cfg, "create"),
    [cfg],
  )
  const patchCols = useMemo(
    () => adminEntityFormColumnsInOrder(cfg, "patch"),
    [cfg],
  )
  const idKey = cfg.idColumn.jsonKey

  const pageSizeOptions = frontendConfig.admin.entityListPageSizeOptions

  /** One parse per mount so the first paint matches the URL (avoids a page-1 list fetch before layout sync). */
  const initialListUrlRef = useRef<ParsedAdminEntityListUrlState | null>(null)
  if (initialListUrlRef.current === null) {
    initialListUrlRef.current = parseAdminEntityListFromSearchParams(
      cfg,
      new URLSearchParams(listUrlSearch),
      pageSizeOptions,
      adminEntities,
    )
  }

  const [crudDialog, setCrudDialog] = useState<AdminEntityCrudDialogState>({
    kind: "none",
  })
  const crudDialogRef = useRef(crudDialog)
  crudDialogRef.current = crudDialog

  const [sorting, setSorting] = useState<SortingState>(() => {
    const parsed = initialListUrlRef.current!
    if (parsed.primarySort) {
      return [
        {
          id: parsed.primarySort.columnKey,
          desc: parsed.primarySort.direction === "desc",
        },
      ]
    }
    return initialSortingStateForCfg(cfg)
  })

  const [listLimit, setListLimit] = useState<number>(
    () => initialListUrlRef.current!.limit,
  )
  const [listFetch, setListFetch] = useState<ListFetchInput>(() => ({
    kind: "page",
    page: initialListUrlRef.current!.page,
  }))
  const [displayPage, setDisplayPage] = useState(
    () => initialListUrlRef.current!.page,
  )

  const listSearchSpec = cfg.listSearch
  const listSearchEnabled =
    listSearchSpec != null &&
    (listSearchSpec.columnKeys.length > 0 ||
      (listSearchSpec.relatedTextSearch?.length ?? 0) > 0)
  const listSearchTrigger = listSearchSpec?.trigger ?? "debounce"
  const [listSearchInput, setListSearchInput] = useState(
    () => initialListUrlRef.current!.search,
  )
  const [listSearchDebounced, setListSearchDebounced] = useState(
    () => initialListUrlRef.current!.search,
  )

  const listBooleanSpec = (cfg as AdminEntityDefinition).listBooleanFilter
  const listBooleanFilterEnabled = listBooleanSpec != null
  const defaultBooleanSegment: "all" | "true" | "false" =
    listBooleanSpec?.defaultSegment ?? "all"
  const listBooleanFilterParam =
    listBooleanSpec?.queryParam ?? listBooleanSpec?.columnKey
  const listBooleanFilterColumnLabel = useMemo(() => {
    if (!listBooleanSpec) return ""
    return (
      cfg.columns.find((c) => c.key === listBooleanSpec.columnKey)?.label ?? ""
    )
  }, [cfg.columns, listBooleanSpec])

  const listYearMonthSpec = cfg.listYearMonthFilter
  const listYearMonthFilterEnabled = listYearMonthSpec != null
  const listYearMonthFilterParam =
    listYearMonthSpec?.queryParam ?? "reportedPeriod"

  const listDateRangeSpecs = useMemo(
    () => effectiveListDateRangeFilterSpecs(cfg),
    [cfg],
  )
  const listDateRangeFilterEnabled = listDateRangeSpecs.length > 0

  const listRelationFilterSpecsAll = useMemo(
    () =>
      (cfg.listRelationFilters ?? []) as readonly AdminEntityListRelationFilterSpec[],
    [cfg.listRelationFilters],
  )
  const listRelationFilterSpecs = useMemo(
    () => listRelationFilterSpecsAll.filter((s) => !s.hiddenFromListToolbar),
    [listRelationFilterSpecsAll],
  )
  const listManyRelationFilterSpecs = useMemo(
    () => cfg.listManyRelationFilters ?? [],
    [cfg.listManyRelationFilters],
  )
  const listRelationFilterEnabled =
    listRelationFilterSpecs.length > 0 ||
    listManyRelationFilterSpecs.length > 0

  const scopedRelationFilterSpecs = useMemo(
    () =>
      listRelationFilterSpecsAll.filter(
        (s) => s.optionListScopedByParentYearMonth === true,
      ),
    [listRelationFilterSpecsAll],
  )

  const listYearMonthFilterRequired = listYearMonthSpec?.required === true

  const listAppendWhereHintSpecs = useMemo(
    () => adminEntityListAppendWhereHintSpecs(cfg),
    [cfg],
  )
  const listAppendWhereHintFilterEnabled = listAppendWhereHintSpecs.length > 0

  type ListBooleanFilterSegment = "all" | "true" | "false"
  const [listBooleanFilterSegment, setListBooleanFilterSegment] =
    useState<ListBooleanFilterSegment>(
      () => initialListUrlRef.current!.booleanSegment,
    )

  const [listAppendWhereHintSegments, setListAppendWhereHintSegments] =
    useState<Record<string, string>>(() => {
      const specs = adminEntityListAppendWhereHintSpecs(cfg)
      if (specs.length === 0) return {}
      return initialListUrlRef.current!.listAppendWhereHintSegments
    })

  const [relationFilterSelections, setRelationFilterSelections] = useState<
    Record<string, string>
  >(() => {
    const fromUrl = initialRelationFilterSelections(
      cfg,
      initialListUrlRef.current!.relationFilterSelections,
    )
    // Panda Realty: if no URL filter for propertyStatusId, restore from localStorage
    if (
      slug === "properties" &&
      !fromUrl.propertyStatusId &&
      typeof window !== "undefined"
    ) {
      const stored = window.localStorage.getItem(
        "panda-realty:list-filter:properties:propertyStatusId:values",
      )
      if (stored) {
        return { ...fromUrl, propertyStatusId: stored }
      }
    }
    return fromUrl
  })

  const [listYearMonthPeriod, setListYearMonthPeriod] = useState(() =>
    listYearMonthFilterEnabled
      ? initialListUrlRef.current!.yearMonthPeriod
      : "",
  )

  const [listDateRanges, setListDateRanges] = useState<
    Record<string, { from: string; to: string }>
  >(() =>
    listDateRangeFilterEnabled
      ? { ...initialListUrlRef.current!.listDateRanges }
      : {},
  )

  const [listLayoutMode, setListLayoutMode] = useState<"table" | "grid">(
    () => initialListUrlRef.current!.listLayout,
  )

  const listAppendWhereHintSegmentsKey = useMemo(
    () => stableAppendWhereHintSegmentsKey(listAppendWhereHintSegments),
    [listAppendWhereHintSegments],
  )

  useLayoutEffect(() => {
    listUrlStableRef.current = null
  }, [slug, cfg])

  /** String key so the layout sync runs when the URL query actually changes. */
  const listUrlSearchParamsKey = searchParams.toString()

  useLayoutEffect(() => {
    // Prefer the real location bar: `useSearchParams()` can lag behind `router.replace`
    // (or be briefly empty on the first client frame), which would clear relation filters
    // even though `window.location` already has e.g. `tagId=`.
    const urlParams =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : searchParams
    const parsed = parseAdminEntityListFromSearchParams(
      cfg,
      urlParams,
      pageSizeOptions,
      adminEntities,
    )
    const effectiveSort =
      parsed.primarySort ?? defaultAdminEntityListPrimarySortFromCfg(cfg)
    const nextStable = stableAdminEntityListStateQueryString({
      cfg,
      limit: parsed.limit,
      page: parsed.page,
      search: parsed.search,
      sort: effectiveSort,
      booleanFilterParam: listBooleanFilterEnabled
        ? listBooleanFilterParam
        : undefined,
      booleanSegment: parsed.booleanSegment,
      relationFilterSelections: initialRelationFilterSelections(
        cfg,
        parsed.relationFilterSelections,
      ),
      yearMonthFilterParam: listYearMonthFilterEnabled
        ? listYearMonthFilterParam
        : undefined,
      yearMonthPeriod: parsed.yearMonthPeriod,
      listDateRanges: parsed.listDateRanges,
      listAppendWhereHintFilterEnabled,
      listAppendWhereHintSegments: listAppendWhereHintFilterEnabled
        ? parsed.listAppendWhereHintSegments
        : undefined,
      listLayout: parsed.listLayout,
    })
    if (
      listUrlStableRef.current !== null &&
      listUrlStableRef.current === nextStable
    ) {
      return
    }
    listUrlStableRef.current = nextStable
    if (listSearchEnabled) skipNextSearchPageResetRef.current = true
    if (listBooleanFilterEnabled) skipNextBooleanPageResetRef.current = true
    if (listRelationFilterEnabled) skipNextRelationFilterPageResetRef.current = true
    if (listYearMonthFilterEnabled) skipNextYearMonthPageResetRef.current = true
    if (listAppendWhereHintFilterEnabled) {
      skipNextAppendWhereHintPageResetRef.current = true
    }
    if (listDateRangeFilterEnabled) {
      skipNextDateRangePageResetRef.current = true
    }

    setListLimit(parsed.limit)
    setListFetch({ kind: "page", page: parsed.page })
    setDisplayPage(parsed.page)
    setListSearchInput(parsed.search)
    setListSearchDebounced(parsed.search)
    setListBooleanFilterSegment(parsed.booleanSegment)
    const baseRelationSelections = initialRelationFilterSelections(
      cfg,
      parsed.relationFilterSelections,
    )
    // Panda Realty: if URL has no propertyStatusId, restore from localStorage as fallback
    const nextRelationSelections =
      slug === "properties" &&
      !baseRelationSelections.propertyStatusId &&
      typeof window !== "undefined"
        ? (() => {
            const stored = window.localStorage.getItem(
              "panda-realty:list-filter:properties:propertyStatusId:values",
            )
            return stored
              ? { ...baseRelationSelections, propertyStatusId: stored }
              : baseRelationSelections
          })()
        : baseRelationSelections
    setRelationFilterSelections(nextRelationSelections)
    if (listYearMonthFilterEnabled) {
      setListYearMonthPeriod(parsed.yearMonthPeriod)
    }
    if (listAppendWhereHintFilterEnabled) {
      setListAppendWhereHintSegments(parsed.listAppendWhereHintSegments)
    } else {
      setListAppendWhereHintSegments({})
    }
    if (listDateRangeFilterEnabled) {
      setListDateRanges({ ...parsed.listDateRanges })
    } else {
      setListDateRanges({})
    }
    setListLayoutMode(parsed.listLayout)
    if (parsed.primarySort) {
      setSorting([
        {
          id: parsed.primarySort.columnKey,
          desc: parsed.primarySort.direction === "desc",
        },
      ])
    } else {
      setSorting(initialSortingStateForCfg(cfg))
    }
  }, [
    adminEntities,
    cfg,
    slug,
    listUrlSearchParamsKey,
    pageSizeOptions,
    listBooleanFilterEnabled,
    listBooleanFilterParam,
    listRelationFilterEnabled,
    listSearchEnabled,
    listYearMonthFilterEnabled,
    listAppendWhereHintFilterEnabled,
    listDateRangeFilterEnabled,
    searchParams,
  ])

  useEffect(() => {
    if (listSearchTrigger === "submit") return
    setListSearchDebounced(listSearchInput.trim())
  }, [listSearchInput, listSearchTrigger])

  const submitListSearch = useCallback((submittedValue?: string) => {
    const val = (submittedValue ?? listSearchInput).trim()
    setListSearchInput(val)
    setListSearchDebounced(val)
  }, [listSearchInput])

  const clearListSearch = useCallback(() => {
    setListSearchInput("")
    setListSearchDebounced("")
  }, [])

  useEffect(() => {
    if (!listSearchEnabled) return
    if (skipNextSearchPageResetRef.current) {
      skipNextSearchPageResetRef.current = false
      return
    }
    setDisplayPage(1)
    setListFetch({ kind: "page", page: 1 })
  }, [listSearchDebounced, listSearchEnabled])

  useEffect(() => {
    if (!listBooleanFilterEnabled) return
    if (skipNextBooleanPageResetRef.current) {
      skipNextBooleanPageResetRef.current = false
      return
    }
    setDisplayPage(1)
    setListFetch({ kind: "page", page: 1 })
  }, [listBooleanFilterSegment, listBooleanFilterEnabled])

  const relationFilterStableKey = useMemo(() => {
    const fk = listRelationFilterSpecsAll.map(
      (s) => `${s.columnKey}:${relationFilterSelections[s.columnKey] ?? ""}`,
    )
    const many = listManyRelationFilterSpecs.map(
      (s) =>
        `${s.manyRelationColumnKey}:${relationFilterSelections[s.manyRelationColumnKey] ?? ""}`,
    )
    return [...fk, ...many].join("|")
  }, [
    listManyRelationFilterSpecs,
    listRelationFilterSpecsAll,
    relationFilterSelections,
  ])

  useEffect(() => {
    if (!listRelationFilterEnabled) return
    if (skipNextRelationFilterPageResetRef.current) {
      skipNextRelationFilterPageResetRef.current = false
      return
    }
    setDisplayPage(1)
    setListFetch({ kind: "page", page: 1 })
  }, [relationFilterStableKey, listRelationFilterEnabled])

  useEffect(() => {
    if (!listYearMonthFilterEnabled) return
    if (skipNextYearMonthPageResetRef.current) {
      skipNextYearMonthPageResetRef.current = false
      return
    }
    setDisplayPage(1)
    setListFetch({ kind: "page", page: 1 })
  }, [listYearMonthFilterEnabled, listYearMonthPeriod])

  useEffect(() => {
    if (!listAppendWhereHintFilterEnabled) return
    if (skipNextAppendWhereHintPageResetRef.current) {
      skipNextAppendWhereHintPageResetRef.current = false
      return
    }
    setDisplayPage(1)
    setListFetch({ kind: "page", page: 1 })
  }, [listAppendWhereHintFilterEnabled, listAppendWhereHintSegmentsKey])

  const listDateRangeStableKey = useMemo(() => {
    const keys = Object.keys(listDateRanges).sort()
    return keys
      .map((k) => {
        const v = listDateRanges[k]!
        return `${k}:${(v.from ?? "").trim()}:${(v.to ?? "").trim()}`
      })
      .join("|")
  }, [listDateRanges])

  useEffect(() => {
    if (!listDateRangeFilterEnabled) return
    if (skipNextDateRangePageResetRef.current) {
      skipNextDateRangePageResetRef.current = false
      return
    }
    setDisplayPage(1)
    setListFetch({ kind: "page", page: 1 })
  }, [listDateRangeFilterEnabled, listDateRangeStableKey])

  const listSearchForRequest = listSearchEnabled ? listSearchDebounced : ""

  const { listCols, listTableQuickCompact, listTableColumnDividers, listQuickDesktopCards, renderListRowLinksForTable } =
    useAdminEntityListTableColumns({
      slug,
      cfg,
      listAppendWhereHintSegments,
      listAppendWhereHintSegmentsKey,
      listSearchForRequest,
      relationFilterSelections,
      relationFilterStableKey,
      listLayoutMode,
      isCompactListViewport,
      listBooleanFilterSegment,
      resolveListTableColumnKeys,
      resolveListQuickDesktopCardsActive,
      transformListTableColumns,
      renderAdminEntityListRowLinks,
    })

  const listBooleanFilterForUrl = useMemo(() => {
    if (!listBooleanFilterEnabled || !listBooleanFilterParam) return undefined
    if (listBooleanFilterSegment === "all") return undefined
    return listBooleanFilterSegment === "true"
  }, [
    listBooleanFilterEnabled,
    listBooleanFilterParam,
    listBooleanFilterSegment,
  ])

  const listSearchPlaceholder = useMemo(() => {
    if (!listSearchSpec) return ""
    const labels = listSearchSpec.columnKeys.flatMap((k) => {
      const label = cfg.columns.find((c) => c.key === k)?.label
      return label ? [label] : []
    })
    for (const r of listSearchSpec.relatedTextSearch ?? []) {
      const relCfg = adminEntities[r.relatedEntitySlug as AdminEntitySlug]
      if (!relCfg) continue
      for (const rk of r.relatedColumnKeys) {
        const label = relCfg.columns.find((c) => c.key === rk)?.label
        if (label) labels.push(label)
      }
    }
    if (labels.length === 0) return "Search"
    return `Search ${labels.join(" or ")}`
  }, [adminEntities, cfg, listSearchSpec])

  const onPageSizeChange = useCallback(
    (raw: string) => {
      const next = Number.parseInt(raw, 10)
      if (!(pageSizeOptions as readonly number[]).includes(next)) return
      setListLimit(next)
      setDisplayPage(1)
      setListFetch({ kind: "page", page: 1 })
    },
    [pageSizeOptions],
  )

  const listSortForApi = useMemo(() => {
    const s = sorting[0]
    if (!s) return undefined
    return {
      columnKey: s.id,
      direction: s.desc ? ("desc" as const) : ("asc" as const),
    }
  }, [sorting])

  if (listSortForApi) {
    urlWriteSnapshotRef.current = {
      cfg,
      slug,
      pathname,
      pageSizeOptions,
      listBooleanFilterEnabled,
      listBooleanFilterParam,
      listYearMonthFilterEnabled,
      listYearMonthFilterParam,
      listAppendWhereHintFilterEnabled,
      listDateRangeFilterEnabled,
      listRelationFilterEnabled,
      listLimit,
      listFetch,
      displayPage,
      listSearchForRequest,
      listBooleanFilterSegment,
      listBooleanFilterForUrl,
      relationFilterSelections,
      listYearMonthPeriod,
      listAppendWhereHintSegments,
      listDateRanges,
      listSortForApi,
      listLayoutMode,
    }
  } else {
    urlWriteSnapshotRef.current = null
  }

  const onListSortingChange = useCallback((updater: Updater<SortingState>) => {
    setSorting(updater)
    setDisplayPage(1)
    setListFetch({ kind: "page", page: 1 })
  }, [])

  /**
   * Never call `router.replace` from `useLayoutEffect`: it can synchronously re-enter
   * navigation / RSC work while layout effects are still flushing and wedge the dev
   * server (especially under Playwright + Turbopack). Defer with `setTimeout(0)` and
   * read the latest list inputs from `urlWriteSnapshotRef` so the first paint after
   * URL hydration still updates the address bar without stale closures. Skip replace
   * when the location already matches the desired canonical query (prevents replace
   * ↔ read loops).
   */
  useEffect(() => {
    const t = window.setTimeout(() => {
      const snap = urlWriteSnapshotRef.current
      if (!snap) return
      const sort = snap.listSortForApi
      const page =
        snap.listFetch.kind === "page"
          ? snap.listFetch.page
          : Math.max(1, snap.displayPage)
      const nextStable = stableAdminEntityListStateQueryString({
        cfg: snap.cfg,
        limit: snap.listLimit,
        page,
        search: snap.listSearchForRequest,
        sort,
        booleanFilterParam: snap.listBooleanFilterEnabled
          ? snap.listBooleanFilterParam
          : undefined,
        booleanSegment: snap.listBooleanFilterSegment,
        relationFilterSelections: initialRelationFilterSelections(
          snap.cfg,
          snap.listRelationFilterEnabled
            ? snap.relationFilterSelections
            : {},
        ),
        yearMonthFilterParam: snap.listYearMonthFilterEnabled
          ? snap.listYearMonthFilterParam
          : undefined,
        yearMonthPeriod: snap.listYearMonthPeriod,
        listDateRanges: snap.listDateRanges,
        listAppendWhereHintFilterEnabled: snap.listAppendWhereHintFilterEnabled,
        listAppendWhereHintSegments: snap.listAppendWhereHintFilterEnabled
          ? snap.listAppendWhereHintSegments
          : undefined,
        listLayout: snap.listLayoutMode,
      })
      const browserStable = stableAdminEntityListQueryFromLocationSearch(
        snap.cfg,
        window.location.search,
        snap.pageSizeOptions,
        snap.listBooleanFilterEnabled,
        snap.listBooleanFilterEnabled ? snap.listBooleanFilterParam : undefined,
        snap.listYearMonthFilterEnabled,
        snap.listYearMonthFilterEnabled
          ? snap.listYearMonthFilterParam
          : undefined,
        snap.listAppendWhereHintFilterEnabled,
        adminEntities,
      )
      if (browserStable === nextStable) {
        listUrlStableRef.current = nextStable
        return
      }
      listUrlStableRef.current = nextStable
      const qs = buildAdminEntityListSearchParams(
        snap.listLimit,
        { kind: "page", page },
        {
          search: snap.listSearchForRequest || undefined,
          booleanFilterParam: snap.listBooleanFilterEnabled
            ? snap.listBooleanFilterParam
            : undefined,
          booleanFilterValue: snap.listBooleanFilterForUrl,
          sort,
          ...(snap.listYearMonthFilterEnabled
            ? {
                yearMonthFilterParam: snap.listYearMonthFilterParam,
                yearMonthPeriod: snap.listYearMonthPeriod.trim(),
              }
            : {}),
          ...(snap.listDateRangeFilterEnabled || snap.listRelationFilterEnabled
            ? {
                parentListCfg: snap.cfg,
                ...(snap.listRelationFilterEnabled
                  ? { relationFilterSelections: snap.relationFilterSelections }
                  : {}),
              }
            : {}),
          ...(snap.listDateRangeFilterEnabled &&
          Object.keys(snap.listDateRanges).length > 0
            ? { listDateRanges: snap.listDateRanges }
            : {}),
          ...(() => {
            if (!snap.listAppendWhereHintFilterEnabled) return {}
            const hints: Record<string, string> = {}
            for (const [k, v] of Object.entries(snap.listAppendWhereHintSegments)) {
              const t = (v ?? "").trim()
              if (t !== "") hints[k] = t
            }
            return Object.keys(hints).length > 0 ? { appendWhereHints: hints } : {}
          })(),
        },
      )
      if (snap.cfg.listGrid) {
        qs.set(
          ADMIN_ENTITY_LIST_LAYOUT_PARAM,
          snap.listLayoutMode === "grid" ? "grid" : "table",
        )
      }
      router.replace(`${snap.pathname}?${qs.toString()}`, { scroll: false })
    }, 0)
    return () => clearTimeout(t)
  }, [
    displayPage,
    listBooleanFilterEnabled,
    listBooleanFilterForUrl,
    listBooleanFilterParam,
    listBooleanFilterSegment,
    listFetch,
    listLimit,
    listSearchForRequest,
    listSortForApi,
    listRelationFilterEnabled,
    listYearMonthFilterEnabled,
    listYearMonthPeriod,
    listDateRangeFilterEnabled,
    listDateRanges,
    listAppendWhereHintFilterEnabled,
    listAppendWhereHintSegmentsKey,
    relationFilterSelections,
    pathname,
    router,
    slug,
    pageSizeOptions,
    cfg,
    adminEntities,
    listLayoutMode,
  ])

  const {
    relationOptionPreloadSpecs,
    relationFilterOptionsQueries,
    scopedRelationFilterOptionsQueries,
    crudListRelationFieldOptions,
  } = useAdminEntityRelationOptionData({
    slug,
    cfg,
    createCols,
    patchCols,
    listRelationFilterSpecsAll,
    listManyRelationFilterSpecs,
    scopedRelationFilterSpecs,
    listYearMonthFilterEnabled,
    listYearMonthFilterParam,
    listYearMonthPeriod,
  })

  const onRelationFilterChange = useCallback(
    (columnKey: string, value: string) => {
      setRelationFilterSelections((prev) => ({ ...prev, [columnKey]: value }))
    },
    [],
  )

  const onRelationMultiFilterChange = useCallback(
    (columnKey: string, values: string[]) => {
      setRelationFilterSelections((prev) => {
        const fkSpec = listRelationFilterSpecsAll.find(
          (s) => s.columnKey === columnKey,
        )
        const manySpec = listManyRelationFilterSpecs.find(
          (s) => s.manyRelationColumnKey === columnKey,
        )
        const multi =
          fkSpec?.multiSelect === true || manySpec?.multiSelect === true
        return {
          ...prev,
          [columnKey]: serializeRelationFilterStored(multi, values),
        }
      })
    },
    [listManyRelationFilterSpecs, listRelationFilterSpecsAll],
  )

  // Panda Realty: persist propertyStatusId selections to localStorage
  useEffect(() => {
    if (slug === "properties" && typeof window !== "undefined") {
      if (relationFilterSelections.propertyStatusId) {
        window.localStorage.setItem(
          "panda-realty:list-filter:properties:propertyStatusId:values",
          relationFilterSelections.propertyStatusId,
        )
      } else {
        window.localStorage.removeItem(
          "panda-realty:list-filter:properties:propertyStatusId:values",
        )
      }
    }
  }, [slug, relationFilterSelections.propertyStatusId])

  const onListAppendWhereHintSegmentChange = useCallback(
    (queryParam: string, value: string) => {
      setListAppendWhereHintSegments((prev) => ({
        ...prev,
        [queryParam]: value,
      }))
    },
    [],
  )

  // Active state of every filter EXCEPT the boolean segment. Shared by the two flags below, which
  // differ only in what they compare the boolean segment against ("all" vs the entity default).
  const hasNonBooleanActiveFilter = useMemo(() => {
    if (listSearchEnabled && listSearchInput.trim() !== "") return true
    if (listAppendWhereHintFilterEnabled) {
      for (const v of Object.values(listAppendWhereHintSegments)) {
        if ((v ?? "").trim() !== "") return true
      }
    }
    if (
      listYearMonthFilterEnabled &&
      !listYearMonthFilterRequired &&
      listYearMonthPeriod.trim() !== ""
    ) {
      return true
    }
    if (listDateRangeFilterEnabled) {
      for (const v of Object.values(listDateRanges)) {
        if (
          (v?.from ?? "").trim() !== "" &&
          (v?.to ?? "").trim() !== ""
        ) {
          return true
        }
      }
    }
    if (listRelationFilterEnabled) {
      for (const spec of listRelationFilterSpecs) {
        if ((relationFilterSelections[spec.columnKey] ?? "").trim() !== "")
          return true
      }
      for (const spec of listManyRelationFilterSpecs) {
        if (
          (relationFilterSelections[spec.manyRelationColumnKey] ?? "").trim() !==
          ""
        )
          return true
      }
    }
    return false
  }, [
    listAppendWhereHintFilterEnabled,
    listAppendWhereHintSegments,
    listYearMonthFilterEnabled,
    listYearMonthFilterRequired,
    listYearMonthPeriod,
    listDateRangeFilterEnabled,
    listDateRanges,
    listManyRelationFilterSpecs,
    listRelationFilterEnabled,
    listRelationFilterSpecs,
    listSearchEnabled,
    listSearchInput,
    relationFilterSelections,
  ])

  // Drives the toolbar "Clear filters" affordance: any filter narrows rows away from the "show all"
  // baseline (boolean segment "all").
  const hasActiveListFilters = adminListFiltersDifferFromSegment(
    hasNonBooleanActiveFilter,
    listBooleanFilterEnabled,
    listBooleanFilterSegment,
    "all",
  )

  // Drives the empty-state "No matches for the current filters" recovery: the current filter state
  // differs from the entity's DEFAULTS (boolean segment compared to its default, e.g. Favorites-on).
  // Lets the empty state stay silent at pure defaults while still offering a reset when off-default.
  const listFiltersDifferFromDefaults = adminListFiltersDifferFromSegment(
    hasNonBooleanActiveFilter,
    listBooleanFilterEnabled,
    listBooleanFilterSegment,
    defaultBooleanSegment,
  )

  const clearAllListFilters = useCallback(() => {
    setListSearchInput("")
    setListSearchDebounced("")
    setListAppendWhereHintSegments(emptyAdminEntityListAppendWhereHintSegments(cfg))
    setListBooleanFilterSegment("all")
    setListYearMonthPeriod(
      listYearMonthFilterRequired
        ? defaultAdminEntityYearMonthPeriodUtcNow()
        : "",
    )
    setRelationFilterSelections(initialRelationFilterSelections(cfg, {}))
    setListDateRanges({})
    setDisplayPage(1)
    setListFetch({ kind: "page", page: 1 })
  }, [cfg, listYearMonthFilterRequired])

  // Like clearAllListFilters, but restores the boolean segment to the entity DEFAULT instead of "all".
  // Used by the empty-state recovery so e.g. panda Properties returns to its Favorites-on home view.
  const resetListFiltersToDefaults = useCallback(() => {
    setListSearchInput("")
    setListSearchDebounced("")
    setListAppendWhereHintSegments(emptyAdminEntityListAppendWhereHintSegments(cfg))
    setListBooleanFilterSegment(defaultBooleanSegment)
    setListYearMonthPeriod(
      listYearMonthFilterRequired
        ? defaultAdminEntityYearMonthPeriodUtcNow()
        : "",
    )
    setRelationFilterSelections(initialRelationFilterSelections(cfg, {}))
    setListDateRanges({})
    setDisplayPage(1)
    setListFetch({ kind: "page", page: 1 })
  }, [cfg, defaultBooleanSegment, listYearMonthFilterRequired])

  const listRelationFilterRows = useMemo(() => {
    if (!listRelationFilterEnabled) return []
    const fkRows = listRelationFilterSpecs
      .map((spec) => {
        const col = cfg.columns.find((c) => c.key === spec.columnKey)
        const listRel = col?.listRelation
        if (!col || !listRel) return null
        const relSlug = listRel.relatedEntitySlug as AdminEntitySlug
        const multi = spec.multiSelect === true
        const stored = relationFilterSelections[spec.columnKey] ?? ""
        const selectedValues = relationFilterStoredValues(multi, stored)

        if (!multi && spec.uiVariant === "asyncSearch") {
          const asyncLimitRaw = spec.asyncSearchFetchLimit
          const asyncSearchFetchLimit =
            asyncLimitRaw != null && Number.isFinite(asyncLimitRaw)
              ? Math.floor(asyncLimitRaw)
              : 50
          return {
            columnKey: spec.columnKey,
            columnLabel: col.relationFilterLabel ?? col.label,
            uiLayout: spec.uiLayout ?? "inline",
            uiVariant: "asyncSearch" as const,
            asyncSearchFetchLimit,
            asyncSearchMatchesHint: spec.asyncSearchMatchesHint,
            asyncSearchShowMatchesHint: spec.asyncSearchShowMatchesHint,
            asyncSearchShowEmptyQueryHint: spec.asyncSearchShowEmptyQueryHint,
            relatedSlug: relSlug,
            relatedListLabelColumnKeys: listRel.labelColumnKeys,
            multiSelect: false,
            value: stored,
            selectedValues,
            options: [] as { value: string; label: string }[],
            optionsPending: false,
            persistenceKeys: spec.persistenceKeys,
          }
        }

        const scopedIdx = spec.optionListScopedByParentYearMonth
          ? scopedRelationFilterSpecs.findIndex(
              (s) => s.columnKey === spec.columnKey,
            )
          : -1
        const q =
          scopedIdx >= 0
            ? scopedRelationFilterOptionsQueries[scopedIdx]
            : (() => {
                const qIdx = relationOptionPreloadQueryIndexForListRel(
                  relationOptionPreloadSpecs,
                  listRel,
                )
                return qIdx >= 0 ? relationFilterOptionsQueries[qIdx] : undefined
              })()
        const rawItems = (q?.data?.list.items ?? []) as Record<
          string,
          unknown
        >[]
        const idKey = q?.data?.idKey ?? ""
        const relCfgForLabels = adminEntities[relSlug]
        const relatedColumns = relCfgForLabels?.columns
        const optionsBase = rawItems
          .map((row) => {
            const id = row[idKey]
            if (id == null) return null
            const value = String(id)
            const label = adminEntityRelationOptionLabel(
              row,
              listRel.labelColumnKeys,
              relatedColumns,
            )
            return { value, label: label.length > 0 ? label : value }
          })
          .filter((x): x is { value: string; label: string } => x != null)
        const options = adminEntityRelationOptionsEnsureSelected(
          optionsBase,
          selectedValues,
        )
        return {
          columnKey: spec.columnKey,
          columnLabel: col.relationFilterLabel ?? col.label,
          uiLayout: spec.uiLayout ?? "inline",
          uiVariant: "select" as const,
          multiSelect: multi,
          value: stored,
          selectedValues,
          options,
          optionsPending: q?.isPending ?? false,
          persistenceKeys: spec.persistenceKeys,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x != null)

    const manyRows = listManyRelationFilterSpecs
      .map((spec) => {
        const col = cfg.columns.find((c) => c.key === spec.manyRelationColumnKey)
        const many = col?.listManyRelation
        if (!col || !many) return null
        const relSlug = many.relatedEntitySlug as AdminEntitySlug
        const qIdx = relationOptionPreloadQueryIndexForManyForm(
          relationOptionPreloadSpecs,
          relSlug,
        )
        const q =
          qIdx >= 0 ? relationFilterOptionsQueries[qIdx] : undefined
        const rawItems = (q?.data?.list.items ?? []) as Record<
          string,
          unknown
        >[]
        const idKey = q?.data?.idKey ?? ""
        const relCfgForLabels = adminEntities[relSlug]
        const relatedColumns = relCfgForLabels?.columns
        const optionsBase = rawItems
          .map((row) => {
            const id = row[idKey]
            if (id == null) return null
            const value = String(id)
            const label = adminEntityRelationOptionLabel(
              row,
              many.labelColumnKeys,
              relatedColumns,
            )
            return { value, label: label.length > 0 ? label : value }
          })
          .filter((x): x is { value: string; label: string } => x != null)
        const multi = spec.multiSelect === true
        const stored =
          relationFilterSelections[spec.manyRelationColumnKey] ?? ""
        const selectedValues = relationFilterStoredValues(multi, stored)
        const options = adminEntityRelationOptionsEnsureSelected(
          optionsBase,
          selectedValues,
        )
        return {
          columnKey: spec.manyRelationColumnKey,
          columnLabel: col.relationFilterLabel ?? col.label,
          uiLayout: spec.uiLayout ?? "inline",
          uiVariant: "select" as const,
          multiSelect: multi,
          value: stored,
          selectedValues,
          options,
          optionsPending: q?.isPending ?? false,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x != null)

    return [...fkRows, ...manyRows]
  }, [
    cfg.columns,
    listManyRelationFilterSpecs,
    listRelationFilterEnabled,
    listRelationFilterSpecs,
    relationOptionPreloadSpecs,
    relationFilterOptionsQueries,
    relationFilterSelections,
    scopedRelationFilterOptionsQueries,
    scopedRelationFilterSpecs,
  ])

  const reportingPeriodsPath =
    listYearMonthSpec?.periodsPath ?? "reporting-periods"

  const reportingPeriodsQuery = useQuery({
    queryKey: [...cfg.queryKey, "reporting-periods", reportingPeriodsPath] as const,
    enabled: listYearMonthFilterEnabled,
    queryFn: async (): Promise<{ periods: string[] }> => {
      const res = await fetch(
        `${cfg.apiBase}/${reportingPeriodsPath}`,
        { cache: "no-store" },
      )
      if (!res.ok) throw new Error(await readApiErrorMessage(res))
      return res.json() as Promise<{ periods: string[] }>
    },
  })

  const listYearMonthFilterOptions = useMemo(() => {
    const raw = reportingPeriodsQuery.data?.periods ?? []
    const base = raw.map((value) => ({
      value,
      label: formatAdminEntityYearMonthPeriodLabel(value),
    }))
    const sel = listYearMonthPeriod.trim()
    if (sel !== "" && !base.some((o) => o.value === sel)) {
      return [
        {
          value: sel,
          label: formatAdminEntityYearMonthPeriodLabel(sel),
        },
        ...base,
      ]
    }
    return base
  }, [listYearMonthPeriod, reportingPeriodsQuery.data?.periods])

  /** Radix `Select` value: `__all__` only when “all periods” is allowed and state is empty. */
  const listYearMonthFilterSelectValue = useMemo(() => {
    const t = listYearMonthPeriod.trim()
    if (listYearMonthFilterRequired && t === "") {
      return defaultAdminEntityYearMonthPeriodUtcNow()
    }
    return t === "" ? "__all__" : t
  }, [listYearMonthFilterRequired, listYearMonthPeriod])

  const onListYearMonthFilterChange = useCallback(
    (value: string) => {
      if (value === "__all__") {
        if (listYearMonthFilterRequired) return
        setListYearMonthPeriod("")
        return
      }
      setListYearMonthPeriod(value)
    },
    [listYearMonthFilterRequired],
  )

  const listAppendWhereHintsForRequest = useMemo(() => {
    if (!listAppendWhereHintFilterEnabled) return undefined
    const hints: Record<string, string> = {}
    for (const [k, v] of Object.entries(listAppendWhereHintSegments)) {
      const t = (v ?? "").trim()
      if (t !== "") hints[k] = t
    }
    return Object.keys(hints).length > 0 ? hints : undefined
  }, [listAppendWhereHintFilterEnabled, listAppendWhereHintSegments])

  const listDateRangeFilterRows = useMemo(
    () =>
      listDateRangeSpecs.map((spec) => ({
        columnKey: spec.columnKey,
        label: spec.label ?? "Date range",
        from: listDateRanges[spec.columnKey]?.from ?? "",
        to: listDateRanges[spec.columnKey]?.to ?? "",
      })),
    [listDateRanges, listDateRangeSpecs],
  )

  const createFormListDateFilterDefaults = useMemo(() => {
    const keys = new Set(createCols.map((c) => c.key))
    return adminEntityCreateFormListDateFilterDefaults({
      listDateRangeFilterRows,
      createColumnKeys: keys,
    })
  }, [createCols, listDateRangeFilterRows])

  const onListDateRangeChange = useCallback(
    (columnKey: string, from: string, to: string) => {
      setListDateRanges((prev) => {
        const next = { ...prev }
        const f = from.trim()
        const t = to.trim()
        if (f === "" || t === "") delete next[columnKey]
        else next[columnKey] = { from: f, to: t }
        return next
      })
    },
    [],
  )

  const listQuery = useQuery({
    enabled: options?.disableListQuery !== true,
    queryKey: [
      ...cfg.queryKey,
      "list",
      listFetch,
      listLimit,
      listSearchForRequest,
      listBooleanFilterSegment,
      listAppendWhereHintSegmentsKey,
      listYearMonthPeriod,
      listDateRangeStableKey,
      relationFilterStableKey,
      listSortForApi,
    ] as const,
    queryFn: async (): Promise<AdminEntityListResponse> => {
      const res = await fetch(
        adminEntityListUrl(cfg.apiBase, listLimit, listFetch, {
          search: listSearchForRequest || undefined,
          booleanFilterParam: listBooleanFilterParam,
          booleanFilterValue: listBooleanFilterForUrl,
          sort: listSortForApi,
          ...(listYearMonthFilterEnabled
            ? {
                yearMonthFilterParam: listYearMonthFilterParam,
                yearMonthPeriod: listYearMonthPeriod.trim(),
              }
            : {}),
          ...(listDateRangeFilterEnabled || listRelationFilterEnabled
            ? {
                parentListCfg: cfg,
                ...(listRelationFilterEnabled ? { relationFilterSelections } : {}),
              }
            : {}),
          ...(listDateRangeFilterEnabled && Object.keys(listDateRanges).length > 0
            ? { listDateRanges }
            : {}),
          ...(listAppendWhereHintsForRequest
            ? { appendWhereHints: listAppendWhereHintsForRequest }
            : {}),
        }),
        { cache: "no-store" },
      )
      if (!res.ok) throw new Error(await readApiErrorMessage(res))
      return res.json() as Promise<AdminEntityListResponse>
    },
  })

  const crudRelatedRelationPrefetchSlugs = useMemo(
    () => adminEntityRelationSlugsForParentCrudRelatedCollections(cfg, adminEntities),
    [cfg, adminEntities],
  )

  /**
   * Warm relation option caches (e.g. denominations for payroll cash counts) as soon as this
   * list page hook runs — in parallel with the table `listQuery`, not when the CRUD dialog opens.
   */
  useEffect(() => {
    if (crudRelatedRelationPrefetchSlugs.length === 0) return
    for (const relatedSlug of crudRelatedRelationPrefetchSlugs) {
      void queryClient.prefetchQuery({
        queryKey: adminEntityRelationFilterOptionsQueryKey(
          relatedSlug,
          undefined,
          undefined,
          serializeRelationFilterOptionsQueryExtras(),
        ),
        staleTime: ADMIN_ENTITY_RELATION_FILTER_OPTIONS_STALE_MS,
        queryFn: () =>
          fetchAdminEntityRelationFilterOptions(
            relatedSlug,
            loadAdminEntityDefinition,
          ),
      })
    }
  }, [
    queryClient,
    loadAdminEntityDefinition,
    crudRelatedRelationPrefetchSlugs,
  ])

  const listPayload = listQuery.data
  const tableRows = listPayload?.items ?? []
  const totalCount = listPayload?.totalCount ?? 0
  const totalPages = listPayload?.totalPages ?? 1

  const goToPage = useCallback(
    (page: number) => {
      const p = Math.max(1, Math.min(page, totalPages))
      setDisplayPage(p)
      setListFetch({ kind: "page", page: p })
    },
    [totalPages],
  )

  const goNextPage = useCallback(() => {
    if (!listPayload?.hasNextPage) return
    goToPage(displayPage + 1)
  }, [displayPage, goToPage, listPayload?.hasNextPage])

  const goPrevPage = useCallback(() => {
    if (!listPayload?.hasPreviousPage) return
    goToPage(displayPage - 1)
  }, [displayPage, goToPage, listPayload?.hasPreviousPage])

  useEffect(() => {
    if (listFetch.kind !== "page") return
    const ep = listPayload?.effectivePage
    if (typeof ep !== "number") return
    setDisplayPage(ep)
    setListFetch((prev) =>
      prev.kind === "page" && prev.page !== ep
        ? { kind: "page", page: ep }
        : prev,
    )
  }, [listFetch.kind, listPayload?.effectivePage])

  const {
    createMutation,
    updateMutation,
    deleteMutation,
    clearCreateSessionExtrasForCurrentEntity: _clearCreateSessionExtrasForCurrentEntity,
  } = useAdminEntityCrudMutations({
    cfg,
    slug,
    idKey,
    patchCols,
    queryClient,
    setCrudDialog,
    adminUiMutationsDisabled,
  })

  const {
    closeCrudDialog,
    openCreateDialog,
    promoteCreateDialogToEditFromApiRow,
    startEdit,
    openCrossEntityEdit,
    requestDeleteRow,
    onEditRelatedDetailLoaded,
    refetchEditDialogDetailFromApi,
  } = useAdminEntityCrudDialogActions({
    slug,
    cfg,
    idKey,
    patchCols,
    queryClient,
    setCrudDialog,
    crudDialogRef,
    adminUiMutationsDisabled,
    createMutationReset: createMutation.reset,
    updateMutationReset: updateMutation.reset,
    deleteMutationMutate: deleteMutation.mutate,
    pathname,
  })

  const deleteLabelColumn = useMemo(
    () => cfg.columns.find((c) => c.key === cfg.deleteLabelColumnKey),
    [cfg.columns, cfg.deleteLabelColumnKey],
  )

  const listHideRowActions = cfg.listHideRowActions === true
  const listHasRelatedOpenColumn = useMemo(
    () => listCols.some((c) => c.listCellOpensRelatedAdminEdit != null),
    [listCols],
  )

  const columns = useMemo(
    () =>
      buildAdminEntityAdminColumns({
        slug,
        listCols,
        idKey,
        deleteLabelColumnKey: cfg.deleteLabelColumnKey,
        deleteLabelColumn,
        listAggregateSums:
          (listPayload?.totalCount ?? 0) > 0
            ? listPayload?.listAggregateSums
            : undefined,
        updatePending: updateMutation.isPending,
        deletePending: deleteMutation.isPending,
        requestDeleteRow,
        startEdit,
        listHideRowActions,
        rowActionsViewOnly: adminUiMutationsDisabled,
        onOpenRelatedAdminEdit: listHasRelatedOpenColumn
          ? openCrossEntityEdit
          : undefined,
        adminEntities,
        listRowLinksFirst: cfg.listRowLinksFirst,
        renderListRowLinks: renderListRowLinksForTable,
        renderListRowExtraActions: renderAdminEntityListRowExtraActions,
        renderListRowActions: renderAdminEntityListRowActions,
      }),
    [
      slug,
      listCols,
      idKey,
      cfg.deleteLabelColumnKey,
      deleteLabelColumn,
      listPayload?.listAggregateSums,
      listPayload?.totalCount,
      updateMutation.isPending,
      deleteMutation.isPending,
      requestDeleteRow,
      startEdit,
      listHideRowActions,
      adminUiMutationsDisabled,
      listHasRelatedOpenColumn,
      openCrossEntityEdit,
      adminEntities,
      cfg.listRowLinksFirst,
      renderListRowLinksForTable,
      renderAdminEntityListRowExtraActions,
      renderAdminEntityListRowActions,
    ],
  )

  const table = useReactTable({
    data: tableRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    onSortingChange: onListSortingChange,
    state: { sorting },
    getRowId: (row, index) => {
      const raw = row[idKey]
      if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
        return String(raw)
      }
      return `__row_${index}`
    },
  })

  const rowCount = tableRows.length

  return {
    slug,
    cfg,
    listSearchEnabled,
    listSearchInput,
    setListSearchInput,
    listSearchTrigger,
    submitListSearch,
    clearListSearch,
    listSearchPlaceholder,
    listBooleanFilterEnabled,
    listBooleanFilterSegment,
    setListBooleanFilterSegment,
    listBooleanFilterLabels: listBooleanSpec?.labels,
    listBooleanFilterGroupLabel: listBooleanFilterColumnLabel
      ? `Filter by ${listBooleanFilterColumnLabel}`
      : "Filter",
    listBooleanFilterLayout: listBooleanSpec?.uiLayout ?? "inline",
    listBooleanFilterUiStyle: listBooleanSpec?.uiStyle,
    listAppendWhereHintFilterEnabled,
    listAppendWhereHintSpecs,
    listAppendWhereHintSegments,
    onListAppendWhereHintSegmentChange,
    listYearMonthFilterEnabled,
    listYearMonthFilterRequired,
    listYearMonthFilterLabel:
      listYearMonthSpec?.label ?? "Reporting period",
    listYearMonthPeriod,
    listYearMonthFilterSelectValue,
    listYearMonthFilterOptions,
    listYearMonthFilterPending: reportingPeriodsQuery.isPending,
    onListYearMonthFilterChange,
    listDateRangeFilterEnabled,
    listDateRangeFilterRows,
    createFormListDateFilterDefaults,
    onListDateRangeChange,
    listRelationFilterEnabled,
    listRelationFilterRows,
    onRelationFilterChange,
    onRelationMultiFilterChange,
    hasActiveListFilters,
    clearAllListFilters,
    listFiltersDifferFromDefaults,
    resetListFiltersToDefaults,
    createCols,
    createEnabled: createCols.length > 0 && !adminUiMutationsDisabled,
    patchCols,
    crudListRelationFieldOptions,
    crudDialog,
    openCreateDialog,
    closeCrudDialog,
    pageSizeOptions,
    listLimit,
    onPageSizeChange,
    listQuery,
    listPayload,
    totalCount,
    totalPages,
    displayPage,
    rowCount,
    goToPage,
    goNextPage,
    goPrevPage,
    createMutation,
    updateMutation,
    deleteMutation,
    requestDeleteRow,
    deleteLabelColumnKey: cfg.deleteLabelColumnKey,
    table,
    onEditRelatedDetailLoaded,
    startEdit,
    listCols,
    listTableQuickCompact,
    listTableColumnDividers,
    listQuickDesktopCards,
    listRowHighlight: cfg.listRowHighlight,
    listLayoutMode,
    setListLayoutMode,
    refetchEditDialogDetailFromApi,
    promoteCreateDialogToEditFromApiRow,
  }
}
