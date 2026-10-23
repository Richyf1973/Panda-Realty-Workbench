"use client"

import type { ReactNode } from "react"
import { useStore, type Store } from "@tanstack/react-store"

import { AdminEntityCrudRelatedCollectionsSection } from "@repo/admin/components/admin/admin-entity-crud-related-collections"
import { AdminEntityCrudListRelationAsyncSearchControl } from "@repo/admin/components/admin/admin-entity-crud-list-relation-async-search-control"
import { AdminEntityCrudListRelationSelectControl } from "@repo/admin/components/admin/admin-entity-crud-list-relation-select-control"
import type { AdminRenderCrudDialogFormBodyArgs } from "@repo/admin/admin-client-registry-context"
import { adminEntityBooleanFormChecked } from "@repo/admin/admin-entity-crud-boolean-form"
import { adminEntityListRelationUsesCrudAsyncSearch } from "@repo/admin/admin-entity-list-relation-crud-async"
import type { AdminEntityColumn } from "@repo/admin/admin-entity-types"
import { notifyAdminRelatedInlineDraftSync } from "@repo/admin/admin-related-inline-draft-sync"
import { Label } from "@repo/ui/label"
import { Switch } from "@repo/ui/switch"
import { Textarea } from "@repo/ui/textarea"
import { cn } from "@repo/ui/utils"

import { adminEntities } from "@/lib/admin/admin-entities-bundled"
import { propertyEntitiesEntity } from "@/lib/admin/entities/propertyEntities"

function isBuyerCategory(listDetailSeed: Record<string, unknown> | undefined) {
  const embed = listDetailSeed?.propertyEntity as
    | Record<string, unknown>
    | undefined
  const cat = embed?.entityCategoryId
  return cat === 1 || cat === "1" || String(cat) === "1"
}

type FieldApi = {
  state: {
    value: string
    meta: { errors: readonly string[] }
  }
  handleChange: (v: string) => void
  handleBlur: () => void
}

type FormLike = NonNullable<AdminRenderCrudDialogFormBodyArgs["form"]> & {
  store: Store<unknown>
  Field: (props: {
    name: string
    validators?: { onSubmit?: (args: { value: string }) => string | undefined }
    children: (field: FieldApi) => ReactNode
  }) => ReactNode
}

type AdminEntityStringMapForm = Record<string, string>

function useFormValues(form: FormLike): AdminEntityStringMapForm {
  return useStore(form.store, (s) => {
    const v = (s as { values?: AdminEntityStringMapForm }).values
    return v ?? {}
  })
}

function PandaPropertyEntityNonBuyerDialogForm({
  form,
  listDetailSeed,
}: {
  form: FormLike
  listDetailSeed?: Record<string, unknown>
}) {
  const formValues = useFormValues(form)
  const propertyListId = (formValues.propertyListId ?? "").trim()

  const propertyRef = listDetailSeed?.propertyRef as
    | Record<string, unknown>
    | undefined
  const propertyLabel = [
    typeof propertyRef?.streetAddress === "string"
      ? propertyRef.streetAddress
      : null,
    typeof propertyRef?.state === "string" ? propertyRef.state : null,
    typeof propertyRef?.postcode === "string" ? propertyRef.postcode : null,
  ]
    .filter(Boolean)
    .join(", ")

  const baseEntityIdCol = propertyEntitiesEntity.columns.find(
    (c) => c.key === "entityId",
  )
  if (
    baseEntityIdCol == null ||
    baseEntityIdCol.listRelation == null ||
    !adminEntityListRelationUsesCrudAsyncSearch(baseEntityIdCol)
  ) {
    return (
      <div className="p-4 text-sm text-destructive">
        Missing entity relation column config for property-entities.
      </div>
    )
  }

  const entityIdCol: AdminEntityColumn = {
    ...(baseEntityIdCol as AdminEntityColumn),
    formInputId: "panda-pe-nonbuyer-entityId",
  }
  const entityHtmlId = entityIdCol.formInputId ?? "panda-pe-nonbuyer-entityId"

  const relationFilterSelections =
    propertyListId !== "" ? { propertyListId } : undefined

  return (
    <div
      className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-4"
      data-testid="panda-property-entity-non-buyer-dialog-form"
    >
      <div
        className="shrink-0 rounded-lg border border-border/80 bg-muted/20 px-3 py-2 text-sm"
        data-testid="panda-property-entity-non-buyer-dialog-form--header"
      >
        <span className="font-medium">Property link</span>
        <span className="text-muted-foreground">
          {" "}
          — edit the linked entity, note, and original-owner flag. Buyer-only
          tabs open only when the entity category is buyer.
        </span>
        {propertyLabel ? (
          <div className="mt-0.5 text-xs text-muted-foreground">
            {propertyLabel}
          </div>
        ) : null}
      </div>

      <div className="grid max-w-xl gap-4">
        <form.Field
          name="entityId"
          validators={{
            onSubmit: ({ value }) =>
              value.trim() ? undefined : "Required",
          }}
        >
          {(field) => (
            <div
              className="grid gap-2"
              data-testid="panda-property-entity-non-buyer-field--entityId"
            >
              <Label htmlFor={entityHtmlId}>Entity</Label>
              <AdminEntityCrudListRelationAsyncSearchControl
                col={entityIdCol}
                htmlForId={entityHtmlId}
                data-testid="panda-property-entity-non-buyer-relation-async--entityId"
                ariaLabel="Entity"
                required
                value={field.state.value}
                onChange={field.handleChange}
                onBlur={field.handleBlur}
                emptyChoiceLabel="Select…"
                allowClear={false}
                relationFilterSelections={relationFilterSelections}
              />
              {field.state.meta.errors[0] ? (
                <p className="text-sm text-destructive">
                  {field.state.meta.errors[0]}
                </p>
              ) : null}
            </div>
          )}
        </form.Field>

        <form.Field name="propertyEntityNote">
          {(field) => (
            <div
              className="grid gap-2"
              data-testid="panda-property-entity-non-buyer-field--propertyEntityNote"
            >
              <Label htmlFor="panda-pe-nonbuyer-propertyEntityNote">Note</Label>
              <Textarea
                id="panda-pe-nonbuyer-propertyEntityNote"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                rows={4}
                className="min-h-[96px] resize-y"
              />
            </div>
          )}
        </form.Field>

        <form.Field name="isOriginalOwner">
          {(field) => (
            <div
              className="flex items-center gap-2"
              data-testid="panda-property-entity-non-buyer-field--isOriginalOwner"
            >
              <Switch
                id="panda-pe-nonbuyer-isOriginalOwner"
                checked={adminEntityBooleanFormChecked(field.state.value)}
                onCheckedChange={(v) =>
                  field.handleChange(v ? "true" : "false")
                }
              />
              <Label
                htmlFor="panda-pe-nonbuyer-isOriginalOwner"
                className="font-normal"
              >
                Original owner
              </Label>
            </div>
          )}
        </form.Field>
      </div>
    </div>
  )
}

/**
 * Custom CRUD body for `property-entities`: buyer category shows the full buyer
 * workspace (related collections). Other categories show a junction-only form
 * so the default generated body (with buyer-only related tabs) is not used.
 */
export function PandaPropertyEntityBuyerDialogForm({
  variant,
  entityRowId,
  listDetailSeed,
  form,
  crudListRelationFieldOptions,
  isCompact: _isCompact,
}: AdminRenderCrudDialogFormBodyArgs) {
  const propertyEntitiesDef = adminEntities["property-entities"]

  if (!isBuyerCategory(listDetailSeed)) {
    if (form == null) return null
    return (
      <PandaPropertyEntityNonBuyerDialogForm
        form={form as FormLike}
        listDetailSeed={listDetailSeed}
      />
    )
  }

  const embed = listDetailSeed?.propertyEntity as
    | Record<string, unknown>
    | undefined
  const buyerName =
    typeof embed?.entityName === "string" && embed.entityName.trim() !== ""
      ? embed.entityName
      : "Buyer"

  const propertyRef = listDetailSeed?.propertyRef as
    | Record<string, unknown>
    | undefined
  const propertyLabel = [
    typeof propertyRef?.streetAddress === "string"
      ? propertyRef.streetAddress
      : null,
    typeof propertyRef?.state === "string" ? propertyRef.state : null,
    typeof propertyRef?.postcode === "string" ? propertyRef.postcode : null,
  ]
    .filter(Boolean)
    .join(", ")

  const pipelineOpts = crudListRelationFieldOptions?.["buyerPipelineStatusId"]

  if (form == null) return null

  return (
    <div
      className="flex min-h-0 min-w-0 flex-1 flex-col"
      data-testid="panda-property-entity-buyer-dialog-form"
    >
      <div
        className="shrink-0 px-4 py-2 text-sm"
        data-testid="panda-property-entity-buyer-dialog-form--header"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <span className="font-medium">Buyer workspace</span>
          <span className="text-muted-foreground"> — {buyerName}</span>
          {propertyLabel ? (
            <span className="text-xs text-muted-foreground">{propertyLabel}</span>
          ) : null}
        </div>
        <form.Field name="buyerPipelineStatusId">
          {(field: FieldApi) => (
            <div
              className="mt-2 flex items-center gap-2"
              data-testid="panda-property-entity-buyer-field--buyerPipelineStatusId"
            >
              <Label
                htmlFor="panda-pe-buyer-buyerPipelineStatusId"
                className="shrink-0 text-xs font-normal text-muted-foreground"
              >
                Pipeline stage
              </Label>
              <div className="w-52">
                <AdminEntityCrudListRelationSelectControl
                  htmlForId="panda-pe-buyer-buyerPipelineStatusId"
                  data-testid="panda-property-entity-buyer-select--buyerPipelineStatusId"
                  ariaLabel="Pipeline stage"
                  required={false}
                  value={field.state.value}
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                  emptyChoiceLabel="Not on pipeline"
                  baseOptions={pipelineOpts?.options ?? []}
                  optionsPending={pipelineOpts?.optionsPending ?? false}
                />
              </div>
            </div>
          )}
        </form.Field>
      </div>
      <AdminEntityCrudRelatedCollectionsSection
        slug="property-entities"
        entityDefinition={propertyEntitiesDef}
        variant={variant}
        entityRowId={entityRowId}
        listDetailSeed={listDetailSeed}
        onExtrasPayloadSynced={notifyAdminRelatedInlineDraftSync}
        parentCrudForm={form as never}
      />
    </div>
  )
}
