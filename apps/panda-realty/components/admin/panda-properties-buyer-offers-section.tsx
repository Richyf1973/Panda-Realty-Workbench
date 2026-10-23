"use client"

import { Fragment, useState } from "react"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { notifyAdminPropertyBuyerOffersRefetch } from "@repo/admin/admin-related-inline-draft-sync"
import { cn } from "@repo/ui/utils"
import { Skeleton } from "@repo/ui/skeleton"

import { BuyerOfferNativeView } from "./buyer-offer-native-view"
import type { BuyerOffer } from "./panda-properties-dialog-form-types"

export function formatOfferAmount(offer: string): string {
  return parseFloat(offer).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatSettlementBadge(value: string): string {
  const trimmed = value.trim()
  return /^\d+$/.test(trimmed) ? `Settlement: ${trimmed} Days` : `Settlement: ${trimmed}`
}

export function ReadOnlySalesField({
  label,
  value,
  "data-testid": testId,
}: {
  label: string
  value: string | null
  "data-testid"?: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div
        className="min-h-[38px] rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
        data-testid={testId}
      >
        {value ?? <span className="opacity-50">—</span>}
      </div>
    </div>
  )
}

const OFFER_ROW_GRID = "grid grid-cols-[1fr_6rem_11rem_1.5rem_auto] gap-x-4"

export function LatestBuyerOffersSection({
  offers,
  loading,
}: {
  offers: BuyerOffer[]
  loading: boolean
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  function handleToggle(offerId: number) {
    setExpandedId((prev) => (prev === offerId ? null : offerId))
  }

  return (
    <div
      className="px-4 pb-4"
      data-testid="panda-properties-form-section--buyer-offers"
    >
      <h4 className="mb-2 text-sm font-semibold">Latest Buyer Offers</h4>
      <div className="rounded-md border text-sm">
        <div className={`${OFFER_ROW_GRID} border-b px-3 py-2 text-xs font-medium text-muted-foreground`}>
          <span>Buyer Name</span>
          <span>Date Offered</span>
          <span className="text-right">Offer</span>
          <span className="text-center">✓</span>
          <span />
        </div>
        {loading ? (
          <div className="space-y-3 px-3 py-4" data-testid="buyer-offers-loading-skeleton">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        ) : offers.length === 0 ? (
          <div className="px-3 py-4 text-center text-muted-foreground">No results</div>
        ) : (
          offers.map((o) => {
            const isExpanded = expandedId === o.buyerOfferId
            return (
              <Fragment key={o.buyerOfferId}>
                <div
                  className={cn(
                    `${OFFER_ROW_GRID} items-center border-b px-3 py-2`,
                    !isExpanded && "last:border-0",
                    o.isAccepted && "bg-emerald-50 dark:bg-emerald-950/20",
                  )}
                  data-testid={`panda-properties-buyer-offer-row--${o.buyerOfferId}`}
                >
                  <span>{o.entityName}</span>
                  <span className="text-muted-foreground">{o.dateOffered ?? "—"}</span>
                  <div className="text-right">
                    <span className="font-mono tabular-nums">{formatOfferAmount(o.offer)}</span>
                    <div className="mt-1 flex flex-wrap gap-1 justify-end">
                      {o.isSubjectToFinance && !o.isCashOffer && !o.noConditions && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Finance</span>
                      )}
                      {o.isSubjectToSale && !o.noConditions && (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">Subject to Sale</span>
                      )}
                      {o.waiveCoolingOff && !o.noConditions && (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">Waive Cooling Off</span>
                      )}
                      {o.settlementPeriod && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{formatSettlementBadge(o.settlementPeriod)}</span>
                      )}
                    </div>
                  </div>
                  <span className="flex justify-center">
                    {o.isAccepted ? (
                      <Check
                        className="h-4 w-4 text-emerald-600"
                        data-testid={`panda-properties-buyer-offer-accepted--${o.buyerOfferId}`}
                      />
                    ) : null}
                  </span>
                  <div className="flex items-center gap-1">
                    {o.offerFormToken && (
                      <a
                        href={`/offer-form/${o.offerFormToken}?offerId=${o.buyerOfferId}&view=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid={`buyer-offer-section-view-btn--${o.buyerOfferId}`}
                        aria-label={`View offer for ${o.entityName}`}
                        className="inline-flex h-auto items-center rounded-md px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
                      >
                        View ↗
                      </a>
                    )}
                    <button
                      type="button"
                      data-testid={`buyer-offer-section-view-form-btn--${o.buyerOfferId}`}
                      aria-label={`${isExpanded ? "Hide" : "View"} form for ${o.entityName}`}
                      onClick={() => handleToggle(o.buyerOfferId)}
                      className="inline-flex h-auto items-center gap-0.5 rounded-md px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
                    >
                      {isExpanded ? (
                        <><span>Hide Form</span><ChevronUp className="size-3" /></>
                      ) : (
                        <><span>View Form</span><ChevronDown className="size-3" /></>
                      )}
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div
                    className="border-b px-3 pb-3 pt-0 last:border-0"
                    data-testid={`buyer-offer-submission-inline--${o.buyerOfferId}`}
                  >
                    <BuyerOfferNativeView
                      token={o.offerFormToken}
                      offerId={o.buyerOfferId}
                      onSaved={notifyAdminPropertyBuyerOffersRefetch}
                    />
                  </div>
                )}
              </Fragment>
            )
          })
        )}
      </div>
    </div>
  )
}
