"use client"

import { useEffect, useState } from "react"

import { useStore, type Store } from "@tanstack/react-store"
import { useAdminPropertyBuyerOffersRefetchGeneration } from "@repo/admin/admin-related-inline-draft-sync"

import type { AdminRenderCrudDialogFormBodyArgs } from "@repo/admin/admin-client-registry-context"

import { usePandaPropertyBuyerOffers } from "./panda-properties-buyer-offers-fetch"
import type { FormLike, FormStoreState } from "./panda-properties-dialog-form-types"
import {
  PandaPropertiesFormCoreSection,
  PANDA_PROPERTIES_CORE_SECTION_PAYLOAD_KEYS,
} from "./panda-properties-form-core-section"
import { PandaPropertiesFormFavoriteTabs } from "./panda-properties-form-favorite-tabs"
import { PandaPropertiesFormOwnersSection } from "./panda-properties-form-owners-section"
import { PandaPropertiesFormSuccessfulBuyerSection } from "./panda-properties-form-successful-buyer-section"
import { PandaPropertiesFormTopBar } from "./panda-properties-form-top-bar"
import { PropertySellerPortalPanel } from "./property-seller-portal-panel"
import { usePandaPropertiesPayloadIssuesHandlerRef } from "@/lib/admin/panda-properties-payload-issues-context"

export function PandaPropertiesDialogForm({
  variant,
  slug,
  entityDefinition: _entityDefinition,
  entityRowId,
  form: formArg,
  listDetailSeed,
  crudListRelationFieldOptions,
  isCompact: _isCompact,
}: AdminRenderCrudDialogFormBodyArgs) {
  const form = formArg as unknown as FormLike
  const statusOpts = crudListRelationFieldOptions?.["propertyStatusId"]

  const buyerOffersRefetchGeneration = useAdminPropertyBuyerOffersRefetchGeneration()
  const { offers, offersLoading } = usePandaPropertyBuyerOffers(
    entityRowId,
    buyerOffersRefetchGeneration,
  )
  const propertyListId =
    typeof entityRowId === "number"
      ? entityRowId
      : typeof entityRowId === "string" && entityRowId.trim() !== "" && Number.isFinite(Number(entityRowId))
        ? Number(entityRowId)
        : null

  const acceptedOffer = offers.find((o) => o.isAccepted) ?? null

  // Deep link from a portal notification email: `?openMessages=seller` or
  // `?openMessages=buyer&openMessagesEntity=<propertyEntityId>` auto-opens the right messages thread.
  // Captured once at mount from window.location — the admin strips list params via a deferred
  // router.replace shortly after `openEdit` fires, so the reactive useSearchParams would lose it.
  const [deepLinkMessages] = useState<{ role: string | null; entity: number }>(() => {
    if (typeof window === "undefined") return { role: null, entity: NaN }
    const p = new URLSearchParams(window.location.search)
    return { role: p.get("openMessages"), entity: Number(p.get("openMessagesEntity")) }
  })
  const autoOpenSellerMessages = deepLinkMessages.role === "seller"
  const autoOpenBuyerMessages =
    deepLinkMessages.role === "buyer" &&
    acceptedOffer != null &&
    deepLinkMessages.entity === acceptedOffer.propertyEntityId

  const propertyAddress = useStore(
    form.store as Store<{ values?: { streetAddress?: string; suburb?: string } }>,
    (s) => [s?.values?.streetAddress, s?.values?.suburb].filter(Boolean).join(", "),
  )

  const [propertyDetailsOpen, setPropertyDetailsOpen] = useState(propertyListId === null) // open by default when adding a new property
  const payloadIssuesHandlerRef = usePandaPropertiesPayloadIssuesHandlerRef()

  const hasCoreSectionClientErrors = useStore(
    form.store as Store<FormStoreState>,
    (s) =>
      Object.entries(s?.fieldMeta ?? {}).some(
        ([key, meta]) =>
          PANDA_PROPERTIES_CORE_SECTION_PAYLOAD_KEYS.has(key) &&
          (meta?.errors?.length ?? 0) > 0,
      ),
  )

  useEffect(() => {
    if (hasCoreSectionClientErrors) setPropertyDetailsOpen(true)
  }, [hasCoreSectionClientErrors])

  useEffect(() => {
    const handler: (fieldKeys: readonly string[]) => void = (fieldKeys) => {
      if (fieldKeys.some((k) => PANDA_PROPERTIES_CORE_SECTION_PAYLOAD_KEYS.has(k))) {
        setPropertyDetailsOpen(true)
      }
    }
    payloadIssuesHandlerRef.current = handler
    return () => {
      if (payloadIssuesHandlerRef.current === handler) {
        payloadIssuesHandlerRef.current = null
      }
    }
  }, [payloadIssuesHandlerRef])

  const coreSection = (
    <PandaPropertiesFormCoreSection
      form={form}
      propertyDetailsOpen={propertyDetailsOpen}
      onPropertyDetailsOpenChange={setPropertyDetailsOpen}
    />
  )

  const ownersSection = (
    <PandaPropertiesFormOwnersSection form={form} propertyListId={propertyListId} />
  )

  const sellerEmail = useStore(
    form.store as Store<{
      values?: {
        owner1email?: string | null
        owner2email?: string | null
        owner3email?: string | null
        primaryEmailOwnerNum?: number | null
      }
    }>,
    (s) => {
      const n = typeof s.values?.primaryEmailOwnerNum === "number" ? s.values.primaryEmailOwnerNum : 1
      const emails = [s.values?.owner1email, s.values?.owner2email, s.values?.owner3email]
      if (n >= 1 && n <= 3) return emails[n - 1] ?? null
      return emails.find(Boolean) ?? null
    },
  )

  const sellerPortalSection =
    variant === "edit" && propertyListId != null ? (
      <div
        className="shrink-0 border-b px-4 py-2"
        data-testid="panda-properties-form-section--seller-portal"
      >
        <PropertySellerPortalPanel
          compact
          propertyListId={propertyListId}
          variant="edit"
          sellerEmail={sellerEmail}
          autoOpenMessages={autoOpenSellerMessages}
        />
      </div>
    ) : null

  return (
    <div
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto scrollbar-galaxy"
      data-testid="panda-properties-dialog-form"
    >
      <PandaPropertiesFormTopBar
        form={form}
        statusOpts={statusOpts}
      />
      {acceptedOffer == null ? (
        <>
          {coreSection}
          {ownersSection}
          {sellerPortalSection}
        </>
      ) : (
        <>
          {ownersSection}
          {sellerPortalSection}
          {variant === "edit" && propertyListId != null && (
            <PandaPropertiesFormSuccessfulBuyerSection
              acceptedOffer={acceptedOffer}
              propertyListId={propertyListId}
              propertyAddress={propertyAddress}
              autoOpenMessages={autoOpenBuyerMessages}
            />
          )}
          {coreSection}
        </>
      )}
      <PandaPropertiesFormFavoriteTabs
        form={form}
        slug={slug}
        variant={variant}
        entityRowId={entityRowId}
        listDetailSeed={listDetailSeed}
        offers={offers}
        offersLoading={offersLoading}
        acceptedOffer={acceptedOffer}
      />
    </div>
  )
}
