"use client"

import type { AdminRenderCrudDialogFormBodyArgs } from "@repo/admin/admin-client-registry-context"

import { PandaEntitiesDialogFormSurface } from "./panda-entities-dialog-form-surface"
import type { PandaEntitiesFormLike } from "./panda-entities-dialog-form-types"

// ---------------------------------------------------------------------------
// Root component — registered as renderCrudDialogFormBody for "entities"
//
// Buyer (category 1): see PandaEntitiesBuyerDialogFormSurface — enquiry row,
// meeting/reminder toolbar, members, property connections (no notes/statuses/address in UI).
// Other categories: PandaEntitiesDialogFormSurface — name, category, contact fields, notes.
// ---------------------------------------------------------------------------

export function PandaEntitiesDialogForm({
  variant,
  entityRowId,
  form: formArg,
  listDetailSeed,
  crudListRelationFieldOptions,
  nestedEditUiContext,
  isCompact,
}: AdminRenderCrudDialogFormBodyArgs) {
  if (formArg == null) return null
  const form = formArg as unknown as PandaEntitiesFormLike

  const entityCategoryOpts = crudListRelationFieldOptions?.["entityCategoryId"]
  const contactCategoryOpts = crudListRelationFieldOptions?.["contactCategoryId"]

  return (
    <div
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto scrollbar-galaxy"
      data-testid="panda-entities-dialog-form"
    >
      <form.Subscribe selector={(state) => String(state.values.entityCategoryId ?? "")}>
        {(categoryId) => (
          <PandaEntitiesDialogFormSurface
            form={form}
            categoryId={categoryId}
            variant={variant}
            entityRowId={entityRowId}
            listDetailSeed={listDetailSeed}
            nestedEditUiContext={nestedEditUiContext}
            isCompact={isCompact}
            entityCategoryOpts={entityCategoryOpts}
            contactCategoryOpts={contactCategoryOpts}
          />
        )}
      </form.Subscribe>
    </div>
  )
}
