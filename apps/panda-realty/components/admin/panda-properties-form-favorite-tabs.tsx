"use client"

import { adminEntityBooleanFormChecked } from "@repo/admin/admin-entity-crud-boolean-form"

import { AcceptedOfferSubmissionPanel } from "./accepted-offer-submission-panel"
import type { AdminRenderCrudDialogFormBodyArgs } from "@repo/admin/admin-client-registry-context"
import type { AdminEntitySlug } from "@repo/admin/admin-entity-slug-client"

import { PropertyBuyersPanel } from "./property-buyers-panel"
import { PropertyContactsPanel } from "./property-contacts-panel"
import { PropertyTenantsPanel } from "./property-tenants-panel"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs"

import { FieldDateText } from "./panda-properties-form-fields"
import { isManufacturedHome } from "@/lib/cooling-off-days"
import { LatestBuyerOffersSection } from "./panda-properties-buyer-offers-section"
import { PandaPropertiesFormFilesTab } from "./panda-properties-form-files-tab"
import { PandaPropertiesFormFormsTab } from "./panda-properties-form-forms-tab"
import { PandaPropertiesFormNotesTab } from "./panda-properties-form-notes-tab"
import { PandaPropertiesFormTimelineTab } from "./panda-properties-form-timeline-tab"
import type { BuyerOffer, FormLike } from "./panda-properties-dialog-form-types"

function selectPropertyAddress(state: { values: Record<string, unknown> }): string {
  return [String(state.values.streetAddress ?? ""), String(state.values.suburb ?? "")]
    .filter(Boolean)
    .join(", ")
}

// The admin Subscribe selector type only permits a string return, so the sales panel's
// reactive inputs (address + live Contract/Disclosure dates) are packed into one JSON
// string key (primitive, so the store re-renders only when one of them changes).
/** Address + live Contract/Disclosure dates the accepted-offer panel needs to recompute deadlines, as one JSON key. */
function selectSalesPanelKey(state: { values: Record<string, unknown> }): string {
  return JSON.stringify({
    propertyAddress: selectPropertyAddress(state),
    contractDate: state.values.contractDate == null ? null : String(state.values.contractDate),
    disclosureDate: state.values.disclosureDate == null ? null : String(state.values.disclosureDate),
  })
}

export function PandaPropertiesFormFavoriteTabs({
  form,
  slug: _slug,
  variant,
  entityRowId,
  listDetailSeed: _listDetailSeed,
  offers,
  offersLoading,
  acceptedOffer,
}: {
  form: FormLike
  slug: AdminEntitySlug
  variant: "create" | "edit"
  entityRowId: string | null
  listDetailSeed: AdminRenderCrudDialogFormBodyArgs["listDetailSeed"]
  offers: BuyerOffer[]
  offersLoading: boolean
  acceptedOffer: BuyerOffer | null
}) {
  return (
    <form.Subscribe selector={(state) => String(state.values.isFavorite ?? "")}>
      {(isFavorite) =>
        adminEntityBooleanFormChecked(isFavorite) ? (
          <Tabs
            key={acceptedOffer ? "with-offer" : "no-offer"}
            defaultValue={acceptedOffer ? "sales" : "timeline"}
            className="flex shrink-0 flex-col min-w-0"
            data-testid="panda-properties-form-bottom-tabs"
          >
            <TabsList className="mx-4 mt-2 mb-1 max-w-[calc(100%-2rem)] shrink-0 flex-nowrap justify-start overflow-x-auto">
              {acceptedOffer && (
                <TabsTrigger
                  value="sales"
                  className="shrink-0 min-h-[44px] sm:min-h-0"
                  data-testid="panda-properties-form-tab-trigger--sales"
                >
                  Sales Information
                </TabsTrigger>
              )}
              <TabsTrigger
                value="timeline"
                className="shrink-0 min-h-[44px] sm:min-h-0"
                data-testid="panda-properties-form-tab-trigger--timeline"
              >
                Timeline
              </TabsTrigger>
              <TabsTrigger
                value="buyers"
                className="shrink-0 min-h-[44px] sm:min-h-0"
                data-testid="panda-properties-form-tab-trigger--buyers"
              >
                Buyers
              </TabsTrigger>
              <TabsTrigger
                value="contacts"
                className="shrink-0 min-h-[44px] sm:min-h-0"
                data-testid="panda-properties-form-tab-trigger--contacts"
              >
                Contacts
              </TabsTrigger>
              <TabsTrigger
                value="tenants"
                className="shrink-0 min-h-[44px] sm:min-h-0"
                data-testid="panda-properties-form-tab-trigger--tenants"
              >
                Tenants
              </TabsTrigger>
              <TabsTrigger
                value="files"
                className="shrink-0 min-h-[44px] sm:min-h-0"
                data-testid="panda-properties-form-tab-trigger--files"
              >
                Files
              </TabsTrigger>
              <TabsTrigger
                value="forms"
                className="shrink-0 min-h-[44px] sm:min-h-0"
                data-testid="panda-properties-form-tab-trigger--forms"
              >
                Forms
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="shrink-0 min-h-[44px] sm:min-h-0"
                data-testid="panda-properties-form-tab-trigger--notes"
              >
                Notes
              </TabsTrigger>
            </TabsList>

            {acceptedOffer && <TabsContent
              value="sales"
              className="flex flex-col"
              data-testid="panda-properties-form-tab--sales"
            >
              <div className="px-4 pb-4" data-testid="panda-properties-sales-accepted-offer-section">
                <div className="mb-3 flex gap-3">
                  <FieldDateText
                    form={form}
                    name="contractDate"
                    label="Contract date"
                    className="max-w-xs"
                  />
                  <form.Subscribe selector={(state) => String(state.values.propertyType ?? "")}>
                    {(propertyType) =>
                      isManufacturedHome(propertyType) ? (
                        <FieldDateText
                          form={form}
                          name="disclosureDate"
                          label="Disclosure date"
                          className="max-w-xs"
                        />
                      ) : null
                    }
                  </form.Subscribe>
                </div>
                <form.Subscribe selector={selectSalesPanelKey}>
                  {(salesPanelKey) => {
                    const { propertyAddress, contractDate, disclosureDate } = JSON.parse(salesPanelKey) as {
                      propertyAddress: string
                      contractDate: string | null
                      disclosureDate: string | null
                    }
                    return (
                      <AcceptedOfferSubmissionPanel
                        propertyEntityId={acceptedOffer.propertyEntityId}
                        propertyAddress={propertyAddress}
                        offerId={acceptedOffer.buyerOfferId}
                        token={acceptedOffer.offerFormToken}
                        contractDateOverride={contractDate}
                        disclosureDateOverride={disclosureDate}
                      />
                    )
                  }}
                </form.Subscribe>
              </div>
            </TabsContent>}

            <TabsContent
              value="timeline"
              className="flex flex-col"
              data-testid="panda-properties-form-tab--timeline"
            >
              <PandaPropertiesFormTimelineTab propertyListId={entityRowId} />
            </TabsContent>

            <TabsContent
              value="buyers"
              className="flex flex-col"
              data-testid="panda-properties-form-tab--buyers"
            >
              <LatestBuyerOffersSection offers={offers} loading={offersLoading} />
              <form.Subscribe selector={selectPropertyAddress}>
                {(propertyAddress) => (
                  <PropertyBuyersPanel propertyListId={entityRowId} variant={variant} propertyAddress={propertyAddress} />
                )}
              </form.Subscribe>
            </TabsContent>

            <TabsContent
              value="contacts"
              className="flex flex-col"
              data-testid="panda-properties-form-tab--contacts"
            >
              <form.Subscribe selector={selectPropertyAddress}>
                {(propertyAddress) => (
                  <PropertyContactsPanel propertyListId={entityRowId} variant={variant} propertyAddress={propertyAddress} />
                )}
              </form.Subscribe>
            </TabsContent>

            <TabsContent
              value="tenants"
              className="flex flex-col"
              data-testid="panda-properties-form-tab--tenants"
            >
              <form.Subscribe selector={selectPropertyAddress}>
                {(propertyAddress) => (
                  <PropertyTenantsPanel propertyListId={entityRowId} variant={variant} propertyAddress={propertyAddress} />
                )}
              </form.Subscribe>
            </TabsContent>

            <TabsContent
              value="files"
              className="flex flex-col"
              data-testid="panda-properties-form-tab--files"
            >
              <PandaPropertiesFormFilesTab propertyListId={entityRowId} />
            </TabsContent>

            <TabsContent
              value="forms"
              className="flex flex-col"
              data-testid="panda-properties-form-tab--forms"
            >
              <form.Subscribe selector={selectPropertyAddress}>
                {(propertyAddress) => (
                  <PandaPropertiesFormFormsTab propertyListId={entityRowId} propertyAddress={propertyAddress} />
                )}
              </form.Subscribe>
            </TabsContent>

            <TabsContent
              value="notes"
              className="flex flex-col"
              data-testid="panda-properties-form-tab--notes"
            >
              <PandaPropertiesFormNotesTab propertyListId={entityRowId} />
            </TabsContent>

          </Tabs>
        ) : null
      }
    </form.Subscribe>
  )
}
