"use client"

import type { ReactNode } from "react"

import type { AdminRenderCrudRelatedCustomPanelArgs } from "@repo/admin/admin-client-registry-context"

import { PropertyEntityBuyerOffersPanel } from "@/components/admin/property-entity-buyer-offers-panel"
import { PropertyEntityFilesPanel } from "@/components/admin/property-entity-files-panel"
import { PropertyEntityBuyerMembersPanel } from "@/components/admin/property-entity-buyer-members-panel"
import { PropertyEntityPortalMessagePanel } from "@/components/admin/property-entity-portal-message-panel"
import { PropertyEntityPortalPanel } from "@/components/admin/property-entity-portal-panel"

export function renderCrudRelatedCustomPanel(
  args: AdminRenderCrudRelatedCustomPanelArgs,
): ReactNode | null {
  const { customRelatedPanelKey, entityRowId, variant, detailPayload } = args

  if (customRelatedPanelKey === "property-entity-buyer-offers" && entityRowId) {
    return <PropertyEntityBuyerOffersPanel propertyEntityId={Number(entityRowId)} />
  }

  if (customRelatedPanelKey === "property-entity-files" && entityRowId) {
    return <PropertyEntityFilesPanel propertyEntityId={Number(entityRowId)} variant={variant} />
  }

  if (customRelatedPanelKey === "property-entity-buyer-members") {
    const entityId =
      detailPayload != null && typeof detailPayload["entityId"] === "number"
        ? detailPayload["entityId"]
        : null
    const entityName =
      detailPayload != null && typeof detailPayload["entityName"] === "string"
        ? detailPayload["entityName"]
        : ""
    return <PropertyEntityBuyerMembersPanel entityId={entityId} variant={variant} entityName={entityName} />
  }

  if (customRelatedPanelKey === "property-entity-portal" && entityRowId) {
    return (
      <PropertyEntityPortalPanel
        propertyEntityId={Number(entityRowId)}
        variant={variant}
      />
    )
  }

  if (customRelatedPanelKey === "property-entity-messages" && entityRowId) {
    return (
      <PropertyEntityPortalMessagePanel
        propertyEntityId={Number(entityRowId)}
      />
    )
  }

  if (customRelatedPanelKey === "entity-members-panel") {
    const entityId = entityRowId != null ? Number(entityRowId) : null
    return (
      <PropertyEntityBuyerMembersPanel
        entityId={entityId}
        variant={variant}
        membersPanelSource="entities"
        entityName=""
      />
    )
  }

  return null
}
