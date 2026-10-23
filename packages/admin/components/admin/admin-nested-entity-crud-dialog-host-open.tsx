"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useMemo } from "react"

import { useAdminClientRegistry } from "../../admin-client-registry-context"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type { AdminEntityCreateMutationVariables } from "../../admin-entity-crud-form-values"
import { adminEntityFormColumnsInOrder } from "../../admin-entity-form-column-order"
import { readApiErrorMessage } from "../../read-api-error"
import { AdminEntityAdminCrudDialog } from "./admin-entity-admin-crud-dialog"
import type { AdminEntityCrudDialogState } from "./admin-entity-crud-dialog-state"
import { mergeNestedCrudExtrasIntoBody } from "./admin-nested-entity-crud-merge-extras"
import { runNestedEntityEditMutationSuccessEffects } from "./admin-nested-entity-edit-patch-success-chain"
import { useAdminEntityCrudRelationFieldOptions } from "./use-admin-entity-crud-relation-field-options"

export function AdminNestedEntityCrudDialogHostOpen({
  slug,
  dialog,
  onClose,
  overrideSingular,
}: {
  slug: AdminEntitySlug
  dialog: Extract<AdminEntityCrudDialogState, { kind: "edit" }>
  onClose: () => void
  overrideSingular?: string
}) {
  const queryClient = useQueryClient()
  const {
    adminEntities,
    mergeAdminEntityPatchRequestBody,
    adminEntityCrudExtrasForSaveRef,
    adminEntityCrudPatchOmitExtrasKeysRef,
    adminNestedEntityPatchSuccessListenerRef,
    invalidateQueriesAfterNestedEntityPatchSuccess,
    adminNestedEntityEditPatchSuccessFollowup,
  } = useAdminClientRegistry()
  const cfg = adminEntities[slug]

  const createCols = useMemo(
    () => adminEntityFormColumnsInOrder(cfg, "create"),
    [cfg],
  )
  const patchCols = useMemo(
    () => adminEntityFormColumnsInOrder(cfg, "patch"),
    [cfg],
  )

  const crudListRelationFieldOptions = useAdminEntityCrudRelationFieldOptions(slug)

  const noopCreate = useMemo(
    () => ({
      mutate: (_vars: AdminEntityCreateMutationVariables) => {},
      isPending: false,
      isError: false,
      error: null as Error | null,
    }),
    [],
  )

  const updateMutation = useMutation({
    mutationFn: async (vars: {
      id: string
      patch: Record<string, unknown>
    }) => {
      let next = mergeNestedCrudExtrasIntoBody(
        cfg,
        { ...vars.patch },
        cfg.extraPatchBodyKeys,
        adminEntityCrudExtrasForSaveRef,
        adminEntityCrudPatchOmitExtrasKeysRef,
      )
      const patch =
        mergeAdminEntityPatchRequestBody?.(slug, vars.id, next) ?? next
      const res = await fetch(
        `${cfg.apiBase}/${encodeURIComponent(vars.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        },
      )
      if (!res.ok) throw new Error(await readApiErrorMessage(res))
      return (await res.json()) as Record<string, unknown>
    },
    onSuccess: async (_data, vars) => {
      await runNestedEntityEditMutationSuccessEffects({
        queryClient,
        slug,
        varsId: vars.id,
        patchData: _data,
        adminNestedEntityEditPatchSuccessFollowup,
        invalidateQueriesAfterNestedEntityPatchSuccess,
        adminNestedEntityPatchSuccessListenerRef,
      })
      onClose()
    },
  })

  if (dialog.kind !== "edit") return null

  return (
    <AdminEntityAdminCrudDialog
      slug={slug}
      entityDefinition={cfg}
      state={dialog}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      addCardTitle={cfg.ui.addCardTitle}
      schemaSqlName={cfg.schemaSqlName}
      singular={overrideSingular ?? cfg.ui.singular}
      createCols={createCols}
      createMutation={noopCreate}
      patchCols={patchCols}
      updateMutation={updateMutation}
      crudListRelationFieldOptions={crudListRelationFieldOptions}
      crudDialogWidth={cfg.crudDialogWidth}
      crudDialogHeight={cfg.crudDialogHeight}
    />
  )
}
