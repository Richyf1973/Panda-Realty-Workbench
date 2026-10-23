"use client"

import { useCallback } from "react"
import { useMutation, type QueryClient } from "@tanstack/react-query"
import type { Dispatch, SetStateAction } from "react"

import { adminEntityListDetailSeedFromRow } from "../../admin-entity-list-detail-seed"
import {
  buildAdminEntityPatchFormValuesFromApiRow,
} from "../../admin-entity-crud-form-values"
import { adminEntityPatchExtrasBaselineFromRow } from "../../admin-entity-patch-partial"
import { readApiErrorMessage } from "../../read-api-error"
import { adminEntityFormColumnsInOrder } from "../../admin-entity-form-column-order"
import {
  ADMIN_CRUD_INLINE_DRAFT_ISSUES_REF_KEY,
} from "../../admin-entity-crud-related-collections-draft"
import {
  isAdminEntityCrudRelatedCollectionTable,
  type AdminEntityDefinition,
  type AdminEntityColumn,
} from "../../admin-entity-types"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type { AdminEntityCrudDialogState } from "./admin-entity-crud-dialog-state"
import { useAdminClientRegistry } from "../../admin-client-registry-context"
import {
  mergeCrudExtrasIntoBody,
  mergeCrudExtrasIntoBodyWithPartialBaseline,
} from "./use-admin-entity-admin-helpers"

export function useAdminEntityCrudMutations({
  cfg,
  slug,
  idKey,
  patchCols,
  queryClient,
  setCrudDialog,
  adminUiMutationsDisabled: _adminUiMutationsDisabled,
}: {
  cfg: AdminEntityDefinition
  slug: AdminEntitySlug
  idKey: string
  patchCols: readonly AdminEntityColumn[]
  queryClient: QueryClient
  setCrudDialog: Dispatch<SetStateAction<AdminEntityCrudDialogState>>
  adminUiMutationsDisabled: boolean
}) {
  const {
    adminEntities,
    adminEntityPartialPatchBySlug,
    mergeAdminEntityCreateRequestBody,
    mergeAdminEntityPatchRequestBody,
    adminEntityCrudExtrasForSaveRef,
    adminEntityCrudPatchOmitExtrasKeysRef,
    adminEntityCreateSuccessBySlug,
    adminEntityPatchSuccessBySlug,
    adminEntityCreateSuccessFollowup,
    adminEntityEditPatchSuccessFollowup,
    onAdminEntityPatchSuccessNotify,
  } = useAdminClientRegistry()

  const clearCreateSessionExtrasForCurrentEntity = useCallback(() => {
    if (!adminEntityCrudExtrasForSaveRef) return
    const o = adminEntityCrudExtrasForSaveRef.current
    for (const k of cfg.extraCreateBodyKeys ?? []) delete o[k]
    for (const c of cfg.crudRelatedCollections ?? []) {
      if (isAdminEntityCrudRelatedCollectionTable(c)) delete o[c.jsonKey]
    }
    delete o[ADMIN_CRUD_INLINE_DRAFT_ISSUES_REF_KEY]
  }, [adminEntityCrudExtrasForSaveRef, cfg])

  const createMutation = useMutation({
    mutationFn: async (vars: {
      body: Record<string, unknown>
      afterSuccess?: "keepOpen" | "close" | "createAnother"
    }) => {
      const next = mergeCrudExtrasIntoBody(
        cfg,
        { ...vars.body },
        cfg.extraCreateBodyKeys,
        adminEntityCrudExtrasForSaveRef,
        undefined,
      )
      const payload = mergeAdminEntityCreateRequestBody?.(slug, next) ?? next
      const res = await fetch(cfg.apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(await readApiErrorMessage(res))
      return (await res.json()) as Record<string, unknown>
    },
    onSuccess: async (data, vars) => {
      if (adminEntityCreateSuccessFollowup != null) {
        try {
          await adminEntityCreateSuccessFollowup({ slug, createResponse: data })
        } catch (cause) {
          console.error("[useAdminEntityAdmin] adminEntityCreateSuccessFollowup", cause)
        }
      }
      void queryClient.invalidateQueries({ queryKey: cfg.queryKey })
      if (vars.afterSuccess === "createAnother") {
        clearCreateSessionExtrasForCurrentEntity()
        setCrudDialog((prev) => ({
          kind: "create",
          createFormRemountKey:
            (prev.kind === "create" ? (prev.createFormRemountKey ?? 0) : 0) + 1,
        }))
        return
      }
      if (vars.afterSuccess === "keepOpen") {
        const rawId = data[idKey]
        if (rawId != null) {
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
                    extrasByKey: adminEntityPatchExtrasBaselineFromRow(
                      cfg,
                      data as Record<string, unknown>,
                    ),
                  },
                }
              : {}),
          })
        }
        return
      }
      const mode = adminEntityCreateSuccessBySlug?.[slug] ?? "close"
      if (mode === "openEditWithCreatedRow") {
        const rawId = data[idKey]
        if (rawId != null) {
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
                    extrasByKey: adminEntityPatchExtrasBaselineFromRow(
                      cfg,
                      data as Record<string, unknown>,
                    ),
                  },
                }
              : {}),
          })
          return
        }
      }
      setCrudDialog({ kind: "none" })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (vars: {
      id: string
      patch: Record<string, unknown>
      partialExtrasBaseline?: Record<string, unknown>
      targetEntitySlug?: AdminEntitySlug
      afterSuccess?: "keepOpen" | "close"
    }) => {
      const targetSlug = vars.targetEntitySlug ?? slug
      const targetCfg = adminEntities[targetSlug] as AdminEntityDefinition
      const usePartialExtras = vars.partialExtrasBaseline != null
      const next = usePartialExtras
        ? mergeCrudExtrasIntoBodyWithPartialBaseline(
            targetCfg,
            { ...vars.patch },
            targetCfg.extraPatchBodyKeys,
            adminEntityCrudExtrasForSaveRef,
            adminEntityCrudPatchOmitExtrasKeysRef,
            vars.partialExtrasBaseline,
          )
        : mergeCrudExtrasIntoBody(
            targetCfg,
            { ...vars.patch },
            targetCfg.extraPatchBodyKeys,
            adminEntityCrudExtrasForSaveRef,
            adminEntityCrudPatchOmitExtrasKeysRef,
          )
      const patch =
        mergeAdminEntityPatchRequestBody?.(targetSlug, vars.id, next) ?? next
      if (Object.keys(patch).length === 0) {
        const res = await fetch(
          `${targetCfg.apiBase}/${encodeURIComponent(vars.id)}`,
          { cache: "no-store" },
        )
        if (!res.ok) throw new Error(await readApiErrorMessage(res))
        return (await res.json()) as Record<string, unknown>
      }
      const res = await fetch(
        `${targetCfg.apiBase}/${encodeURIComponent(vars.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        },
      )
      if (!res.ok) throw new Error(await readApiErrorMessage(res))
      return (await res.json()) as Record<string, unknown>
    },
    onSuccess: async (data, vars) => {
      const targetSlug = vars.targetEntitySlug ?? slug
      const targetCfg = adminEntities[targetSlug] as AdminEntityDefinition
      const targetPatchCols = adminEntityFormColumnsInOrder(targetCfg, "patch")
      const targetIdKey = targetCfg.idColumn.jsonKey

      if (
        adminEntityEditPatchSuccessFollowup != null &&
        data != null &&
        typeof data === "object" &&
        !Array.isArray(data)
      ) {
        try {
          await adminEntityEditPatchSuccessFollowup({
            slug: targetSlug,
            rowId: vars.id,
            patchResponse: data as Record<string, unknown>,
          })
        } catch (cause) {
          console.error("[useAdminEntityAdmin] adminEntityEditPatchSuccessFollowup", cause)
        }
      }

      void queryClient.invalidateQueries({ queryKey: cfg.queryKey })
      if (targetSlug !== slug) {
        void queryClient.invalidateQueries({ queryKey: targetCfg.queryKey })
      }
      if (
        data != null &&
        typeof data === "object" &&
        !Array.isArray(data) &&
        (targetCfg.crudRelatedCollections?.length ?? 0) > 0
      ) {
        queryClient.setQueryData(
          ["admin", "entity-detail", targetSlug, vars.id],
          data as Record<string, unknown>,
        )
      } else {
        void queryClient.invalidateQueries({
          queryKey: ["admin", "entity-detail", targetSlug, vars.id],
          refetchType: "all",
        })
      }
      const mode = adminEntityPatchSuccessBySlug?.[targetSlug] ?? "close"
      const effectiveMode =
        vars.afterSuccess === "close"
          ? "close"
          : vars.afterSuccess === "keepOpen"
            ? "keepEditDialogOpen"
            : mode
      if (
        effectiveMode === "keepEditDialogOpen" &&
        data != null &&
        typeof data === "object" &&
        !Array.isArray(data)
      ) {
        setCrudDialog((prev) => {
          if (prev.kind !== "edit" || prev.rowId !== vars.id) return prev
          const row = data as Record<string, unknown>
          const listDetailSeed = adminEntityListDetailSeedFromRow(targetCfg, row)
          const values = buildAdminEntityPatchFormValuesFromApiRow({
            slug: targetSlug,
            patchCols: targetPatchCols,
            row,
            adminEntities,
          })
          const partial = adminEntityPartialPatchBySlug?.[targetSlug] === true
          return {
            kind: "edit",
            rowId: vars.id,
            values,
            detailSourceRow: row,
            ...(listDetailSeed != null ? { listDetailSeed } : {}),
            editFormRemountKey: (prev.editFormRemountKey ?? 0) + 1,
            ...(prev.dialogEntitySlug != null
              ? {
                  dialogEntitySlug: prev.dialogEntitySlug,
                  ...(prev.crossPageFormLocked === true
                    ? { crossPageFormLocked: true as const }
                    : {}),
                }
              : {}),
            ...(partial
              ? {
                  patchDiffBaseline: {
                    formValues: { ...values },
                    extrasByKey: adminEntityPatchExtrasBaselineFromRow(targetCfg, row),
                  },
                }
              : {}),
          }
        })
        onAdminEntityPatchSuccessNotify?.(targetSlug)
        return
      }
      if (
        effectiveMode === "openEditWhenResponseIdDiffers" &&
        data != null &&
        typeof data === "object" &&
        !Array.isArray(data)
      ) {
        const row = data as Record<string, unknown>
        const rawNewId = row[targetIdKey]
        if (rawNewId != null && String(rawNewId) !== vars.id) {
          const newId = String(rawNewId)
          if ((targetCfg.crudRelatedCollections?.length ?? 0) > 0) {
            queryClient.setQueryData(["admin", "entity-detail", targetSlug, newId], row)
          } else {
            void queryClient.invalidateQueries({
              queryKey: ["admin", "entity-detail", targetSlug, newId],
              refetchType: "all",
            })
          }
          const listDetailSeed = adminEntityListDetailSeedFromRow(targetCfg, row)
          const values = buildAdminEntityPatchFormValuesFromApiRow({
            slug: targetSlug,
            patchCols: targetPatchCols,
            row,
            adminEntities,
          })
          const partial = adminEntityPartialPatchBySlug?.[targetSlug] === true
          setCrudDialog((prev) => ({
            kind: "edit",
            rowId: newId,
            values,
            detailSourceRow: row,
            ...(listDetailSeed != null ? { listDetailSeed } : {}),
            editFormRemountKey: 0,
            ...(prev.kind === "edit" && prev.dialogEntitySlug != null
              ? {
                  dialogEntitySlug: prev.dialogEntitySlug,
                  ...(prev.crossPageFormLocked === true
                    ? { crossPageFormLocked: true as const }
                    : {}),
                }
              : {}),
            ...(partial
              ? {
                  patchDiffBaseline: {
                    formValues: { ...values },
                    extrasByKey: adminEntityPatchExtrasBaselineFromRow(targetCfg, row),
                  },
                }
              : {}),
          }))
          return
        }
      }
      setCrudDialog({ kind: "none" })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${cfg.apiBase}/${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error(await readApiErrorMessage(res))
    },
    onSuccess: (_data, deletedId) => {
      void queryClient.invalidateQueries({ queryKey: cfg.queryKey })
      setCrudDialog((prev) =>
        prev.kind === "edit" && prev.rowId === deletedId ? { kind: "none" } : prev,
      )
    },
  })

  return { createMutation, updateMutation, deleteMutation, clearCreateSessionExtrasForCurrentEntity }
}
