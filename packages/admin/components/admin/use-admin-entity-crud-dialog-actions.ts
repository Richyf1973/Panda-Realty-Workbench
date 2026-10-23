"use client"

import { useCallback, useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react"
import { useRouter } from "next/navigation"
import type { QueryClient } from "@tanstack/react-query"

import { adminEntityFormColumnsInOrder } from "../../admin-entity-form-column-order"
import { adminEntityListDetailSeedFromRow } from "../../admin-entity-list-detail-seed"
import { buildAdminEntityPatchFormValuesFromApiRow } from "../../admin-entity-crud-form-values"
import { adminEntityPatchExtrasBaselineFromRow } from "../../admin-entity-patch-partial"
import { resolveAdminNestedPatchParentRefreshPlan } from "../../admin-nested-patch-parent-refresh"
import {
  notifyAdminRelatedInlineDraftSync,
  notifyAdminRelatedInlineForcedEmbedRefresh,
} from "../../admin-related-inline-draft-sync"
import {
  adminEntityColumnShowsManyRelationForm,
  adminEntityManyRelationFormValueFromListRow,
} from "../../admin-entity-many-relation-form"
import { cellString } from "../../admin-entity-admin-cell"
import {
  ADMIN_ENTITY_URL_DIALOG_VIEW_ONLY_PARAM,
  ADMIN_ENTITY_URL_OPEN_EDIT_PARAM,
  parseAdminEntityUrlOpenEditDialog,
} from "../../admin-entity-admin-list-fetch"
import type { AdminEntityDefinition, AdminEntityColumn } from "../../admin-entity-types"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type { AdminEntityCrudDialogState } from "./admin-entity-crud-dialog-state"
import type { AdminEntityTableRow } from "../../admin-entity-admin-types"
import { useAdminClientRegistry } from "../../admin-client-registry-context"

export function useAdminEntityCrudDialogActions({
  slug,
  cfg,
  idKey,
  patchCols,
  queryClient,
  setCrudDialog,
  crudDialogRef,
  adminUiMutationsDisabled,
  createMutationReset,
  updateMutationReset,
  deleteMutationMutate,
  pathname,
}: {
  slug: AdminEntitySlug
  cfg: AdminEntityDefinition
  idKey: string
  patchCols: readonly AdminEntityColumn[]
  queryClient: QueryClient
  setCrudDialog: Dispatch<SetStateAction<AdminEntityCrudDialogState>>
  crudDialogRef: MutableRefObject<AdminEntityCrudDialogState>
  adminUiMutationsDisabled: boolean
  createMutationReset: () => void
  updateMutationReset: () => void
  deleteMutationMutate: (rowId: string) => void
  pathname: string
}) {
  const router = useRouter()
  const {
    adminEntities,
    adminEntityPartialPatchBySlug,
    adminEntityCrudExtrasForSaveRef,
    adminNestedEntityPatchSuccessListenerRef,
    onAdminEntityPatchSuccessNotify,
  } = useAdminClientRegistry()

  const closeCrudDialog = useCallback(() => {
    setCrudDialog({ kind: "none" })
    createMutationReset()
    updateMutationReset()
  }, [createMutationReset, setCrudDialog, updateMutationReset])

  const openCreateDialog = useCallback(() => {
    if (adminUiMutationsDisabled) return
    createMutationReset()
    setCrudDialog({ kind: "create" })
  }, [adminUiMutationsDisabled, createMutationReset, setCrudDialog])

  const promoteCreateDialogToEditFromApiRow = useCallback(
    (data: Record<string, unknown>) => {
      const rawId = data[idKey]
      if (rawId == null) return
      void queryClient.invalidateQueries({ queryKey: cfg.queryKey })
      const listDetailSeed = adminEntityListDetailSeedFromRow(cfg, data as Record<string, unknown>)
      const editValues = buildAdminEntityPatchFormValuesFromApiRow({
        slug,
        patchCols,
        row: data,
        adminEntities,
      })
      const partial = adminEntityPartialPatchBySlug?.[slug] === true
      setCrudDialog({
        kind: "edit",
        rowId: String(rawId),
        values: editValues,
        detailSourceRow: data as Record<string, unknown>,
        ...(listDetailSeed != null ? { listDetailSeed } : {}),
        ...(partial
          ? {
              patchDiffBaseline: {
                formValues: { ...editValues },
                extrasByKey: adminEntityPatchExtrasBaselineFromRow(cfg, data as Record<string, unknown>),
              },
            }
          : {}),
      })
    },
    [adminEntities, adminEntityPartialPatchBySlug, cfg, idKey, patchCols, queryClient, setCrudDialog, slug],
  )

  const startEdit = useCallback(
    (row: AdminEntityTableRow) => {
      const rawId = row[idKey]
      updateMutationReset()
      const rowRecord = row as Record<string, unknown>
      const listDetailSeed =
        cfg.crudRelatedCollectionsAlwaysFetchDetailOnEdit === true
          ? undefined
          : adminEntityListDetailSeedFromRow(cfg, rowRecord)
      const values = Object.fromEntries(
        patchCols.map((c) => {
          if (
            c.listManyRelation &&
            adminEntityColumnShowsManyRelationForm(slug, c, adminEntities)
          ) {
            return [
              c.key,
              adminEntityManyRelationFormValueFromListRow(rowRecord, c.listManyRelation),
            ]
          }
          const rawStr = cellString(row[c.key]).trim()
          if (c.valueType === "numeric" && rawStr !== "") {
            const n = Number(rawStr)
            if (Number.isFinite(n)) return [c.key, String(n)]
          }
          return [c.key, rawStr]
        }),
      )
      const partial = adminEntityPartialPatchBySlug?.[slug] === true
      setCrudDialog({
        kind: "edit",
        rowId: String(rawId),
        values,
        detailSourceRow: rowRecord,
        ...(listDetailSeed != null ? { listDetailSeed } : {}),
        ...(partial
          ? {
              patchDiffBaseline: {
                formValues: { ...values },
                extrasByKey: adminEntityPatchExtrasBaselineFromRow(cfg, rowRecord),
              },
            }
          : {}),
      })
    },
    [
      adminEntities,
      adminEntityPartialPatchBySlug,
      cfg,
      idKey,
      patchCols,
      setCrudDialog,
      slug,
      updateMutationReset,
    ],
  )

  const openCrossEntityEdit = useCallback(
    async (
      targetSlug: AdminEntitySlug,
      rowId: string,
      options?: { crossPageFormLocked?: boolean },
    ) => {
      const targetCfg = adminEntities[targetSlug] as AdminEntityDefinition
      const res = await fetch(`${targetCfg.apiBase}/${encodeURIComponent(rowId)}`, {
        cache: "no-store",
      })
      if (!res.ok) return
      const detail = (await res.json()) as Record<string, unknown>
      const targetPatchCols = adminEntityFormColumnsInOrder(targetCfg, "patch")
      const values = buildAdminEntityPatchFormValuesFromApiRow({
        slug: targetSlug,
        patchCols: targetPatchCols,
        row: detail,
        adminEntities,
      })
      const listDetailSeed = adminEntityListDetailSeedFromRow(targetCfg, detail)
      const partial = adminEntityPartialPatchBySlug?.[targetSlug] === true
      updateMutationReset()
      const crossLocked =
        options?.crossPageFormLocked ??
        (targetSlug !== slug && targetCfg.allowCrossPageAdminEdit !== true)
      setCrudDialog({
        kind: "edit",
        rowId,
        values,
        detailSourceRow: detail,
        ...(listDetailSeed != null ? { listDetailSeed } : {}),
        ...(targetSlug !== slug ? { dialogEntitySlug: targetSlug } : {}),
        ...(crossLocked ? { crossPageFormLocked: true as const } : {}),
        ...(partial
          ? {
              patchDiffBaseline: {
                formValues: { ...values },
                extrasByKey: adminEntityPatchExtrasBaselineFromRow(targetCfg, detail),
              },
            }
          : {}),
      })
    },
    [adminEntities, adminEntityPartialPatchBySlug, setCrudDialog, slug, updateMutationReset],
  )

  const requestDeleteRow = useCallback(
    (rowId: string, deleteLabel: string) => {
      if (adminUiMutationsDisabled) return
      if (!window.confirm(`Delete ${cfg.ui.singular} "${deleteLabel}"? This cannot be undone.`)) {
        return
      }
      deleteMutationMutate(rowId)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- TanStack Query .mutate is stable
    [adminUiMutationsDisabled, cfg.ui.singular, deleteMutationMutate],
  )

  const onEditRelatedDetailLoaded = useCallback(
    (detail: Record<string, unknown>) => {
      setCrudDialog((prev) => {
        if (prev.kind !== "edit") return prev
        let next = prev

        const dialogCfg =
          prev.dialogEntitySlug != null
            ? (adminEntities[prev.dialogEntitySlug] as AdminEntityDefinition)
            : cfg

        if (prev.listDetailSeed == null) {
          const seed = adminEntityListDetailSeedFromRow(dialogCfg, detail)
          if (seed != null) {
            next = { ...next, listDetailSeed: seed, detailSourceRow: detail }
          } else {
            next = { ...next, detailSourceRow: detail }
          }
        } else {
          next = { ...next, detailSourceRow: detail }
        }

        const dialogSlug = (prev.dialogEntitySlug as AdminEntitySlug | undefined) ?? slug
        if (
          adminEntityPartialPatchBySlug?.[dialogSlug] === true &&
          dialogCfg.extraPatchBodyKeys?.length
        ) {
          const baseExtras = { ...(next.patchDiffBaseline?.extrasByKey ?? {}) }
          let extrasTouched = false
          for (const k of dialogCfg.extraPatchBodyKeys) {
            if (Object.hasOwn(detail, k) && !Object.hasOwn(baseExtras, k)) {
              baseExtras[k] = adminEntityPatchExtrasBaselineFromRow(dialogCfg, {
                [k]: detail[k],
              })[k] as unknown
              extrasTouched = true
            }
          }
          if (extrasTouched) {
            next = {
              ...next,
              patchDiffBaseline: {
                formValues: next.patchDiffBaseline?.formValues ?? { ...next.values },
                extrasByKey: baseExtras,
              },
            }
          }
        }

        return next
      })
    },
    [slug, cfg, adminEntities, adminEntityPartialPatchBySlug, setCrudDialog],
  )

  const refetchEditDialogDetailFromApi = useCallback(async () => {
    const dlg = crudDialogRef.current
    if (dlg.kind !== "edit") return

    const rowId = dlg.rowId
    const dialogSlug = (dlg.dialogEntitySlug ?? slug) as AdminEntitySlug
    const dialogCfg = adminEntities[dialogSlug] as AdminEntityDefinition | undefined
    if (dialogCfg?.apiBase == null || dialogCfg.apiBase === "") return

    const res = await fetch(
      `${dialogCfg.apiBase}/${encodeURIComponent(rowId)}`,
      { cache: "no-store" },
    )
    if (!res.ok) return

    const detail = (await res.json()) as Record<string, unknown>

    queryClient.setQueryData(["admin", "entity-detail", dialogSlug, rowId], detail)

    const listDetailSeed = adminEntityListDetailSeedFromRow(dialogCfg, detail)
    if (listDetailSeed == null) {
      setCrudDialog((prev) => {
        if (prev.kind !== "edit" || prev.rowId !== rowId) return prev
        if (prev.listDetailSeed === undefined) return prev
        return { ...prev, listDetailSeed: undefined, detailSourceRow: detail }
      })
    } else {
      setCrudDialog((prev) => {
        if (prev.kind !== "edit" || prev.rowId !== rowId) return prev
        return { ...prev, listDetailSeed, detailSourceRow: detail }
      })
    }
    queueMicrotask(() => notifyAdminRelatedInlineDraftSync())
  }, [adminEntities, crudDialogRef, queryClient, setCrudDialog, slug])

  /** Prevents duplicate `openEdit` handling when React strict mode re-runs effects before `router.replace` updates the URL. */
  const openEditUrlHandledRef = useRef<string | null>(null)

  /** Deep link: `/admin/<slug>?openEdit=<rowId>&dialogViewOnly=1` — strips params on load. */
  useEffect(() => {
    if (typeof window === "undefined") return
    const raw = window.location.search
    const handleKey = `${pathname}:${raw}`
    if (openEditUrlHandledRef.current === handleKey) return
    const sp = new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw)
    const deep = parseAdminEntityUrlOpenEditDialog(sp)
    if (deep == null) return

    openEditUrlHandledRef.current = handleKey

    const next = new URLSearchParams(sp)
    next.delete(ADMIN_ENTITY_URL_OPEN_EDIT_PARAM)
    next.delete(ADMIN_ENTITY_URL_DIALOG_VIEW_ONLY_PARAM)
    const qs = next.toString()
    router.replace(qs === "" ? pathname : `${pathname}?${qs}`, { scroll: false })

    void openCrossEntityEdit(slug, deep.rowId, {
      crossPageFormLocked: deep.viewOnly ? true : undefined,
    })
    // openCrossEntityEdit is stable (useCallback), so listing it is safe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, pathname, router])

  useEffect(() => {
    const listenerRef = adminNestedEntityPatchSuccessListenerRef
    if (!listenerRef) return

    const childPatch = cfg.refreshListDetailSeedAfterNestedChildPatch
    const relatedSlugs = cfg.refreshListDetailSeedAfterNestedRelatedEntityPatch

    let childApi: string | undefined
    let fkKey: string | undefined
    if (childPatch != null) {
      const childCfg = adminEntities[childPatch.nestedChildEntitySlug]
      const api = childCfg?.apiBase
      if (childCfg != null && api != null && api !== "") {
        childApi = api
        fkKey = childPatch.childFkToParentJsonKey
      }
    }

    const hasChildListener = childPatch != null && childApi != null && fkKey != null
    const hasRelatedListener = relatedSlugs != null && relatedSlugs.length > 0

    if (!hasChildListener && !hasRelatedListener) {
      listenerRef.current = null
      return
    }

    const relatedSlugSet = hasRelatedListener ? new Set(relatedSlugs) : null

    listenerRef.current = async ({ nestedSlug, nestedRowId, patchResponse }) => {
      const dlg = crudDialogRef.current

      if (dlg.kind !== "edit") {
        if (dlg.kind === "create" && hasRelatedListener && relatedSlugSet?.has(nestedSlug)) {
          notifyAdminRelatedInlineForcedEmbedRefresh()
        }
        return
      }

      const refetchParentListDetailSeed = async () => {
        const res = await fetch(
          `${cfg.apiBase}/${encodeURIComponent(dlg.rowId)}`,
          { cache: "no-store" },
        )
        if (!res.ok) return
        const detail = (await res.json()) as Record<string, unknown>
        const listDetailSeed = adminEntityListDetailSeedFromRow(cfg, detail)
        const periodRowId = dlg.rowId
        if (listDetailSeed == null) {
          queryClient.setQueryData(["admin", "entity-detail", cfg.slug, periodRowId], detail)
          setCrudDialog((prev) => {
            if (prev.kind !== "edit" || prev.rowId !== periodRowId) return prev
            if (prev.listDetailSeed === undefined) return prev
            return { ...prev, listDetailSeed: undefined }
          })
          queueMicrotask(() => notifyAdminRelatedInlineDraftSync())
          return
        }
        setCrudDialog((prev) => {
          if (prev.kind !== "edit" || prev.rowId !== periodRowId) return prev
          return { ...prev, listDetailSeed, detailSourceRow: detail }
        })
        queueMicrotask(() => notifyAdminRelatedInlineDraftSync())
      }

      const plan = await resolveAdminNestedPatchParentRefreshPlan({
        dlg,
        nestedSlug,
        nestedRowId,
        patchResponse,
        hasRelatedListener,
        relatedSlugSet,
        hasChildListener,
        childPatch: childPatch ?? null,
        childApi,
        fkKey,
        fetch,
      })

      if (plan.refetchParent) {
        await refetchParentListDetailSeed()
      }
      if (!plan.refetchParent && plan.notify) {
        notifyAdminRelatedInlineDraftSync()
      }
      if (dlg.kind === "edit" && (plan.refetchParent || plan.notify)) {
        onAdminEntityPatchSuccessNotify?.(slug)
      }
    }

    return () => {
      listenerRef.current = null
    }
  }, [adminEntities, adminNestedEntityPatchSuccessListenerRef, cfg, crudDialogRef, onAdminEntityPatchSuccessNotify, queryClient, setCrudDialog, slug])

  return {
    closeCrudDialog,
    openCreateDialog,
    promoteCreateDialogToEditFromApiRow,
    startEdit,
    openCrossEntityEdit,
    requestDeleteRow,
    onEditRelatedDetailLoaded,
    refetchEditDialogDetailFromApi,
  }
}
