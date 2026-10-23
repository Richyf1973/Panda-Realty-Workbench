"use client"

import Link from "next/link"
import { CalendarClock } from "lucide-react"

import { BuyerOfferCalendarSync } from "./buyer-offer-calendar-sync"
import { formatAUD, formatDateStr } from "./panel-shared"
import type { BuyerPropertyEntry } from "./buyer-types"

export function OverviewTab({
  property,
  onAddMeeting,
  onOfferCalendarSynced,
}: {
  property: BuyerPropertyEntry
  onAddMeeting?: () => void
  onOfferCalendarSynced?: () => void
}) {
  const price = formatAUD(property.salePrice) ?? formatAUD(property.appraisedAmount)
  const priceLabel = property.salePrice ? "Price" : property.appraisedAmount ? "Appraised" : null

  return (
    <div className="space-y-4">
      <Link
        href={`/admin/properties?openEdit=${property.propertyListId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Open property record"
        data-testid="buyer-overview-property-card"
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Property
        </p>
        <dl className="space-y-2">
          <div className="flex gap-3 text-sm">
            <dt className="w-24 shrink-0 text-muted-foreground">Address</dt>
            <dd className="font-medium text-foreground">
              {property.streetAddress}, {property.suburb}
            </dd>
          </div>
          {property.stageName && (
            <div className="flex gap-3 text-sm">
              <dt className="w-24 shrink-0 text-muted-foreground">Stage</dt>
              <dd>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {property.stageName}
                </span>
              </dd>
            </div>
          )}
          {price && priceLabel && (
            <div className="flex gap-3 text-sm">
              <dt className="w-24 shrink-0 text-muted-foreground">{priceLabel}</dt>
              <dd className="font-medium text-foreground">{price}</dd>
            </div>
          )}
        </dl>
      </Link>

      {onAddMeeting && (
        <button
          onClick={onAddMeeting}
          className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/30 hover:text-foreground"
          data-testid="buyer-overview-add-meeting-btn"
        >
          <CalendarClock className="size-4" />
          Add Meeting
        </button>
      )}

      {property.offers.length > 0 && (
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Latest Offer
          </p>
          {(() => {
            const latest = property.offers[0]!
            return (
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-medium text-foreground">
                    {formatAUD(latest.offer) ?? latest.offer}
                  </span>
                  <span className="text-muted-foreground">{formatDateStr(latest.dateOffered)}</span>
                  {latest.isAccepted && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      Accepted
                    </span>
                  )}
                </div>
                <BuyerOfferCalendarSync
                  buyerOfferId={latest.buyerOfferId}
                  onSynced={onOfferCalendarSynced ?? (() => {})}
                />
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
