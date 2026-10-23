"use client"

import { Fragment, useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

import { Button } from "@repo/ui/button"

import { patchBuyerOfferAccepted } from "@/lib/buyer-offer-accept"

import { OfferConditionsPanel } from "./offer-conditions-panel"
import { EmptyState, formatAUD, formatDateStr } from "./panel-shared"
import { BuyerOffersNewOfferForm } from "./buyer-offers-new-offer-form"
import type { BuyerPropertyEntry } from "./buyer-types"

type OfferRow = BuyerPropertyEntry["offers"][number]

export function hasAnyCondition(offer: OfferRow): boolean {
  return (
    offer.isCashOffer ||
    offer.noConditions ||
    offer.coolingOffDays != null ||
    offer.financeDays != null ||
    offer.buildingPestDays != null ||
    offer.dueDiligenceDays != null ||
    offer.subjectToSaleDays != null ||
    offer.depositInitial != null ||
    offer.depositBalance != null ||
    offer.saleOfPropertyDays != null ||
    offer.unconditionalContractDays != null ||
    (offer.customConditions != null && offer.customConditions.length > 0) ||
    (offer.conditionNotes != null && offer.conditionNotes.trim() !== "")
  )
}

export function BuyerOffersTab({
  offers,
  propertyEntityId,
  propertyListId,
  propertyType,
  contractDate,
  offerFormToken,
  onConditionsUpdated,
  onOfferAdded,
}: {
  offers: BuyerPropertyEntry["offers"]
  propertyEntityId: number
  propertyListId: number
  propertyType: string | null
  contractDate: Date | null
  offerFormToken?: string
  onConditionsUpdated: () => void
  onOfferAdded: () => void
}) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [acceptingIds, setAcceptingIds] = useState<Set<number>>(new Set())
  const [acceptErrors, setAcceptErrors] = useState<Record<number, string>>({})

  function toggleExpand(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleAcceptOffer(buyerOfferId: number) {
    setAcceptingIds((prev) => new Set(prev).add(buyerOfferId))
    setAcceptErrors((prev) => { const next = { ...prev }; delete next[buyerOfferId]; return next })
    const result = await patchBuyerOfferAccepted(buyerOfferId)
    if (result.ok) {
      onOfferAdded()
    } else {
      setAcceptErrors((prev) => ({ ...prev, [buyerOfferId]: result.error }))
    }
    setAcceptingIds((prev) => { const next = new Set(prev); next.delete(buyerOfferId); return next })
  }

  return (
    <div>
      <BuyerOffersNewOfferForm propertyEntityId={propertyEntityId} onAdded={onOfferAdded} />

      {offers.length === 0 ? (
        <EmptyState message="No offers recorded yet." />
      ) : (
        <div className="overflow-x-auto">
          <table data-testid="offers-tab-table" className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 pr-4 font-medium text-muted-foreground">Amount</th>
                <th className="pb-2 pr-4 font-medium text-muted-foreground">Date</th>
                <th className="pb-2 pr-4 font-medium text-muted-foreground">Status</th>
                <th className="pb-2 font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {offers.map((offer) => {
                const isExpanded = expandedIds.has(offer.buyerOfferId)
                const hasConditions = hasAnyCondition(offer)
                return (
                  <Fragment key={offer.buyerOfferId}>
                    <tr data-testid={`offers-row--${offer.buyerOfferId}`}>
                      <td className="py-2.5 pr-4 font-medium text-foreground">
                        {formatAUD(offer.offer) ?? offer.offer}
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground">
                        {formatDateStr(offer.dateOffered)}
                      </td>
                      <td className="py-2.5 pr-4">
                        {offer.isAccepted ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            Accepted
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {offerFormToken && (
                            <a
                              href={`/offer-form/${offerFormToken}?offerId=${offer.buyerOfferId}&view=1`}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-testid={`offers-row-view-btn--${offer.buyerOfferId}`}
                              className="inline-flex h-auto items-center rounded-md px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
                            >
                              View ↗
                            </a>
                          )}
                          {!offer.isAccepted && (
                            <div className="flex flex-col items-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                data-testid={`offers-row-accept-btn--${offer.buyerOfferId}`}
                                onClick={() => void handleAcceptOffer(offer.buyerOfferId)}
                                disabled={acceptingIds.has(offer.buyerOfferId)}
                                className="h-auto px-2 py-0.5 text-xs text-muted-foreground"
                              >
                                {acceptingIds.has(offer.buyerOfferId) ? "Accepting…" : "Accept"}
                              </Button>
                              {acceptErrors[offer.buyerOfferId] && (
                                <p
                                  data-testid={`offers-row-accept-error--${offer.buyerOfferId}`}
                                  className="mt-0.5 text-xs text-red-600 dark:text-red-400"
                                >
                                  {acceptErrors[offer.buyerOfferId]}
                                </p>
                              )}
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            data-testid={`buyer-offer-conditions-toggle--${offer.buyerOfferId}`}
                            onClick={() => toggleExpand(offer.buyerOfferId)}
                            className="h-auto px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {isExpanded ? (
                              <>Hide <ChevronUp className="size-3" /></>
                            ) : hasConditions ? (
                              <>Conditions <ChevronDown className="size-3" /></>
                            ) : (
                              <>+ Conditions <ChevronDown className="size-3" /></>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={4} className="pb-3 pt-0">
                          <OfferConditionsPanel
                            propertyListId={propertyListId}
                            propertyType={propertyType}
                            offer={offer}
                            contractDate={contractDate}
                            onSaved={onConditionsUpdated}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
