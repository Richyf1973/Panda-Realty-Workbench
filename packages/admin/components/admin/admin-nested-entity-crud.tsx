"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react"

import { useAdminClientRegistry } from "../../admin-client-registry-context"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import {
  buildAdminEntityPatchFormValuesFromApiRow,
  type AdminEntityCreateMutationVariables,
} from "../../admin-entity-crud-form-values"
import { adminEntityFormColumnsInOrder } from "../../admin-entity-form-column-order"
import { adminEntityListDetailSeedFromRow } from "../../admin-entity-list-detail-seed"
import { formatUnknownErrorMessage, readApiErrorMessage } from "../../read-api-error"
import {
  AdminNestedEntityCrudContext,
  type OpenNestedEntityCreateArgs,
  type OpenNestedEntityEditArgs,
} from "./admin-nested-entity-crud-context"
import { AdminNestedEntityCrudDialogHostOpen } from "./admin-nested-entity-crud-dialog-host-open"
import { mergeNestedCrudExtrasIntoBody } from "./admin-nested-entity-crud-merge-extras"
import { AdminEntityAdminCrudDialog } from "./admin-entity-admin-crud-dialog"
import type { AdminEntityCrudDialogState } from "./admin-entity-crud-dialog-state"
import { useAdminEntityCrudRelationFieldOptions } from "./use-admin-entity-crud-relation-field-options"

export type {
  OpenNestedEntityCreateArgs,
  OpenNestedEntityEditArgs,
} from "./admin-nested-entity-crud-context"

type OpenState =
  | {
      mode: "edit"
      slug: AdminEntitySlug
      dialog: Extract<AdminEntityCrudDialogState, { kind: "edit" }>
      overrideSingular?: string
    }
  | {
      mode: "create"
      slug: AdminEntitySlug
      dialog: Extract<AdminEntityCrudDialogState, { kind: "create" }>
      overrideAddCardTitle?: string
      createPrimarySubmitLabel?: string
    }

function AdminNestedEntityCrudDialogHostCreate({
  slug,
  dialog,
  onClose,
  onCreateAnotherRemount,
  nestedCreateSuccessRef,
  createPromotedToEditRef,
  overrideAddCardTitle,
  createPrimarySubmitLabel,
  promoteCreateDialogToEditFromApiRow,
}: {
  slug: AdminEntitySlug
  dialog: Extract<AdminEntityCrudDialogState, { kind: "create" }>
  onClose: () => void
  onCreateAnotherRemount: () => void
  nestedCreateSuccessRef: MutableRefObject<
    ((row: Record<string, unknown>) => void | Promise<void>) | null
  >
  createPromotedToEditRef: MutableRefObject<boolean>
  overrideAddCardTitle?: string
  createPrimarySubmitLabel?: string
  /** Same as main admin list: related toolbar may POST the parent outside the Create button. */
  promoteCreateDialogToEditFromApiRow?: (
    createdRow: Record<string, unknown>,
  ) => void
}) {
  const queryClient = useQueryClient()
  const {
    adminEntities,
    mergeAdminEntityCreateRequestBody,
    adminEntityCrudExtrasForSaveRef,
    adminEntityCreateSuccessFollowup,
  } = useAdminClientRegistry()
  const cfg = adminEntities[slug]
  const createFormSeedsForMutationRef = useRef(dialog.createFormSeedValues)
  useLayoutEffect(() => {
    createFormSeedsForMutationRef.current = dialog.createFormSeedValues
  }, [dialog.createFormSeedValues])

  const createCols = useMemo(
    () => adminEntityFormColumnsInOrder(cfg, "create"),
    [cfg],
  )
  const patchCols = useMemo(
    () => adminEntityFormColumnsInOrder(cfg, "patch"),
    [cfg],
  )

  const crudListRelationFieldOptions = useAdminEntityCrudRelationFieldOptions(slug)

  const noopUpdate = useMemo(
    () => ({
      mutate: () => {},
      isPending: false,
      isError: false,
      error: null as Error | null,
    }),
    [],
  )

  const createMutation = useMutation({
    mutationFn: async (vars: AdminEntityCreateMutationVariables) => {
      const baseBody: Record<string, unknown> = { ...vars.body }
      const seeds = createFormSeedsForMutationRef.current
      if (seeds) {
        for (const [k, v] of Object.entries(seeds)) {
          const t = v.trim()
          if (t === "") continue
          const cur = baseBody[k]
          if (
            cur === undefined ||
            (typeof cur === "string" && cur.trim() === "")
          ) {
            baseBody[k] = t
          }
        }
      }
      let next = mergeNestedCrudExtrasIntoBody(
        cfg,
        baseBody,
        cfg.extraCreateBodyKeys,
        adminEntityCrudExtrasForSaveRef,
        undefined,
      )
      const payload =
        mergeAdminEntityCreateRequestBody?.(slug, next) ?? next
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
          console.error("[AdminNestedEntityCrud] adminEntityCreateSuccessFollowup", cause)
        }
      }
      void queryClient.invalidateQueries({ queryKey: cfg.queryKey })
      void queryClient.invalidateQueries({
        queryKey: ["admin-entity-relation-filter-async-search", cfg.apiBase],
      })
      if (vars.afterSuccess === "createAnother") {
        await nestedCreateSuccessRef.current?.(data)
        onCreateAnotherRemount()
        return
      }
      if (vars.afterSuccess === "keepOpen") {
        createPromotedToEditRef.current = true
        promoteCreateDialogToEditFromApiRow?.(data)
      }
      const cb = nestedCreateSuccessRef.current
      nestedCreateSuccessRef.current = null
      try {
        await cb?.(data)
      } finally {
        if (!createPromotedToEditRef.current) {
          onClose()
        }
        createPromotedToEditRef.current = false
      }
    },
  })

  if (dialog.kind !== "create") return null

  const createFooterMode =
    cfg.createFormPrimarySubmitAction === "createAndAddNew"
      ? "default"
      : "singleCreate"

  return (
    <AdminEntityAdminCrudDialog
      slug={slug}
      entityDefinition={cfg}
      state={dialog}
      onOpenChange={(open) => {
        if (!open) {
          nestedCreateSuccessRef.current = null
          onClose()
        }
      }}
      addCardTitle={overrideAddCardTitle ?? cfg.ui.addCardTitle}
      schemaSqlName={cfg.schemaSqlName}
      singular={cfg.ui.singular}
      createCols={createCols}
      createMutation={createMutation}
      patchCols={patchCols}
      updateMutation={noopUpdate}
      crudListRelationFieldOptions={crudListRelationFieldOptions}
      crudDialogWidth={cfg.crudDialogWidth}
      crudDialogHeight={cfg.crudDialogHeight}
      createFooterMode={createFooterMode}
      createPrimarySubmitLabel={createPrimarySubmitLabel}
      promoteCreateDialogToEditFromApiRow={promoteCreateDialogToEditFromApiRow}
    />
  )
}

/**
 * Second-stack CRUD dialog opened from related-row tables (`openChildInNestedCrudDialog`).
 * Wrap the app’s admin shell (same tree as `AdminClientRegistryProvider`).
 */
export function AdminNestedEntityCrudProvider({
  children,
}: {
  children: ReactNode
}) {
  const queryClient = useQueryClient()
  const { adminEntities } = useAdminClientRegistry()
  const [openState, setOpenState] = useState<OpenState | null>(null)
  const [busyRowId, setBusyRowId] = useState<string | null>(null)
  const nestedCreateSuccessRef = useRef<
    ((row: Record<string, unknown>) => void | Promise<void>) | null
  >(null)
  const createPromotedToEditRef = useRef(false)

  const promoteNestedCreateDialogToEditFromApiRow = useCallback(
    (targetSlug: AdminEntitySlug, data: Record<string, unknown>) => {
      const cfg = adminEntities[targetSlug]
      const idKey = cfg.idColumn.jsonKey
      const rawId = data[idKey]
      if (rawId == null) return
      createPromotedToEditRef.current = true
      void queryClient.invalidateQueries({ queryKey: cfg.queryKey })
      const patchCols = adminEntityFormColumnsInOrder(cfg, "patch")
      const values = buildAdminEntityPatchFormValuesFromApiRow({
        slug: targetSlug,
        patchCols,
        row: data,
        adminEntities,
      })
      const listDetailSeed = adminEntityListDetailSeedFromRow(cfg, data)
      setOpenState({
        mode: "edit",
        slug: targetSlug,
        dialog: {
          kind: "edit",
          rowId: String(rawId),
          values,
          detailSourceRow: data,
          ...(listDetailSeed != null ? { listDetailSeed } : {}),
        },
      })
    },
    [adminEntities, queryClient],
  )

  const openNestedEntityCreate = useCallback(
    ({
      slug,
      seedValues,
      onSuccess,
      overrideAddCardTitle,
      createPrimarySubmitLabel,
    }: OpenNestedEntityCreateArgs) => {
      const nextSeeds: Record<string, string> = {}
      for (const [k, v] of Object.entries(seedValues)) {
        nextSeeds[k] = v
      }
      nestedCreateSuccessRef.current = onSuccess
      setOpenState({
        mode: "create",
        slug,
        dialog: {
          kind: "create",
          createFormSeedValues: nextSeeds,
        },
        ...(overrideAddCardTitle != null ? { overrideAddCardTitle } : {}),
        ...(createPrimarySubmitLabel != null ? { createPrimarySubmitLabel } : {}),
      })
    },
    [],
  )

  const openNestedEntityEdit = useCallback(
    async ({
      slug,
      rowId,
      overrideSingular,
      nestedEditUiContext,
    }: OpenNestedEntityEditArgs) => {
      const cfg = adminEntities[slug]
      setBusyRowId(rowId)
      try {
        const res = await fetch(
          `${cfg.apiBase}/${encodeURIComponent(rowId)}`,
          { cache: "no-store" },
        )
        if (!res.ok) throw new Error(await readApiErrorMessage(res))
        const data = (await res.json()) as Record<string, unknown>
        const patchCols = adminEntityFormColumnsInOrder(cfg, "patch")
        const values = buildAdminEntityPatchFormValuesFromApiRow({
          slug,
          patchCols,
          row: data,
          adminEntities,
        })
        const listDetailSeed = adminEntityListDetailSeedFromRow(cfg, data)
        setOpenState({
          mode: "edit",
          slug,
          dialog: {
            kind: "edit",
            rowId,
            values,
            detailSourceRow: data,
            ...(listDetailSeed != null ? { listDetailSeed } : {}),
            ...(nestedEditUiContext != null ? { nestedEditUiContext } : {}),
          },
          ...(overrideSingular != null ? { overrideSingular } : {}),
        })
      } catch (e) {
        window.alert(formatUnknownErrorMessage(e))
      } finally {
        setBusyRowId(null)
      }
    },
    [adminEntities],
  )

  const value = useMemo(
    () => ({
      openNestedEntityEdit,
      openNestedEntityCreate,
      promoteNestedCreateDialogToEditFromApiRow: (row: Record<string, unknown>) => {
        if (openState == null || openState.mode !== "create") return
        promoteNestedCreateDialogToEditFromApiRow(openState.slug, row)
      },
      nestedCrudBusyRowId: busyRowId,
    }),
    [busyRowId, openNestedEntityCreate, openNestedEntityEdit, openState, promoteNestedCreateDialogToEditFromApiRow],
  )

  return (
    <AdminNestedEntityCrudContext.Provider value={value}>
      {children}
      {openState != null && openState.mode === "edit" ? (
        <AdminNestedEntityCrudDialogHostOpen
          slug={openState.slug}
          dialog={openState.dialog}
          onClose={() => setOpenState(null)}
          overrideSingular={openState.overrideSingular}
        />
      ) : null}
      {openState != null && openState.mode === "create" ? (
        <AdminNestedEntityCrudDialogHostCreate
          slug={openState.slug}
          dialog={openState.dialog}
          nestedCreateSuccessRef={nestedCreateSuccessRef}
          createPromotedToEditRef={createPromotedToEditRef}
          onCreateAnotherRemount={() => {
            setOpenState((prev) => {
              if (prev == null || prev.mode !== "create") return prev
              return {
                ...prev,
                dialog: {
                  kind: "create",
                  createFormSeedValues: prev.dialog.createFormSeedValues,
                  createFormRemountKey:
                    (prev.dialog.createFormRemountKey ?? 0) + 1,
                },
              }
            })
          }}
          onClose={() => setOpenState(null)}
          overrideAddCardTitle={openState.overrideAddCardTitle}
          createPrimarySubmitLabel={openState.createPrimarySubmitLabel}
          promoteCreateDialogToEditFromApiRow={(row) =>
            promoteNestedCreateDialogToEditFromApiRow(openState.slug, row)
          }
        />
      ) : null}
    </AdminNestedEntityCrudContext.Provider>
  )
}
