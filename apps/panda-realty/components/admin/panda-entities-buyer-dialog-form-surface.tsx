"use client"

import type { AdminNestedEditUiContext } from "@repo/admin/components/admin/admin-entity-crud-dialog-state"
import { cn } from "@repo/ui/utils"

import { PandaEntitiesFieldInput } from "./panda-entities-dialog-form-fields"
import type { PandaEntitiesFormLike } from "./panda-entities-dialog-form-types"
import { PandaEntitiesBuyerMeetingReminderToolbar } from "./panda-entities-buyer-meeting-reminder-toolbar"
import { PandaEntitiesBuyerTabs } from "./panda-entities-buyer-tabs"
import { PandaEntitiesPropertyConnections } from "./panda-entities-property-connections"

type RawPropertyEntity = {
  propertyEntityId?: number; property_entity_id?: number
  entityId?: number; entity_id?: number
  propertyListId?: number | null; property_list_id?: number | null
  propertyEntityNote?: string | null; property_entity_note?: string | null
  buyerPipelineStatusId?: number | null; buyer_pipeline_status_id?: number | null
  isOriginalOwner?: boolean; is_original_owner?: boolean
  buyerPipelineStatus?: { propertyStatus: string } | null; buyer_pipeline_status?: { propertyStatus: string } | null
  propertyRef?: { streetAddress?: string; state?: string; postcode?: string } | null
  property_ref?: { streetAddress?: string; state?: string; postcode?: string } | null
}

type Props = {
  form: PandaEntitiesFormLike
  variant: "create" | "edit"
  entityRowId: string | null
  listDetailSeed?: Record<string, unknown>
  nestedEditUiContext?: AdminNestedEditUiContext
  isCompact: boolean
}

export function PandaEntitiesBuyerDialogFormSurface({
  form,
  variant,
  entityRowId,
  listDetailSeed,
  nestedEditUiContext,
  isCompact,
}: Props) {
  const rawEntities = (listDetailSeed?.property_entities as RawPropertyEntity[] | undefined) ?? null
  const preloadedConnections = rawEntities
    ? rawEntities.map((pe) => ({
        propertyEntityId: (pe.propertyEntityId ?? pe.property_entity_id) as number,
        entityId: (pe.entityId ?? pe.entity_id) as number,
        propertyListId: pe.propertyListId ?? pe.property_list_id,
        propertyEntityNote: (pe.propertyEntityNote ?? pe.property_entity_note) ?? null,
        buyerPipelineStatusId: (pe.buyerPipelineStatusId ?? pe.buyer_pipeline_status_id) ?? null,
        isOriginalOwner: (pe.isOriginalOwner ?? pe.is_original_owner) as boolean,
        buyerPipelineStatus: pe.buyerPipelineStatus ?? pe.buyer_pipeline_status,
        propertyRef: pe.propertyRef ?? pe.property_ref,
      }))
    : null

  return (
    <>
      <PandaEntitiesBuyerMeetingReminderToolbar
        form={form}
        entityRowId={entityRowId}
        variant={variant}
        nestedEditUiContext={nestedEditUiContext}
        isCompact={isCompact}
        preloadedConnections={preloadedConnections}
      />

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
            label="Enquiry Name"
            required
            className="sm:col-span-4"
          />
          <PandaEntitiesFieldInput
            form={form}
            name="contact"
            label="Contact number"
            type="tel"
            autoComplete="tel"
            className="sm:col-span-4"
          />
          <PandaEntitiesFieldInput
            form={form}
            name="emailAddress"
            label="Email"
            type="email"
            autoComplete="email"
            className="sm:col-span-4"
          />
        </div>
      </div>

      {variant === "edit" && entityRowId != null && (
        <form.Subscribe
          selector={(state) => state.values?.entityName ?? ""}
          children={(entityName) => (
            <PandaEntitiesBuyerTabs
              entityId={Number(entityRowId)}
              isCompact={isCompact}
              entityName={entityName}
              listDetailSeed={listDetailSeed}
            />
          )}
        />
      )}

      {variant === "edit" && entityRowId != null && (
        <PandaEntitiesPropertyConnections
          entityRowId={entityRowId}
          isCompact={isCompact}
          initialLinkPropertyListId={nestedEditUiContext?.sourcePropertyListId}
        />
      )}
    </>
  )
}
