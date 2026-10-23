"use client"

import type { AdminNestedEditUiContext } from "@repo/admin/components/admin/admin-entity-crud-dialog-state"
import type { AdminEntityCrudListRelationFieldOptionsMap } from "@repo/admin/admin-entity-crud-relation-field-options-types"
import { cn } from "@repo/ui/utils"

import { PANDA_ENTITIES_ASSOCIATION_OPTIONS } from "./panda-entities-dialog-form-constants"
import {
  PandaEntitiesFieldInput,
  PandaEntitiesFieldSelect,
  PandaEntitiesFieldTextarea,
} from "./panda-entities-dialog-form-fields"
import type { PandaEntitiesFormLike } from "./panda-entities-dialog-form-types"
import { PandaEntitiesBuyerDialogFormSurface } from "./panda-entities-buyer-dialog-form-surface"

type Props = {
  form: PandaEntitiesFormLike
  categoryId: string
  variant: "create" | "edit"
  entityRowId: string | null
  listDetailSeed?: Record<string, unknown>
  nestedEditUiContext?: AdminNestedEditUiContext
  isCompact: boolean
  entityCategoryOpts?: AdminEntityCrudListRelationFieldOptionsMap[string]
  contactCategoryOpts?: AdminEntityCrudListRelationFieldOptionsMap[string]
}

export function PandaEntitiesDialogFormSurface({
  form,
  categoryId,
  variant,
  entityRowId,
  listDetailSeed,
  nestedEditUiContext,
  isCompact,
  entityCategoryOpts,
  contactCategoryOpts,
}: Props) {
  if (categoryId === "1") {
    return (
      <PandaEntitiesBuyerDialogFormSurface
        form={form}
        variant={variant}
        entityRowId={entityRowId}
        listDetailSeed={listDetailSeed}
        nestedEditUiContext={nestedEditUiContext}
        isCompact={isCompact}
      />
    )
  }

  return (
    <>
      <div className={cn("shrink-0", isCompact ? "p-3" : "p-4")}>
        <div
          className={cn(
            "grid grid-cols-1 sm:grid-cols-12",
            isCompact ? "gap-x-3 gap-y-3" : "gap-x-4 gap-y-4",
          )}
        >
          <PandaEntitiesFieldInput
            form={form}
            name="entityName"
            label="Name"
            required
            className={categoryId === "4" ? "sm:col-span-5" : "sm:col-span-6"}
          />
          <PandaEntitiesFieldSelect
            form={form}
            name="entityCategoryId"
            label="Entity category"
            required
            options={entityCategoryOpts?.options ?? []}
            optionsPending={entityCategoryOpts?.optionsPending ?? false}
            emptyChoiceLabel="Select…"
            className={categoryId === "4" ? "sm:col-span-3" : "sm:col-span-6"}
          />
          {categoryId === "4" ? (
            <>
              <PandaEntitiesFieldSelect
                form={form}
                name="contactCategoryId"
                label="Contact category"
                options={contactCategoryOpts?.options ?? []}
                optionsPending={contactCategoryOpts?.optionsPending ?? false}
                emptyChoiceLabel="None"
                className="sm:col-span-2"
              />
              <PandaEntitiesFieldSelect
                form={form}
                name="association"
                label="Association"
                options={PANDA_ENTITIES_ASSOCIATION_OPTIONS}
                optionsPending={false}
                emptyChoiceLabel="None"
                className="sm:col-span-2"
              />
            </>
          ) : null}
        </div>

        <div
          className={cn(
            "grid grid-cols-1 border-t sm:grid-cols-12",
            isCompact ? "mt-3 gap-x-3 gap-y-3 pt-3" : "mt-4 gap-x-4 gap-y-4 pt-4",
          )}
        >
          <PandaEntitiesFieldInput
            form={form}
            name="emailAddress"
            label="Email"
            type="email"
            autoComplete="email"
            className="sm:col-span-6"
          />
          <PandaEntitiesFieldInput
            form={form}
            name="contact"
            label="Contact number"
            type="tel"
            autoComplete="tel"
            className="sm:col-span-6"
          />

          <PandaEntitiesFieldInput
            form={form}
            name="address"
            label="Address"
            className="sm:col-span-5"
          />
          <PandaEntitiesFieldInput
            form={form}
            name="esuburb"
            label="Suburb"
            className="sm:col-span-3"
          />
          <PandaEntitiesFieldInput
            form={form}
            name="estate"
            label="State"
            className="sm:col-span-2"
          />
          <PandaEntitiesFieldInput
            form={form}
            name="epostcode"
            label="Postcode"
            className="sm:col-span-2"
          />
        </div>
      </div>

      <div className={cn("shrink-0 border-t", isCompact ? "p-3" : "p-4")}>
        <PandaEntitiesFieldTextarea form={form} name="notes" label="Notes" />
      </div>
    </>
  )
}
