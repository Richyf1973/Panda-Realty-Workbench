"use client"

import { useRef } from "react"
import type { UseMutationResult } from "@tanstack/react-query"
import { useCompactAdminListViewport } from "@repo/ui/use-compact-admin-list-viewport"
import { Dialog, DialogContent } from "@repo/ui/dialog"
import { cn } from "@repo/ui/utils"
import type { AdminEntityCrudDialogState } from "./admin-entity-crud-dialog-state"
import type { AdminEntityColumn, AdminEntityDefinition } from "../../admin-entity-types"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type { AdminEntityCreateMutationVariables } from "../../admin-entity-crud-form-values"
import type { AdminEntityCrudListRelationFieldOptionsMap } from "../../admin-entity-crud-relation-field-options-types"
import type { AdminEntityCrudDialogWidthPreset } from "../../admin-entity-crud-dialog-width-presets"
import type { AdminEntityCrudDialogHeightPreset } from "../../admin-entity-crud-dialog-height-presets"
import {
  adminEntityCrudDialogMaxHeightClass,
  ADMIN_ENTITY_CRUD_DIALOG_COMPACT_HEIGHT_CLASS,
} from "../../admin-entity-crud-dialog-height-presets"
import {
  adminEntityCrudDialogMaxWidthClass,
  ADMIN_ENTITY_CRUD_DIALOG_COMPACT_WIDTH_CLASS,
} from "../../admin-entity-crud-dialog-width-presets"
import { AdminCrudFormInteractionLockProvider } from "../../admin-crud-form-interaction-lock-context"
import { adminEntityCreateFormKeySeedDigest } from "./admin-entity-crud-form-column-utils"
import { AdminEntityCreateCrudForm } from "./admin-entity-create-crud-form"
import { AdminEntityEditCrudForm } from "./admin-entity-edit-crud-form"

type AdminEntityAdminCrudDialogProps = {
  slug: AdminEntitySlug
  entityDefinition: AdminEntityDefinition
  state: AdminEntityCrudDialogState
  onOpenChange: (open: boolean) => void
  addCardTitle: string
  schemaSqlName: string
  singular: string
  createCols: AdminEntityColumn[]
  createMutation: Pick<
    UseMutationResult<
      Record<string, unknown>,
      Error,
      AdminEntityCreateMutationVariables
    >,
    "mutate" | "isPending" | "isError" | "error"
  >
  /**
   * Optional create defaults derived from the list date-range toolbar when **from === to**;
   * merged after registry defaults. Empty when the dialog is not opened from a filtered list.
   */
  createFormListDateFilterDefaults?: Readonly<Record<string, string>>
  patchCols: AdminEntityColumn[]
  updateMutation: Pick<
    UseMutationResult<
      Record<string, unknown>,
      Error,
      {
        id: string
        patch: Record<string, unknown>
        partialExtrasBaseline?: Record<string, unknown>
        targetEntitySlug?: AdminEntitySlug
        afterSuccess?: "keepOpen" | "close"
      }
    >,
    "mutate" | "isPending" | "isError" | "error"
  >
  crudListRelationFieldOptions: AdminEntityCrudListRelationFieldOptionsMap
  /** Omit → `medium` (`max-w-2xl`). */
  crudDialogWidth?: AdminEntityCrudDialogWidthPreset
  /** Omit → `medium` (90vh / 720px cap). */
  crudDialogHeight?: AdminEntityCrudDialogHeightPreset
  /**
   * When true, edit form is view-only (opened from another list): selectable fields, related tabs,
   * no save.
   */
  crossPageFormLocked?: boolean
  /**
   * Edit + related collections: fired when GET `/api/.../[id]` used by related tabs succeeds
   * (e.g. payroll periods merge `listDetailSeed` for main-form rollups).
   */
  onEditRelatedDetailLoaded?: (detail: Record<string, unknown>) => void
  /**
   * Refetches open edit GET detail — updates TanStack cache and dialog `listDetailSeed` when used
   * (fixes stale merged fields after side-effect APIs).
   */
  refetchEditDialogDetailFromApi?: () => Promise<void>
  /** After a related toolbar (or similar) **`POST`** creates the parent row outside the main Create button. */
  promoteCreateDialogToEditFromApiRow?: (
    createdRow: Record<string, unknown>,
  ) => void
  /**
   * **`singleCreate`**: footer shows only the primary **Create** control (nested quick-create).
   * Default: also show **Create & add new**.
   */
  createFooterMode?: "default" | "singleCreate"
  /**
   * Primary create submit label (e.g. **Create & Edit** for nested buyer flows). Omit → **Create**.
   */
  createPrimarySubmitLabel?: string
  /** Called when the user clicks Delete in the edit form footer. Omit to hide the button. */
  onDelete?: () => void
  deletePending?: boolean
  /** Called when the user clicks Add New in the edit form footer. Omit to hide the button. */
  onAddNew?: () => void
}

export function AdminEntityAdminCrudDialog({
  slug,
  entityDefinition,
  state,
  onOpenChange,
  addCardTitle,
  schemaSqlName,
  singular,
  createCols,
  createMutation,
  patchCols,
  updateMutation,
  crudListRelationFieldOptions,
  crudDialogWidth,
  crudDialogHeight,
  crossPageFormLocked = false,
  onEditRelatedDetailLoaded,
  refetchEditDialogDetailFromApi,
  promoteCreateDialogToEditFromApiRow,
  createFormListDateFilterDefaults = {},
  createFooterMode = "default",
  createPrimarySubmitLabel,
  onDelete,
  deletePending,
  onAddNew,
}: AdminEntityAdminCrudDialogProps) {
  const open = state.kind !== "none"
  const compactDialogChrome = useCompactAdminListViewport()

  /* Focus restore: this dialog is *controlled* (no Radix `DialogTrigger`), so Radix has no trigger
   * to return focus to on close and focus falls to `<body>` (WCAG 2.4.3 regression — keyboard/SR
   * users lose their place). Capture the element focused at the open edge (read during the render
   * that flips `open` true — this runs before Radix's focus-scope effect, so it's still the opener)
   * and restore it in `onCloseAutoFocus`. */
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const prevOpenRef = useRef(false)
  if (open && !prevOpenRef.current) {
    const active = typeof document !== "undefined" ? document.activeElement : null
    restoreFocusRef.current = active instanceof HTMLElement ? active : null
  }
  prevOpenRef.current = open

  /* No `onFocusOutside` preventDefault on `DialogContent`: it blocks the native file picker when
   * focus leaves the modal. If other entities show unwanted focus-dismiss behavior, fix narrowly
   * (e.g. per-slug) instead of blanket preventDefault here. */
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        onCloseAutoFocus={(event) => {
          const target = restoreFocusRef.current
          if (target && document.contains(target)) {
            event.preventDefault()
            target.focus()
          }
        }}
        className={cn(
          "flex min-h-0 w-full flex-col gap-0 overflow-hidden p-0",
          compactDialogChrome
            ? ADMIN_ENTITY_CRUD_DIALOG_COMPACT_HEIGHT_CLASS
            : adminEntityCrudDialogMaxHeightClass(crudDialogHeight),
          adminEntityCrudDialogMaxWidthClass(crudDialogWidth),
          compactDialogChrome && ADMIN_ENTITY_CRUD_DIALOG_COMPACT_WIDTH_CLASS,
        )}
        data-testid={`admin-entity-crud-dialog--${slug}`}
      >
        {state.kind === "create" ? (
          <AdminCrudFormInteractionLockProvider key={`${slug}-create-lock`}>
            <AdminEntityCreateCrudForm
              key={`${slug}-create-${state.createFormRemountKey ?? 0}-${adminEntityCreateFormKeySeedDigest(state.createFormSeedValues)}`}
              slug={slug}
              entityDefinition={entityDefinition}
              addCardTitle={addCardTitle}
              schemaSqlName={schemaSqlName}
              createCols={createCols}
              createMutation={createMutation}
              crudListRelationFieldOptions={crudListRelationFieldOptions}
              createFormListDateFilterDefaults={createFormListDateFilterDefaults}
              createFormSeedValues={state.createFormSeedValues}
              createFooterMode={createFooterMode}
              createPrimarySubmitLabel={createPrimarySubmitLabel}
              promoteCreateDialogToEditFromApiRow={
                promoteCreateDialogToEditFromApiRow
              }
              onCancel={() => onOpenChange(false)}
            />
          </AdminCrudFormInteractionLockProvider>
        ) : null}

        {state.kind === "edit" ? (
          <AdminCrudFormInteractionLockProvider
            key={`${slug}-edit-lock-${state.rowId}-${state.editFormRemountKey ?? 0}`}
          >
            <AdminEntityEditCrudForm
              key={`${slug}-edit-${state.rowId}-${state.editFormRemountKey ?? 0}`}
              slug={slug}
              entityDefinition={entityDefinition}
              patchCols={patchCols}
              rowId={state.rowId}
              initialValues={state.values}
              listDetailSeed={state.listDetailSeed}
              editDetailSourceRow={state.detailSourceRow}
              patchDiffBaseline={state.patchDiffBaseline}
              schemaSqlName={schemaSqlName}
              singular={singular}
              updateMutation={updateMutation}
              crudListRelationFieldOptions={crudListRelationFieldOptions}
              crossPageFormLocked={crossPageFormLocked}
              onCancel={() => onOpenChange(false)}
              onEditRelatedDetailLoaded={onEditRelatedDetailLoaded}
              refetchEditDialogDetailFromApi={refetchEditDialogDetailFromApi}
              onDelete={onDelete}
              deletePending={deletePending}
              onAddNew={onAddNew}
              nestedEditUiContext={state.nestedEditUiContext}
            />
          </AdminCrudFormInteractionLockProvider>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
