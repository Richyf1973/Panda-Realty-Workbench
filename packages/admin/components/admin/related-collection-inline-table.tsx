"use client"

import { Loader2, Pencil } from "lucide-react"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table"
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react"

import { useAdminClientRegistry } from "../../admin-client-registry-context"
import type { AdminEntityCrudFormSubscribeApi } from "../../admin-entity-crud-form-subscribe-api"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type {
  AdminEntityCrudRelatedCollectionTable,
  AdminEntityDefinition,
} from "../../admin-entity-types"
import {
  emptyDraftLine,
  lineIsEmptyForPersist,
  mergeRelatedInlineDetailHydrateLines,
  normalizeTrailingDrafts,
  serverRowsToLines,
  type LineIsEmptyForPersistOptions,
  type LineRow,
} from "../../admin-entity-crud-related-collections-draft"
import {
  adminEntityRelatedInlineTableOnCreate,
  evalRelatedInlineVirtualNumeric,
  parseRelatedEmbedPreviewNumericField,
  relatedInlineCellMetaToStyle,
  relatedInlineRowMatchesEmbedPatch,
  RELATED_INLINE_STICKY_ACTIONS_DIM_CLASS,
  RELATED_INLINE_STICKY_ACTIONS_MASK_CARD,
  RELATED_INLINE_STICKY_ACTIONS_MASK_MUTED,
  RELATED_INLINE_STICKY_BEFORE_ACTIONS_RIGHT_CLASS,
  type RelatedInlineCellColumnMeta,
} from "../../admin-entity-crud-related-inline-helpers"
import { computeRelatedInlineActionsColumnCalc } from "../../admin-entity-related-inline-actions-width"
import { relatedInlineColumnAlignClass, useRelatedInlineTableConfig } from "./related-collection-inline-config"
import { createRelatedInlineTableKeyDownHandler } from "./related-collection-inline-table-keydown"
import { useRelatedInlineLineMutations } from "./related-collection-inline-line-mutations"
import { useAdminCrudFormInteractionLockRegister } from "../../admin-crud-form-interaction-lock-context"
import { getAdminRelatedInlineDraftSyncVersion, subscribeAdminRelatedInlineDraftSync, useAdminRelatedInlineDraftSyncVersion, useAdminRelatedInlineForcedEmbedRefreshVersion } from "../../admin-related-inline-draft-sync"
import { useOptionalAdminNestedEntityCrud } from "./admin-nested-entity-crud-context"
import { type AdminMultiSelectRelationOption } from "./admin-entity-crud-list-relation-multi-select-popover-control"
import { Button } from "@repo/ui/button"
import { cn } from "@repo/ui/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/tooltip"
import { DisabledCurrencyAmountFooterInput } from "./related-collection-inline-footer-input"
import {
  buildRelatedInlineTableColumns,
  nestedEntityEditUiContextFromParentPropertyLine,
  type RelatedInlineColumnDefsCtx,
} from "./related-collection-inline-column-defs"
import { useRelatedInlineFocusRestore } from "./use-related-inline-focus-restore"
import { useRelatedInlineExtrasSync } from "./use-related-inline-extras-sync"
import { useRelatedInlinePostProcessors } from "./use-related-inline-post-processors"
import { useRelatedInlineRelationOptions } from "./use-related-inline-relation-options"
import { RelatedCollectionInlineTableFooter } from "./related-collection-inline-table-footer"

export function RelatedCollectionInlineTable({
  parentSlug,
  collection,
  variant,
  entityRowId,
  detailPayload,
  detailPending,
  detailError,
  onExtrasPayloadSynced,
  parentCrudForm,
  parentCrossPageViewOnly = false,
  refetchParentEntityDetail,
  promoteCreateDialogToEditFromApiRow,
}: {
  parentSlug: AdminEntitySlug
  collection: AdminEntityCrudRelatedCollectionTable
  variant: "create" | "edit"
  entityRowId: string | null
  detailPayload: Record<string, unknown> | undefined
  detailPending: boolean
  detailError: string | null
  onExtrasPayloadSynced?: () => void
  parentCrudForm?: AdminEntityCrudFormSubscribeApi
  /** Parent edit dialog opened from another list (read-only browse). */
  parentCrossPageViewOnly?: boolean
  refetchParentEntityDetail?: () => Promise<void>
  promoteCreateDialogToEditFromApiRow?: (
    createdRow: Record<string, unknown>,
  ) => void
}) {
  const hideRelatedRowActions = parentCrossPageViewOnly === true
  const {
    adminEntities,
    adminEntityCrudExtrasForSaveRef,
    loadAdminEntityDefinition,
    evalRelatedInlineVirtualRegistryNumeric,
    relatedCollectionLinesChangePostProcess,
    relatedCollectionLinesAsyncPostProcess,
    renderCrudRelatedTableToolbar,
    renderCrudRelatedInlineRowActionsByKey,
    adminUiMutationsDisabled,
    frontendConfig,
    buildExperimentalRelatedExtrasPayload,
  } = useAdminClientRegistry()
  const evalRelatedInlineVirtualRegistryNumericRef = useRef(
    evalRelatedInlineVirtualRegistryNumeric,
  )
  evalRelatedInlineVirtualRegistryNumericRef.current =
    evalRelatedInlineVirtualRegistryNumeric
  const childCfg = adminEntities[collection.childEntitySlug]
  const parentEntityCrudSparseItemsOnly =
    adminEntities[parentSlug]?.crudRelatedItemsSparsePatchOnly === true

  const relatedDraftGeneration = useAdminRelatedInlineDraftSyncVersion()
  const forcedEmbedRefreshVersion = useAdminRelatedInlineForcedEmbedRefreshVersion()
  const lastForcedEmbedRefreshVersionRef = useRef(forcedEmbedRefreshVersion)

  const nestedCrud = useOptionalAdminNestedEntityCrud()
  const nestedCrudRef = useRef(nestedCrud)
  nestedCrudRef.current = nestedCrud
  const hasNestedCrudControls = Boolean(
    collection.openChildInNestedCrudDialog && nestedCrud,
  )
  const relatedTargetNestedSpec = collection.openRelatedTargetInNestedCrudDialog
  const hasRelatedTargetNestedControls = Boolean(
    nestedCrud && relatedTargetNestedSpec,
  )
  /** Inline {@link wrapRelatedTargetNestedEditBesideControl} already adds the same open action beside the FK control. */
  const suppressRelatedTargetTrailingRowOpenButton =
    relatedTargetNestedSpec != null &&
    (collection.inlineEditableColumnKeys as readonly string[]).includes(
      relatedTargetNestedSpec.lineColumnKey,
    )

  const detailPayloadRef = useRef(detailPayload)
  detailPayloadRef.current = detailPayload

  const inlineRowActionsKey = collection.registryRelatedInlineRowActionsKey
  const renderInlineRowActionsFn =
    inlineRowActionsKey != null
      ? renderCrudRelatedInlineRowActionsByKey?.[inlineRowActionsKey]
      : undefined

  const relatedInlineActionsColWidthCalc = useMemo(
    () =>
      computeRelatedInlineActionsColumnCalc({
        collection,
        hasCustomRowActions: renderInlineRowActionsFn != null,
        hasNestedOpenButton:
          hasNestedCrudControls &&
          collection.openChildInNestedCrudDialog != null,
        hasRelatedTargetNestedOpenButton:
          hasRelatedTargetNestedControls &&
          relatedTargetNestedSpec != null &&
          !suppressRelatedTargetTrailingRowOpenButton,
      }),
    [
      collection,
      renderInlineRowActionsFn,
      hasNestedCrudControls,
      hasRelatedTargetNestedControls,
      relatedTargetNestedSpec,
      suppressRelatedTargetTrailingRowOpenButton,
      collection.openChildInNestedCrudDialog,
      collection.inlineCustomRowActionIconSlots,
      collection.inlineRowActionsColumnWidthRemOverride,
    ],
  )

  const wrapRelatedTargetNestedEditBesideControl = useCallback(
    (
      columnKey: string,
      line: LineRow,
      viewRo: boolean,
      control: ReactNode,
    ): ReactNode => {
      if (
        !hasRelatedTargetNestedControls ||
        relatedTargetNestedSpec == null ||
        relatedTargetNestedSpec.lineColumnKey !== columnKey
      ) {
        return control
      }
      const rowIdKey = relatedTargetNestedSpec.rowIdColumnKey ?? relatedTargetNestedSpec.lineColumnKey
      const raw = line[rowIdKey]
      const rowId =
        typeof raw === "string"
          ? raw.trim()
          : String(raw ?? "").trim()
      const canOpen = rowId !== ""
      const nc = nestedCrudRef.current
      const busy = nc?.nestedCrudBusyRowId === rowId
      const ariaLabel =
        relatedTargetNestedSpec.ariaLabel ??
        relatedTargetNestedSpec.buttonLabel ??
        `Edit ${relatedTargetNestedSpec.relatedEntitySlug}`
      const tooltip = relatedTargetNestedSpec.tooltip ?? ariaLabel
      return (
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <div className="min-w-0 flex-1">{control}</div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="shrink-0"
                disabled={
                  !canOpen ||
                  viewRo ||
                  busy ||
                  adminUiMutationsDisabled === true
                }
                aria-label={ariaLabel}
                aria-busy={busy}
                data-testid={`admin-entity-crud-related-open-related-target--${parentSlug}--${collection.jsonKey}--inline--${line.clientKey}`}
                onClick={() => {
                  const nestedCtx = nestedEntityEditUiContextFromParentPropertyLine({
                    parentSlug,
                    relatedEntitySlug: relatedTargetNestedSpec.relatedEntitySlug,
                    parentFkColumnKey: collection.parentFkColumnKey,
                    line,
                    parentEntityRowId: entityRowId,
                  })
                  void nc?.openNestedEntityEdit({
                    slug: relatedTargetNestedSpec.relatedEntitySlug,
                    rowId,
                    ...(relatedTargetNestedSpec.dialogEditSingular != null
                      ? { overrideSingular: relatedTargetNestedSpec.dialogEditSingular }
                      : {}),
                    ...nestedCtx,
                  })
                }}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Pencil data-icon="inline-start" className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{tooltip}</TooltipContent>
          </Tooltip>
        </div>
      )
    },
    [
      adminUiMutationsDisabled,
      collection.jsonKey,
      collection.parentFkColumnKey,
      entityRowId,
      hasRelatedTargetNestedControls,
      parentSlug,
      relatedTargetNestedSpec,
    ],
  )

  const {
    crudRelatedRelationOptionsByColumnKey,
    relationNumericMaps,
    relationAsyncFilterSelectionsByRelatedSlug,
    crudInlineRelationAwaitingParentDetailByRelatedSlug,
  } = useRelatedInlineRelationOptions({
    childCfg,
    collection,
    parentSlug,
    detailPayload,
    adminEntities,
    parentCrudForm,
    loadAdminEntityDefinition,
  })

  const {
    parentFkFormTickle,
    persistKey,
    zeroSentinelKeys,
    footerSumColumnKeys,
    hasFooterSums,
    inlineReadonlyColumnKeys,
    inlineVirtualColumns,
    inlineRelationEmbedColumns,
    inlinePinnedEndColumnKey,
    inlinePinnedStartColumnKey,
    virtualColumnByFooterKey,
    embedColumnByFooterKey,
    orderedInlineColumnSpecs,
    relatedLineHydrateKeys,
    implicitLineFieldsFromParentFk,
    implicitLineFieldsFromParentFkRef,
    implicitPersistIgnoreKeys,
  } = useRelatedInlineTableConfig({
    childCfg,
    collection,
    detailPayload,
    entityRowId,
    variant,
    parentCrudForm,
  })

  // One-shot: capture the first loaded option for FK columns listed in
  // `inlineNewDraftSeedFirstRelationOptionKeys` so new draft rows are pre-filled.
  // Guarded by a ref so it fires exactly once — subsequent option re-fetches (e.g. on
  // re-focus) do not re-trigger setLines and wipe user edits.
  const seedFirstOptionKeys = collection.inlineNewDraftSeedFirstRelationOptionKeys
  const firstOptionPresetSeededRef = useRef(false)
  const [firstRelationOptionPreset, setFirstRelationOptionPreset] = useState<Record<
    string,
    string
  > | null>(null)
  useEffect(() => {
    if (firstOptionPresetSeededRef.current) return
    if (!seedFirstOptionKeys || seedFirstOptionKeys.length === 0) return
    const preset: Record<string, string> = {}
    for (const k of seedFirstOptionKeys) {
      const opts = crudRelatedRelationOptionsByColumnKey[k]
      if (!opts || opts.optionsPending || opts.options.length === 0) return
      preset[k] = opts.options[0]!.value
    }
    if (Object.keys(preset).length === 0) return
    firstOptionPresetSeededRef.current = true
    setFirstRelationOptionPreset(preset)
  }, [seedFirstOptionKeys, crudRelatedRelationOptionsByColumnKey])

  const relatedInlineDraftPreset = useMemo(() => {
    const treat: Record<string, string> = {}
    const rawTreat = collection.relatedInlineNewDraftTreatFieldValuesAsEmpty
    const treatEmptyFieldDefaultSeeds: Record<string, string> = {}
    if (rawTreat != null) {
      for (const [k, v] of Object.entries(rawTreat)) {
        if (v != null && v !== "") {
          treat[k] = v
          treatEmptyFieldDefaultSeeds[k] = v
        }
      }
    }
    const preset: Record<string, string> = {}
    const dk = collection.inlineEmptyDraftTodayLocalIsoDateKeys
    if (dk != null && dk.length > 0) {
      const d = new Date()
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      for (const k of dk) {
        preset[k] = iso
        treat[k] = iso
      }
    }
    if (firstRelationOptionPreset != null) {
      for (const [k, v] of Object.entries(firstRelationOptionPreset)) {
        preset[k] = v
        treat[k] = v
      }
    }
    for (const [k, v] of Object.entries(treatEmptyFieldDefaultSeeds)) {
      preset[k] = v
    }
    if (Object.keys(preset).length === 0 && Object.keys(treat).length === 0) {
      return null
    }
    return {
      presetEditableValues: Object.keys(preset).length ? preset : undefined,
      lineEmptyOptions:
        Object.keys(treat).length > 0
          ? ({
              newDraftTreatFieldValuesAsEmpty: treat,
            } satisfies LineIsEmptyForPersistOptions)
          : undefined,
    }
  }, [
    collection.inlineEmptyDraftTodayLocalIsoDateKeys,
    collection.relatedInlineNewDraftTreatFieldValuesAsEmpty,
    firstRelationOptionPreset,
  ])

  const relatedInlineDraftPackRef = useRef<{
    presetEditableValues?: Readonly<Record<string, string>>
    lineEmptyOptions?: LineIsEmptyForPersistOptions
  } | null>(null)
  relatedInlineDraftPackRef.current = relatedInlineDraftPreset

  const [lines, setLines] = useState<LineRow[]>(() => [
    { clientKey: crypto.randomUUID() },
  ])

  const [relatedInlineVisibleLinesPredicate, setRelatedInlineVisibleLinesPredicate] =
    useState<((line: LineRow) => boolean) | null>(null)

  /**
   * While a client-side row predicate is active (e.g. inventory "Zero price only"),
   * keep the row that contains focus visible until focus moves outside the tbody so
   * keystrokes in Price do not filter the row out mid-edit.
   */
  const [
    relatedInlinePredicateFocusBypassClientKey,
    setRelatedInlinePredicateFocusBypassClientKey,
  ] = useState<string | null>(null)

  useEffect(() => {
    if (relatedInlineVisibleLinesPredicate == null) {
      setRelatedInlinePredicateFocusBypassClientKey(null)
    }
  }, [relatedInlineVisibleLinesPredicate])

  const relatedInlineVisibleLinesPredicateRef = useRef(
    relatedInlineVisibleLinesPredicate,
  )
  relatedInlineVisibleLinesPredicateRef.current =
    relatedInlineVisibleLinesPredicate

  const relatedBodyFocusListenersCleanupRef = useRef<(() => void) | null>(null)

  const setRelatedInlineBodyEl = useCallback(
    (root: HTMLTableSectionElement | null) => {
      relatedBodyFocusListenersCleanupRef.current?.()
      relatedBodyFocusListenersCleanupRef.current = null
      if (root == null) return

      const onFocusIn = (ev: Event) => {
        const e = ev as globalThis.FocusEvent
        if (relatedInlineVisibleLinesPredicateRef.current == null) return
        const t = e.target as Element | null
        if (t == null || !root.contains(t)) return
        const tr = t.closest("tr")
        if (tr == null || !root.contains(tr)) return
        const ck = tr.getAttribute("data-line-client-key")
        if (ck != null && ck !== "") {
          setRelatedInlinePredicateFocusBypassClientKey(ck)
        }
      }

      const onFocusOut = (ev: Event) => {
        const e = ev as globalThis.FocusEvent
        if (relatedInlineVisibleLinesPredicateRef.current == null) return
        const next = e.relatedTarget as Element | null
        if (next != null && root.contains(next)) return
        queueMicrotask(() => {
          const ae = document.activeElement as Element | null
          if (ae == null || !root.contains(ae)) {
            setRelatedInlinePredicateFocusBypassClientKey(null)
          }
        })
      }

      root.addEventListener("focusin", onFocusIn)
      root.addEventListener("focusout", onFocusOut)
      relatedBodyFocusListenersCleanupRef.current = () => {
        root.removeEventListener("focusin", onFocusIn)
        root.removeEventListener("focusout", onFocusOut)
      }
    },
    [],
  )

  const displayLines = useMemo(() => {
    const pred = relatedInlineVisibleLinesPredicate
    if (pred == null || typeof pred !== "function") return lines
    const bypass = relatedInlinePredicateFocusBypassClientKey
    return lines.filter(
      (line): line is LineRow =>
        line != null &&
        (pred(line) ||
          (bypass != null && line.clientKey === bypass)),
    )
  }, [
    lines,
    relatedInlineVisibleLinesPredicate,
    relatedInlinePredicateFocusBypassClientKey,
  ])

  const linesRefForEmbedHydrate = useRef(lines)
  linesRefForEmbedHydrate.current = lines

  /**
   * Set to `true` immediately before `setLines` is called by the async post-process effect.
   * The extras-sync effect reads and resets this flag to skip `onExtrasPayloadSynced` for
   * those updates — preventing the async post-processor from triggering a `relatedDraftGeneration`
   * bump that would re-fire the async effect in an infinite loop.
   */
  const linesFromAsyncPostProcessRef = useRef(false)

  const {
    pendingRelatedInlineFocusRestoreRef,
    pendingTabFocusTbodyRef: pendingTabFocusTbodyRefFromHook,
    pendingTabFocusNewRowAtEndRef,
    captureFocusBeforeUpdate,
  } = useRelatedInlineFocusRestore({
    childCfg,
    parentSlug,
    collectionJsonKey: collection.jsonKey,
    relatedDraftGeneration,
    linesRefForEmbedHydrate,
  })

  const persistWhenAnyEditableContent =
    collection.persistWhenAnyEditableContent === true

  const persistedLinesForFooter = useMemo(() => {
    const leo = relatedInlineDraftPreset?.lineEmptyOptions
    if (persistWhenAnyEditableContent) {
      return lines.filter(
        (l) =>
          !lineIsEmptyForPersist(
            l,
            persistKey,
            zeroSentinelKeys,
            implicitPersistIgnoreKeys,
            leo,
          ),
      )
    }
    return lines.filter((l) => String(l[persistKey] ?? "").trim() !== "")
  }, [
    lines,
    persistKey,
    persistWhenAnyEditableContent,
    zeroSentinelKeys,
    implicitPersistIgnoreKeys,
    relatedInlineDraftPreset,
  ])

  const footerSumsByKey = useMemo(() => {
    const sums: Record<string, number> = Object.create(null) as Record<
      string,
      number
    >
    for (const key of footerSumColumnKeys) {
      sums[key] = 0
    }
    for (const line of persistedLinesForFooter) {
      for (const key of footerSumColumnKeys) {
        const vcol = virtualColumnByFooterKey.get(key)
        if (vcol != null) {
          const p = evalRelatedInlineVirtualNumeric(
            vcol,
            line,
            relationNumericMaps,
            detailPayload,
            evalRelatedInlineVirtualRegistryNumeric,
          )
          if (p != null && Number.isFinite(p)) {
            sums[key] = (sums[key] ?? 0) + p
          }
          continue
        }
        const ec = embedColumnByFooterKey.get(key)
        if (ec != null) {
          const p = parseRelatedEmbedPreviewNumericField(line, ec)
          if (p != null && Number.isFinite(p)) {
            sums[key] = (sums[key] ?? 0) + p
          }
          continue
        }
        const raw = line[key]
        const s =
          typeof raw === "string" ? raw.trim() : String(raw ?? "").trim()
        if (s === "") continue
        const n = Number(s)
        if (!Number.isFinite(n)) continue
        sums[key] = (sums[key] ?? 0) + n
      }
    }
    return sums
  }, [
    persistedLinesForFooter,
    footerSumColumnKeys,
    virtualColumnByFooterKey,
    embedColumnByFooterKey,
    relationNumericMaps,
    detailPayload,
    evalRelatedInlineVirtualRegistryNumeric,
  ])

  const lockOnImbalance = collection.lockParentFormWhenSumsUnequal === true
  const sumsUnequal = useMemo(() => {
    if (!lockOnImbalance || footerSumColumnKeys.length !== 2) return false
    const [keyA, keyB] = footerSumColumnKeys as [string, string]
    const a = footerSumsByKey[keyA] ?? 0
    const b = footerSumsByKey[keyB] ?? 0
    return Math.abs(a - b) > 0.0001
  }, [lockOnImbalance, footerSumColumnKeys, footerSumsByKey])

  const hasAnyPersistedLines = persistedLinesForFooter.length > 0
  const balanceStatus: "balanced" | "unbalanced" | undefined =
    lockOnImbalance && footerSumColumnKeys.length === 2
      ? hasAnyPersistedLines
        ? sumsUnequal
          ? "unbalanced"
          : "balanced"
        : "unbalanced"
      : undefined

  useAdminCrudFormInteractionLockRegister(
    lockOnImbalance && (sumsUnequal || !hasAnyPersistedLines),
  )

  const { applyRelatedInlineExtrasForSave } = useRelatedInlineExtrasSync({
    childCfg,
    adminEntityCrudExtrasForSaveRef,
    collection,
    persistKey,
    zeroSentinelKeys,
    implicitPersistIgnoreKeys,
    implicitLineFieldsFromParentFk,
    relatedInlineDraftPreset,
    adminEntities,
    parentSlug,
    variant,
    detailPayload,
    persistWhenAnyEditableContent,
    parentEntityCrudSparseItemsOnly,
    buildExperimentalRelatedExtrasPayload,
    frontendConfig,
    onExtrasPayloadSynced,
    lines,
    linesFromAsyncPostProcessRef,
  })

  const initialFromDetail = detailPayload?.[collection.jsonKey]
  /**
   * Hydrate `lines` from GET detail **before paint** so the following `useEffect` that writes
   * `adminEntityCrudExtrasForSaveRef` (sparse inventory diffs, etc.) never runs with **stale** `lines`
   * while `detailPayload` is already fresh — that one-tick mismatch emitted mass `_deleted` ops.
   */
  useLayoutEffect(() => {
    if (!childCfg) return
    const implicitFk = implicitLineFieldsFromParentFkRef.current
    const implicitIgnore =
      implicitFk == null ? undefined : new Set(Object.keys(implicitFk))
    if (variant === "create") {
      if (adminEntityRelatedInlineTableOnCreate(collection)) {
        const pk = collection.parentFkColumnKey
        const fkTrim =
          implicitFk?.[pk] != null ? String(implicitFk[pk]).trim() : ""
        setLines((prev) => {
          const pack = relatedInlineDraftPackRef.current
          const allLinesEmpty = prev.every((l) =>
            lineIsEmptyForPersist(
              l,
              persistKey,
              zeroSentinelKeys,
              implicitIgnore,
              pack?.lineEmptyOptions,
            ),
          )
          if (fkTrim === "") {
            if (allLinesEmpty) {
              return [
                emptyDraftLine(
                  childCfg,
                  collection.inlineEditableColumnKeys,
                  undefined,
                  pack?.presetEditableValues,
                ),
              ]
            }
            let changed = false
            const cleared = prev.map((l) => {
              if (!Object.hasOwn(l, pk)) return l
              changed = true
              const next = { ...l }
              delete next[pk]
              return next
            })
            return changed ? cleared : prev
          }
          if (prev.length === 0 || allLinesEmpty) {
            return [
              emptyDraftLine(
                childCfg,
                collection.inlineEditableColumnKeys,
                implicitFk,
                pack?.presetEditableValues,
              ),
            ]
          }
          let changed = false
          const withParentFk = prev.map((l) => {
            if (String(l[pk] ?? "").trim() === fkTrim) return l
            changed = true
            return { ...l, [pk]: fkTrim }
          })
          return changed ? withParentFk : prev
        })
        return
      }
      setLines([
        emptyDraftLine(
          childCfg,
          collection.inlineEditableColumnKeys,
          implicitFk,
          relatedInlineDraftPackRef.current?.presetEditableValues,
        ),
      ])
      return
    }
    if (!Array.isArray(initialFromDetail)) return
    const fromServer = serverRowsToLines(
      initialFromDetail,
      childCfg,
      collection.inlineEditableColumnKeys,
      inlineReadonlyColumnKeys,
      relatedLineHydrateKeys,
    )
    const lineEmptyOptions = relatedInlineDraftPackRef.current?.lineEmptyOptions
    const normalized = normalizeTrailingDrafts(
      fromServer,
      persistKey,
      zeroSentinelKeys,
      childCfg,
      collection.inlineEditableColumnKeys,
      implicitFk,
      relatedInlineDraftPackRef.current?.presetEditableValues,
      lineEmptyOptions,
    )
    const ignoreImplicit = implicitFk
      ? new Set(Object.keys(implicitFk))
      : undefined
    const merged = mergeRelatedInlineDetailHydrateLines(
      lines,
      normalized,
      persistKey,
      zeroSentinelKeys,
      ignoreImplicit,
      lineEmptyOptions,
    )
    setLines(merged)
    /** Same tick as `setLines`: extras ref must not read pre-hydration `lines` (sparse wipe bug). */
    applyRelatedInlineExtrasForSave(merged)
    /**
     * Read implicit FK from {@link implicitLineFieldsFromParentFkRef} only — omitting
     * **`implicitLineFieldsFromParentFk`** / **`implicitPersistIgnoreKeys`** from deps avoids
     * re-hydrating server lines when parent form identity churn recreates the memoized object.
     * **`parentFkFormTickle`** stays listed so create-mode preset FK still tracks the parent field.
     */
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `lines` read as prior snapshot when detail changes only; listing it would re-hydrate every keystroke and clobber saved-row edits.
  }, [
    variant,
    initialFromDetail,
    childCfg,
    collection.inlineEditableColumnKeys,
    collection.inlineTableOnCreate,
    collection.parentFkColumnKey,
    inlineReadonlyColumnKeys,
    relatedLineHydrateKeys,
    parentFkFormTickle,
    persistKey,
    zeroSentinelKeys,
    relatedInlineDraftPreset,
    applyRelatedInlineExtrasForSave,
  ])

  const {
    updateLine,
    addEmptyRow,
    performDeleteLine,
    applyMultiSelectFkLines,
    immediateDeleteBusyClientKey,
    immediateDeleteError,
  } = useRelatedInlineLineMutations({
    childCfg,
    persistKey,
    zeroSentinelKeys,
    collection,
    implicitLineFieldsFromParentFk,
    implicitPersistIgnoreKeys,
    relatedInlineDraftPack: relatedInlineDraftPreset,
    adminEntities,
    variant,
    refetchParentEntityDetail,
    captureFocusBeforeUpdate,
    setLines,
  })





  useRelatedInlinePostProcessors({
    childCfg,
    collection,
    adminEntities,
    parentSlug,
    lines,
    linesRefForEmbedHydrate,
    linesFromAsyncPostProcessRef,
    forcedEmbedRefreshVersion,
    lastForcedEmbedRefreshVersionRef,
    persistKey,
    zeroSentinelKeys,
    implicitPersistIgnoreKeys,
    implicitLineFieldsFromParentFk,
    detailPending,
    parentCrudForm,
    variant,
    relatedDraftGeneration,
    relatedCollectionLinesChangePostProcess,
    relatedCollectionLinesAsyncPostProcess,
    setLines,
  })

  const idKey = childCfg?.idColumn.jsonKey ?? "id"

  /**
   * Relation-option / rollup maps update when TanStack Query resolves; if they are deps of `columns`,
   * column defs are recreated and inline inputs remount (focus lost mid-keystroke). Cells read latest
   * data through refs instead.
   */
  const crudRelatedRelationOptionsByColumnKeyRef = useRef(
    crudRelatedRelationOptionsByColumnKey,
  )
  crudRelatedRelationOptionsByColumnKeyRef.current =
    crudRelatedRelationOptionsByColumnKey

  const relationNumericMapsRef = useRef(relationNumericMaps)
  relationNumericMapsRef.current = relationNumericMaps

  const relationAsyncFilterSelectionsByRelatedSlugRef = useRef(
    relationAsyncFilterSelectionsByRelatedSlug,
  )
  relationAsyncFilterSelectionsByRelatedSlugRef.current =
    relationAsyncFilterSelectionsByRelatedSlug

  const crudInlineRelationAwaitingParentDetailByRelatedSlugRef = useRef(
    crudInlineRelationAwaitingParentDetailByRelatedSlug,
  )
  crudInlineRelationAwaitingParentDetailByRelatedSlugRef.current =
    crudInlineRelationAwaitingParentDetailByRelatedSlug

  const updateLineRef = useRef(updateLine)
  updateLineRef.current = updateLine
  const performDeleteLineRef = useRef(performDeleteLine)
  performDeleteLineRef.current = performDeleteLine
  const addEmptyRowRef = useRef(addEmptyRow)
  addEmptyRowRef.current = addEmptyRow
  const applyMultiSelectFkLinesRef = useRef(applyMultiSelectFkLines)
  applyMultiSelectFkLinesRef.current = applyMultiSelectFkLines
  const wrapRelatedTargetNestedEditBesideControlRef = useRef(
    wrapRelatedTargetNestedEditBesideControl,
  )
  wrapRelatedTargetNestedEditBesideControlRef.current =
    wrapRelatedTargetNestedEditBesideControl

  const columns = useMemo((): ColumnDef<LineRow>[] => {
    if (!childCfg) return []
    const ctx: RelatedInlineColumnDefsCtx = {
      adminUiMutationsDisabled,
      childCfg,
      collection,
      adminEntities,
      renderInlineRowActionsFn,
      inlinePinnedEndColumnKey,
      inlinePinnedStartColumnKey,
      hasNestedCrudControls,
      hasRelatedTargetNestedControls,
      relatedTargetNestedSpec,
      suppressRelatedTargetTrailingRowOpenButton,
      idKey,
      orderedInlineColumnSpecs,
      parentSlug,
      variant,
      parentCrossPageViewOnly,
      entityRowId,
      parentCrudForm,
      updateLine,
      setLines,
      persistKey,
      zeroSentinelKeys,
      implicitLineFieldsFromParentFk,
      crudRelatedRelationOptionsByColumnKeyRef,
      crudInlineRelationAwaitingParentDetailByRelatedSlugRef,
      linesRefForEmbedHydrate,
      wrapRelatedTargetNestedEditBesideControlRef,
      updateLineRef,
      applyMultiSelectFkLinesRef,
      nestedCrudRef,
      performDeleteLineRef,
      immediateDeleteBusyClientKey,
      relationAsyncFilterSelectionsByRelatedSlugRef,
      relationNumericMapsRef,
      detailPayloadRef,
      evalRelatedInlineVirtualRegistryNumericRef,
    }
    return buildRelatedInlineTableColumns(ctx)
  }, [
    adminUiMutationsDisabled,
    childCfg,
    collection.childEntitySlug,
    collection.jsonKey,
    collection.openChildInNestedCrudDialog,
    collection.openRelatedTargetInNestedCrudDialog,
    renderInlineRowActionsFn,
    inlinePinnedEndColumnKey,
    inlinePinnedStartColumnKey,
    hasNestedCrudControls,
    hasRelatedTargetNestedControls,
    relatedTargetNestedSpec,
    suppressRelatedTargetTrailingRowOpenButton,
    idKey,
    orderedInlineColumnSpecs,
    parentSlug,
    variant,
    parentCrossPageViewOnly,
    immediateDeleteBusyClientKey,
    persistKey,
    zeroSentinelKeys,
    implicitLineFieldsFromParentFk,
  ])

  const table = useReactTable({
    data: displayLines,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (r) => r.clientKey,
  })

  const keyDownHandler = createRelatedInlineTableKeyDownHandler({
    pendingTabFocusTbodyRef: pendingTabFocusTbodyRefFromHook,
    addEmptyRowRef,
    linesRef: linesRefForEmbedHydrate,
    updateLineRef,
    table,
  })

  const editorTestId = `admin-entity-crud-related-editor--${parentSlug}--${collection.jsonKey}`

  const inlineTableRootRef = useRef<HTMLDivElement>(null)
  /**
   * Add-row button: mirror the Tab-add path so the new row's first cell (the pinned-start control —
   * e.g. the Item picker) is focused, keeping keyboard-driven continuous entry flowing.
   */
  const handleAddEmptyRowFromButton = () => {
    const tbody = inlineTableRootRef.current?.querySelector("table tbody")
    if (tbody instanceof HTMLTableSectionElement) {
      pendingTabFocusTbodyRefFromHook.current = tbody
      // The button appends the new row at the END (no trailing empty after it), so focus the LAST
      // row — not the second-to-last row that Tab-add targets.
      pendingTabFocusNewRowAtEndRef.current = true
    }
    addEmptyRow()
  }

  const anyRelationOptionsPending = Object.values(
    crudRelatedRelationOptionsByColumnKey,
  ).some((v) => v.optionsPending)

  if (!childCfg) return null

  if (variant === "edit" && entityRowId && detailPending) {
    return (
      <p
        className="text-sm text-muted-foreground"
        data-testid={`${editorTestId}--loading`}
      >
        Loading related rows…
      </p>
    )
  }

  if (variant === "edit" && entityRowId && detailError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {detailError}
      </p>
    )
  }

  if (variant === "create" && collection.inlineTableOnCreate === false) {
    return (
      <div className="space-y-2" data-testid={editorTestId}>
        <p className="text-sm text-muted-foreground">
          {collection.createModeHint ??
            "Save the parent row first, then you can edit related lines and save them with the parent."}
        </p>
      </div>
    )
  }

  const toolbarKey = collection.registryRelatedTableToolbarKey
  const toolbarSlot =
    toolbarKey != null && renderCrudRelatedTableToolbar != null
      ? renderCrudRelatedTableToolbar({
          parentSlug,
          variant,
          entityRowId,
          collection,
          detailPayload,
          lines,
          setLines,
          childCfg,
          persistKey,
          zeroSentinelKeys,
          implicitPersistIgnoreKeys,
          implicitLineFieldsFromParentFk,
          crudRelatedRelationOptionsByColumnKey,
          relationNumericMaps,
          parentCrudForm,
          setRelatedInlineVisibleLinesPredicate,
          relatedDraftGeneration,
          refetchParentEntityDetail,
          promoteCreateDialogToEditFromApiRow,
        })
      : null

  return (
    <div
      ref={inlineTableRootRef}
      className="flex min-h-0 min-w-0 flex-1 flex-col gap-3"
      data-testid={editorTestId}
      style={
        collection.inlineTableMinHeightPx != null
          ? { minHeight: collection.inlineTableMinHeightPx }
          : undefined
      }
    >
      {collection.createModeHint != null && variant === "create" ? (
        <p className="text-sm text-muted-foreground">
          {collection.createModeHint}
        </p>
      ) : null}
      {collection.relatedInlineImmediateDeleteViaChildApi === true &&
      immediateDeleteError != null ? (
        <p
          className="text-sm text-destructive"
          role="alert"
          data-testid={`admin-entity-crud-related-inline-delete-error--${parentSlug}--${collection.jsonKey}`}
        >
          {immediateDeleteError}
        </p>
      ) : null}
      {/*
        DOM order: grid first, toolbar second so Tab from the main form enters line-item
        cells before "Add empty row". Flex `order` keeps the toolbar visually above the grid.
      */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        {/*
          Relation-option fetches gate editing inside the grid only — keep the toolbar + "Add empty
          row" clickable while options refresh (avoids stuck toolbars / E2E timeouts).
        */}
        <div
          className={`order-2 min-h-0 min-w-0 w-full flex-1 touch-auto overflow-x-auto overflow-y-auto overscroll-x-contain rounded-md border border-border/80 scrollbar-galaxy [contain:layout]${anyRelationOptionsPending ? " pointer-events-none opacity-60" : ""}`}
          aria-busy={anyRelationOptionsPending || undefined}
          onKeyDownCapture={parentCrossPageViewOnly ? undefined : keyDownHandler}
        >
        <div
          className="relative w-fit min-w-full"
          style={
            !hideRelatedRowActions
              ? ({
                  ["--related-inline-actions-col" as string]:
                    relatedInlineActionsColWidthCalc,
                } as CSSProperties)
              : undefined
          }
        >
        {/*
          Avoid a large fixed table min-width: it forces horizontal scroll in narrow
          hosts (e.g. split related panels). Column cells use meta min/max widths instead.
        */}
        <table className="w-full min-w-0 border-collapse text-sm">
          <thead className="sticky top-0 z-30">
            {table.getHeaderGroups().map((hg) => (
              <tr
                key={hg.id}
                className="border-b border-border/80 bg-muted/95 backdrop-blur-sm"
              >
                {hg.headers.map((h) => {
                  const m = h.column.columnDef.meta as
                    | RelatedInlineCellColumnMeta
                    | undefined
                  return (
                    <th
                      key={h.id}
                      className={cn(
                        "px-2 py-2 font-medium",
                        relatedInlineColumnAlignClass(m),
                        m?.relatedStickyStart === true &&
                          "sticky left-0 z-1 bg-muted [box-shadow:inset_-1px_0_0_0_var(--border)]",
                        m?.relatedStickyEnd === true &&
                          cn(
                            "sticky z-1 overflow-hidden bg-muted [box-shadow:inset_1px_0_0_0_var(--border)]",
                            hideRelatedRowActions
                              ? "right-0"
                              : RELATED_INLINE_STICKY_BEFORE_ACTIONS_RIGHT_CLASS,
                            RELATED_INLINE_STICKY_ACTIONS_MASK_MUTED,
                          ),
                        m?.relatedStickyActions === true &&
                          cn(
                            "sticky right-0 z-2 overflow-hidden bg-muted",
                            RELATED_INLINE_STICKY_ACTIONS_DIM_CLASS,
                            RELATED_INLINE_STICKY_ACTIONS_MASK_MUTED,
                          ),
                      )}
                      style={relatedInlineCellMetaToStyle(m)}
                    >
                      {h.isPlaceholder
                        ? null
                        : flexRender(
                            h.column.columnDef.header,
                            h.getContext(),
                          )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody ref={setRelatedInlineBodyEl}>
            {table.getRowModel().rows.map((r) => {
              const line = r.original
              const savedId = line[idKey]
              const isSaved =
                typeof savedId === "number"
                  ? Number.isFinite(savedId)
                  : typeof savedId === "string" && /^\d+$/.test(savedId.trim())
              return (
                <tr
                  key={r.id}
                  data-line-client-key={line.clientKey}
                  className={
                    isSaved
                      ? "group border-b border-border/60"
                      : "group border-b border-border/60 bg-muted/10"
                  }
                  data-testid={
                    isSaved
                      ? `admin-entity-crud-related-row--${parentSlug}--${collection.jsonKey}--saved--${String(savedId)}`
                      : `admin-entity-crud-related-row--${parentSlug}--${collection.jsonKey}--draft--${line.clientKey}`
                  }
                >
                  {r.getVisibleCells().map((cell) => {
                    const m = cell.column.columnDef.meta as
                      | RelatedInlineCellColumnMeta
                      | undefined
                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          "px-2 py-1.5 align-middle",
                          relatedInlineColumnAlignClass(m),
                          m?.relatedStickyStart === true &&
                            "sticky left-0 z-12 bg-card [box-shadow:inset_-1px_0_0_0_var(--border)] group-hover:bg-[color-mix(in_oklch,var(--muted)_30%,var(--card))]",
                          m?.relatedStickyEnd === true &&
                            cn(
                              "sticky z-12 overflow-hidden bg-card [box-shadow:inset_1px_0_0_0_var(--border)] group-hover:bg-[color-mix(in_oklch,var(--muted)_30%,var(--card))]",
                              hideRelatedRowActions
                                ? "right-0"
                                : RELATED_INLINE_STICKY_BEFORE_ACTIONS_RIGHT_CLASS,
                              RELATED_INLINE_STICKY_ACTIONS_MASK_CARD,
                            ),
                          m?.relatedStickyActions === true &&
                            cn(
                              "sticky right-0 z-13 overflow-hidden bg-card group-hover:bg-[color-mix(in_oklch,var(--muted)_30%,var(--card))]",
                              RELATED_INLINE_STICKY_ACTIONS_DIM_CLASS,
                              RELATED_INLINE_STICKY_ACTIONS_MASK_CARD,
                            ),
                        )}
                        style={relatedInlineCellMetaToStyle(m)}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
          <RelatedCollectionInlineTableFooter
            show={hasFooterSums && persistedLinesForFooter.length > 0}
            editorTestId={editorTestId}
            orderedInlineColumnSpecs={orderedInlineColumnSpecs}
            footerSumsByKey={footerSumsByKey}
            footerSumColumnKeys={footerSumColumnKeys}
            childCfg={childCfg}
            collection={collection}
            adminEntities={adminEntities}
            parentSlug={parentSlug}
            hideRelatedRowActions={hideRelatedRowActions}
          />
        </table>
        {!hideRelatedRowActions ? (
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-35 w-2 bg-linear-to-l from-card to-transparent"
            aria-hidden
          />
        ) : null}
        </div>
        </div>
        <div className="order-1 flex w-full shrink-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-sm sm:font-medium">
              {collection.tabLabel}
            </h3>
            {balanceStatus != null ? (
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                  balanceStatus === "balanced"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
                )}
                data-testid={`${editorTestId}--balance-status`}
              >
                {balanceStatus === "balanced" ? "Balanced" : "Unbalanced"}
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {toolbarSlot}
            {!hideRelatedRowActions ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                data-testid={`${editorTestId}--add-row`}
                onClick={handleAddEmptyRowFromButton}
              >
                Add empty row
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
