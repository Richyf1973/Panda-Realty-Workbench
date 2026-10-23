"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"

import {
  AdminClientRegistryProvider,
  type AdminClientRegistryValue,
  type AdminNestedEntityPatchSuccessArgs,
} from "@repo/admin/admin-client-registry-context"
import {
  resolvePropertiesListTableColumnKeys,
  resolvePropertiesListQuickDesktopCardsActive,
} from "@/lib/admin/panda-properties-list-column-resolver"
import { pandaEntitiesAdminGridItem } from "@/components/admin/panda-entities-admin-grid-item"
import { renderPandaEntitiesCrudFormGroupBody } from "@/components/admin/panda-entities-flags-form-group"
import { PandaEntitiesDialogForm } from "@/components/admin/panda-entities-dialog-form"
import { PandaPropertyEntityBuyerDialogForm } from "@/components/admin/panda-property-entity-buyer-dialog-form"
import { PandaPropertiesDialogForm } from "@/components/admin/panda-properties-dialog-form"
import { PropertyFormsCreateDialogBody } from "@/components/admin/property-forms-create-dialog-body"
import { renderCrudRelatedCustomPanel } from "@/lib/admin/panda-registry-custom-panels"
import { buildPropertyListRowActions } from "@/components/admin/property-list-row-actions"
import { streetFilterSegmentActive } from "@/lib/admin/properties-map-results-view"
import { renderPandaPropertyQuickCardOwnerRows } from "@/components/admin/panda-property-quick-card-owner-rows"
import { renderPandaPropertyQuickCardSuccessfulBuyerRow } from "@/components/admin/panda-property-quick-card-successful-buyer-row"
import { adminEntities } from "@/lib/admin/admin-entities-bundled"
import { runEntitiesEditBuyerOffersFollowup } from "@/lib/admin/entities-edit-buyer-offers-followup"
import { notifyAdminPropertyBuyerOffersRefetch } from "@repo/admin/admin-related-inline-draft-sync"
import { emitGoogleContactsPatchWarnings } from "@/lib/google-contacts-warning-client"
import { loadAdminEntityDefinition } from "@/lib/admin/admin-entity-load-definition"
import { mapPropertiesServerErrorToFields } from "@/lib/admin/admin-properties-server-error-mapper"
import {
  PandaPropertiesPayloadIssuesHandlerRefProvider,
  type PandaPropertiesPayloadFieldIssuesHandler,
} from "@/lib/admin/panda-properties-payload-issues-context"
import { frontendConfig } from "@/lib/config/frontend"
import { fetchAddressTypeConversions } from "@/lib/admin/fetch-address-type-conversions.server"
import { AddressConversionsProvider } from "@/lib/address-conversions-context"
import { transformPandaPropertiesQuickTableListColumns } from "@/lib/admin/panda-properties-quick-table-list-columns"
import { PandaCalendarStatusProvider } from "@/lib/admin/panda-calendar-status-context"
import { resolvePropertyOwnerContact } from "@/lib/admin/panda-registry-resolve-owner-contact"
import { resolvePropertyBuyerContact } from "@/lib/admin/panda-registry-resolve-buyer-contact"
import { renderPropertyCrudRelatedTableToolbar, renderPropertyListAboveTable } from "@/lib/admin/panda-registry-toolbars"
import { buildPropertyRowLinks } from "@/lib/admin/panda-registry-row-links"
import { PropertyMapFilterOpenContextProvider } from "@/components/admin/property-map-filter-context"

export function PandaRealtyAdminClientRegistryProvider({
  children,
}: {
  children: ReactNode
}) {
  const adminEntityCrudExtrasForSaveRef = useRef<Record<string, unknown>>({})
  const adminEntityCrudPatchOmitExtrasKeysRef = useRef(new Set<string>())
  const adminEntityCrudBeforePatchRef = useRef<(() => Promise<void>) | null>(null)
  const adminNestedEntityPatchSuccessListenerRef = useRef<
    ((args: AdminNestedEntityPatchSuccessArgs) => void | Promise<void>) | null
  >(null)
  const propertiesPayloadIssuesHandlerRef = useRef<PandaPropertiesPayloadFieldIssuesHandler | null>(
    null,
  )

  // Map-results view (active streetFilter) drops the per-row action cluster down to just the hide
  // tick + map button. Read it here (one subscription) and stash in a ref the row-actions builder
  // reads — the table re-renders on streetFilter changes anyway (its column set changes).
  const searchParams = useSearchParams()
  const streetFilterActiveRef = useRef(false)
  streetFilterActiveRef.current = streetFilterSegmentActive(
    searchParams.get("streetFilter"),
  )

  const [addressConversions, setAddressConversions] = useState<ReadonlyMap<string, string>>(
    new Map(),
  )

  useEffect(() => {
    fetchAddressTypeConversions().then((rows) => {
      setAddressConversions(new Map(rows.map((r) => [r.addressText.toLowerCase(), r.variant])))
    })
  }, [])

  const value = useMemo<AdminClientRegistryValue>(
    () => ({
      frontendConfig,
      adminEntities,
      loadAdminEntityDefinition,
      adminEntityCrudExtrasForSaveRef,
      adminEntityCrudPatchOmitExtrasKeysRef,
      adminEntityCrudBeforePatchRef,
      adminNestedEntityPatchSuccessListenerRef,
      crudFormAfterMainFieldsSideRailSlugs: new Set([]),
      renderCrudFormGroupBody: renderPandaEntitiesCrudFormGroupBody,
      notifyAdminEntityCrudPayloadFieldIssues: ({ slug, fieldKeys }) => {
        if (slug !== "properties") return
        propertiesPayloadIssuesHandlerRef.current?.(fieldKeys)
      },
      onAdminEntityPatchSuccessNotify: (slug) => {
        if (slug === "properties") notifyAdminPropertyBuyerOffersRefetch()
      },
      adminEntityPatchSuccessBySlug: {
        properties: "keepEditDialogOpen",
      },
      crudFormNormalizeValuesBeforeSubmitBySlug: {
        properties: ({ form }) => {
          for (const key of ["bed", "bath", "car"] as const) {
            if (String(form.getFieldValue(key) ?? "").trim() === "") {
              form.setFieldValue(key, "0")
            }
          }
          const rate = String(form.getFieldValue("commissionRate") ?? "").trim()
          if (rate === "") form.setFieldValue("commissionRate", "0")
        },
      },
      crudFormServerErrorToFieldErrorsBySlug: {
        properties: ({ error, entityDefinition }) =>
          mapPropertiesServerErrorToFields(error, entityDefinition),
      },
      adminEntityCreateSuccessFollowup: async ({ createResponse }) => {
        emitGoogleContactsPatchWarnings(createResponse)
      },
      adminEntityEditPatchSuccessFollowup: async ({ slug, patchResponse }) => {
        emitGoogleContactsPatchWarnings(patchResponse)
        if (slug !== "entities") return
        await runEntitiesEditBuyerOffersFollowup()
      },
      /** Nested Edit Buyer (`entities` CRUD opened from property row) uses a different PATCH mutation — must still run buyer-offers → `property-entities` follow-up. */
      adminNestedEntityEditPatchSuccessFollowup: async ({ nestedSlug, patchResponse }) => {
        emitGoogleContactsPatchWarnings(patchResponse)
        if (nestedSlug !== "entities") return
        await runEntitiesEditBuyerOffersFollowup()
      },
      renderCrudRelatedCustomPanel,
      renderCrudRelatedTableToolbar: renderPropertyCrudRelatedTableToolbar,
      crudFormClientSubmitValidatorBySlug: {
        "property-forms": ({ variant, value }) => {
          if (variant !== "create") return undefined
          const fileLink = typeof value["fileLink"] === "string" ? value["fileLink"] : ""
          if (fileLink.trim() === "") {
            return "Please upload a file to Google Drive before creating the form."
          }
          return undefined
        },
      },
      renderCrudDialogFormBody: (args) => {
        if (args.slug === "entities" || args.slug === "contacts") {
          return <PandaEntitiesDialogForm {...args} />
        }
        if (args.slug === "properties") {
          return <PandaPropertiesDialogForm {...args} />
        }
        if (args.slug === "property-entities") {
          return <PandaPropertyEntityBuyerDialogForm {...args} />
        }
        if (args.slug === "property-forms" && args.variant === "create") {
          return <PropertyFormsCreateDialogBody {...args} />
        }
        return null
      },
      resolveListTableColumnKeys: resolvePropertiesListTableColumnKeys,
      resolveListQuickDesktopCardsActive: resolvePropertiesListQuickDesktopCardsActive,
      transformListTableColumns: transformPandaPropertiesQuickTableListColumns,
      renderAdminEntityListRowActions: ({ slug, row }) => {
        if (slug !== "properties") return null
        const propertyListId = typeof row["propertyListId"] === "number" ? row["propertyListId"] : null
        if (propertyListId == null) return null
        const streetAddress = typeof row["streetAddress"] === "string" ? row["streetAddress"] : ""
        const suburb = typeof row["suburb"] === "string" ? row["suburb"] : ""
        const state = typeof row["state"] === "string" ? row["state"] : ""
        const { resolvedPhone, resolvedEmail, resolvedName, primaryPhoneOwnerName, primaryEmailOwnerName } = resolvePropertyOwnerContact(row)
        const { resolvedPhone: buyerPhone, resolvedEmail: buyerEmail, primaryPhoneBuyerName: buyerName, primaryEmailBuyerName: buyerEmailName } = resolvePropertyBuyerContact(row)
        const dueHighlightActive = row["dueHighlightActive"] === true
        const dueHighlightLabels = Array.isArray(row["dueHighlightLabels"])
          ? (row["dueHighlightLabels"] as string[])
          : []
        const dueWarningActive = row["dueWarningActive"] === true
        const dueWarningLabels = Array.isArray(row["dueWarningLabels"])
          ? (row["dueWarningLabels"] as string[])
          : []
        const dueWarningTier = row["dueWarningTier"] === "soon" ? "soon" : "upcoming"
        return buildPropertyListRowActions({
          propertyListId,
          streetAddress,
          suburb,
          state,
          owner1name: resolvedName,
          owner1phone: resolvedPhone,
          owner1email: resolvedEmail,
          primaryPhoneOwnerName,
          primaryEmailOwnerName,
          primaryBuyerPhone: buyerPhone,
          primaryBuyerEmail: buyerEmail,
          primaryBuyerName: buyerName,
          primaryBuyerEmailName: buyerEmailName,
          dueHighlightActive,
          dueHighlightLabels,
          dueWarningActive,
          dueWarningLabels,
          dueWarningTier,
          mapResultsOnly: streetFilterActiveRef.current,
        })
      },
      renderAdminEntityListAboveTable: renderPropertyListAboveTable,
      // Per-row "remove from this view" checkbox on the properties desktop table
      // (client-only, non-persistent — clears on reload / fresh search / Reset).
      adminEntityListRowHideFromViewSlugs: ["properties"],
      renderAdminEntityListGridItemBySlug: {
        "panda-entities-card": pandaEntitiesAdminGridItem,
      },
      renderQuickDesktopCardOwnerRows: renderPandaPropertyQuickCardOwnerRows,
      renderQuickDesktopCardSuccessfulBuyerRow: renderPandaPropertyQuickCardSuccessfulBuyerRow,
      renderAdminEntityListRowLinks: ({ slug, row, compactRowLinks }) => {
        if (slug !== "properties") return null
        return buildPropertyRowLinks(row, compactRowLinks, addressConversions)
      },
    }),
    [addressConversions],
  )
  return (
    <PandaPropertiesPayloadIssuesHandlerRefProvider handlerRef={propertiesPayloadIssuesHandlerRef}>
      <AddressConversionsProvider conversions={addressConversions}>
        <PandaCalendarStatusProvider>
          <AdminClientRegistryProvider value={value}>
            <PropertyMapFilterOpenContextProvider>
              {children}
            </PropertyMapFilterOpenContextProvider>
          </AdminClientRegistryProvider>
        </PandaCalendarStatusProvider>
      </AddressConversionsProvider>
    </PandaPropertiesPayloadIssuesHandlerRefProvider>
  )
}
