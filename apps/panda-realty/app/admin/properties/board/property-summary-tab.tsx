"use client"

import { conditionDueRowTestIdSlug } from "./condition-due-test-id"
import { hasPositiveDayCount } from "./compute-condition-events"
import { ContactList } from "./contact-chip"
import { DealStepperSection } from "./deal-stepper-section"
import { OfferConditionsPanel } from "./offer-conditions-panel"
import { formatAUD, formatDate } from "./panel-shared"
import type {
  DealStage,
  PropertyDetailBuyer,
  PropertyDetailProperty,
} from "./property-types"

function addDays(base: Date, days: number): string {
  const d = new Date(base)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
}

// ─── SummaryTab ────────────────────────────────────────────────────────────

export function SummaryTab({
  property,
  buyers,
  dealStages,
  onDealStageChange,
  onConditionsSaved,
  onMeetingAdded,
}: {
  property: PropertyDetailProperty | null
  buyers: PropertyDetailBuyer[]
  dealStages: DealStage[]
  onDealStageChange: (statusId: number) => void
  onConditionsSaved: () => void
  onMeetingAdded: () => void
}) {
  if (!property) return <p className="py-6 text-center text-sm text-muted-foreground">Property not found.</p>

  const sellers = [
    { name: property.owner1name, phone: property.owner1phone, email: property.owner1email },
    { name: property.owner2name, phone: property.owner2phone, email: property.owner2email },
    { name: property.owner3name, phone: property.owner3phone, email: property.owner3email },
  ].filter((o): o is { name: string; phone: string | null; email: string | null } => Boolean(o.name))

  const acceptedBuyer = buyers.find((b) => b.offers.some((o) => o.isAccepted))
  const acceptedOffer = acceptedBuyer?.offers.find((o) => o.isAccepted) ?? null
  const hasAcceptedOffer = acceptedOffer !== null
  const buyersWithOffers = buyers.filter((b) => b.offers.length > 0)
  const displayedBuyers = acceptedBuyer ? [acceptedBuyer] : buyersWithOffers.length > 0 ? buyersWithOffers : buyers
  const buyerItems = displayedBuyers.map((b) => ({
    name: b.entityName,
    phone: b.phoneNumber,
    email: b.emailAddress,
  }))

  const staticFields: { label: string; value: string | null }[] = [
    {
      label: "Buyer address",
      value: displayedBuyers[0]?.memberResidenceAddress ?? "No address on file",
    },
    { label: "Type", value: property.propertyType },
    { label: "Stage", value: property.stageName },
    { label: "Appraised", value: formatAUD(property.appraisedAmount) },
    { label: "Contract price", value: acceptedOffer ? formatAUD(acceptedOffer.offer) : null },
    {
      label: "Commission",
      value: property.commissionRate
        ? acceptedOffer
          ? formatAUD(
              String(
                (parseFloat(acceptedOffer.offer) * parseFloat(property.commissionRate)) / 100,
              ),
            )
          : "No offer yet"
        : null,
    },
    { label: "Added", value: formatDate(property.createdAt) },
    {
      label: "Contract date",
      value: property.contractDate ? formatDate(property.contractDate) : null,
    },
  ]

  const dueDateRows = acceptedOffer
    ? [
        { label: "Cooling Off", days: acceptedOffer.coolingOffDays, omit: acceptedOffer.noConditions },
        {
          label: "Finance",
          days: acceptedOffer.financeDays,
          omit: acceptedOffer.noConditions || acceptedOffer.isCashOffer,
        },
        { label: "Building & Pest", days: acceptedOffer.buildingPestDays, omit: acceptedOffer.noConditions },
        { label: "Due Diligence", days: acceptedOffer.dueDiligenceDays, omit: acceptedOffer.noConditions },
        { label: "Sale of Property", days: acceptedOffer.saleOfPropertyDays, omit: false },
        { label: "Unconditional Contract", days: acceptedOffer.unconditionalContractDays, omit: false },
        { label: "Completion Date", days: acceptedOffer.subjectToSaleDays, omit: false },
        ...(acceptedOffer.customConditions ?? []).map((c) => ({ label: c.label, days: c.days, omit: false })),
      ].filter(({ days, omit }) => !omit && hasPositiveDayCount(days))
    : []

  return (
    <>
      <dl className="space-y-3">
        {sellers.length > 0 && (
          <div data-testid="panda-property-summary-row--sellers" className="flex gap-3 text-sm">
            <dt className="w-28 shrink-0 text-muted-foreground">Sellers</dt>
            <ContactList
              items={sellers}
              propertyListId={property.propertyListId}
              buyers={buyers}
              onMeetingAdded={onMeetingAdded}
            />
          </div>
        )}

        {buyerItems.length > 0 && (
          <div data-testid="panda-property-summary-row--buyers" className="flex gap-3 text-sm">
            <dt className="w-28 shrink-0 text-muted-foreground">Buyers</dt>
            <ContactList
              items={buyerItems}
              propertyListId={property.propertyListId}
              buyers={buyers}
              onMeetingAdded={onMeetingAdded}
            />
          </div>
        )}

        {staticFields.map(({ label, value }) =>
          value ? (
            <div
              key={label}
              data-testid={`panda-property-summary-row--${label.toLowerCase().replace(/\s+/g, "-")}`}
              className="flex gap-3 text-sm"
            >
              <dt className="w-28 shrink-0 text-muted-foreground">{label}</dt>
              <dd className="font-medium text-foreground">{value}</dd>
            </div>
          ) : null,
        )}
      </dl>

      {acceptedOffer && (
        <>
          <div className="my-4 border-t border-border" />
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Condition Due Dates
          </p>
          <dl className="space-y-2">
            {dueDateRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No day counts set on the accepted offer.</p>
            ) : !property.contractDate ? (
              <p className="text-sm text-muted-foreground">Set contract date to calculate due dates.</p>
            ) : (
              dueDateRows.map(({ label, days }) => (
                <div
                  key={label}
                  className="flex gap-3 text-sm"
                  data-testid={`panda-property-condition-due--${conditionDueRowTestIdSlug(label)}`}
                >
                  <dt className="w-36 shrink-0 text-muted-foreground">{label}</dt>
                  <dd className="font-medium text-foreground">{days != null ? addDays(property.contractDate!, days) : "—"}</dd>
                </div>
              ))
            )}
          </dl>
          <div className="my-4 border-t border-border" />
          <OfferConditionsPanel
            propertyListId={property.propertyListId}
            propertyType={property.propertyType}
            offer={acceptedOffer}
            contractDate={property.contractDate}
            onSaved={onConditionsSaved}
            suggestedAddress={acceptedBuyer?.memberPropertyToSellAddress ?? null}
          />
        </>
      )}

      <DealStepperSection
        stages={dealStages}
        currentStageId={property.dealStageStatusId}
        hasAcceptedOffer={hasAcceptedOffer}
        onStageClick={onDealStageChange}
      />
    </>
  )
}

