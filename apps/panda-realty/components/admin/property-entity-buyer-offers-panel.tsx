"use client"

import { Fragment, useCallback, useEffect, useState } from "react"
import { ChevronDown, ChevronUp, RefreshCw, Trash2 } from "lucide-react"

import { Button } from "@repo/ui/button"

import { patchBuyerOfferAccepted } from "@/lib/buyer-offer-accept"
import { withLoadingId } from "@/lib/with-loading-id"

import { hasAnyCondition } from "@/app/admin/properties/board/buyer-offers-tab"
import { OfferConditionsPanel } from "@/app/admin/properties/board/offer-conditions-panel"
import { BuyerOfferNativeView } from "@/components/admin/buyer-offer-native-view"
import { EmptyState, formatAUD, formatDateStr, LoadingSkeleton } from "@/app/admin/properties/board/panel-shared"
import type { BuyerPropertyEntry } from "@/app/admin/properties/board/buyer-types"
import { PropertyEntityBuyerOffersNewOfferForm } from "@/components/admin/property-entity-buyer-offers-new-offer-form"

type OfferRow = BuyerPropertyEntry["offers"][number]

type BuyerOffersApiResponse = {
  propertyListId: number
  contractDate: string | null
  propertyType: string | null
  offerFormToken: string | null
  offers: OfferRow[]
}


export function PropertyEntityBuyerOffersPanel({
  propertyEntityId,
}: {
  propertyEntityId: number
}) {
  const [offers, setOffers] = useState<OfferRow[]>([])
  const [contractDate, setContractDate] = useState<Date | null>(null)
  const [propertyListId, setPropertyListId] = useState<number>(0)
  const [propertyType, setPropertyType] = useState<string | null>(null)
  const [offerFormToken, setOfferFormToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [acceptingIds, setAcceptingIds] = useState<Set<number>>(new Set())
  const [acceptErrors, setAcceptErrors] = useState<Record<number, string>>({})
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set())
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    setAcceptErrors({})
    try {
      const res = await fetch(`/api/admin/property-entities/${propertyEntityId}/buyer-offers`)
      if (!res.ok) throw new Error("Failed to load offers")
      const data = await res.json() as BuyerOffersApiResponse
      setOffers(data.offers ?? [])
      setPropertyListId(data.propertyListId)
      setPropertyType(data.propertyType ?? null)
      setContractDate(data.contractDate ? new Date(data.contractDate) : null)
      setOfferFormToken(data.offerFormToken ?? null)
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Failed to load offers")
    }
    setLoading(false)
  }, [propertyEntityId])

  useEffect(() => { void load() }, [load])

  function toggleExpand(id: number) {
    setExpandedId((prev) => prev === id ? null : id)
  }

  async function handleAcceptOffer(buyerOfferId: number) {
    setAcceptErrors((prev) => { const next = { ...prev }; delete next[buyerOfferId]; return next })
    await withLoadingId(buyerOfferId, setAcceptingIds, async () => {
      const result = await patchBuyerOfferAccepted(buyerOfferId)
      if (result.ok) {
        await load()
      } else {
        setAcceptErrors((prev) => ({ ...prev, [buyerOfferId]: result.error }))
      }
    })
  }

  async function handleDelete(buyerOfferId: number) {
    setDeleteError(null)
    await withLoadingId(buyerOfferId, setDeletingIds, async () => {
      try {
        const res = await fetch(`/api/admin/buyer-offers/${buyerOfferId}`, { method: "DELETE" })
        if (res.ok) {
          await load()
        } else {
          const json = await res.json().catch(() => ({})) as { error?: string }
          setDeleteError(json.error ?? "Failed to delete offer")
        }
      } catch {
        setDeleteError("Failed to delete offer")
      }
    })
  }

  if (loading) return <div className="p-3"><LoadingSkeleton /></div>
  if (fetchError) return <p className="p-3 text-sm text-destructive">{fetchError}</p>

  return (
    <div className="p-3 space-y-3">
      {deleteError && (
        <p className="text-sm text-destructive" role="alert">{deleteError}</p>
      )}

      <PropertyEntityBuyerOffersNewOfferForm
        propertyEntityId={propertyEntityId}
        onAdded={load}
      />

      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="buyer-offers-panel-refresh-btn"
          onClick={() => void load()}
          className="h-auto p-1 text-muted-foreground"
          aria-label="Refresh offers"
        >
          <RefreshCw className="size-4" />
        </Button>
      </div>

      {offers.length === 0
        ? <EmptyState message="No offers recorded yet." />
        : (
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
                  const isExpanded = expandedId === offer.buyerOfferId
                  const hasConditions = hasAnyCondition(offer)
                  return (
                    <Fragment key={offer.buyerOfferId}>
                      <tr data-testid={`offers-row--${offer.buyerOfferId}`}>
                        <td className="py-2.5 pr-4 font-medium">
                          {formatAUD(offer.offer) ?? offer.offer}
                          {offer.settlementPeriod && (
                            <div className="mt-1 text-xs font-normal">
                              <span className="text-muted-foreground">Settlement:</span> {offer.settlementPeriod}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 pr-4 text-muted-foreground">
                          {formatDateStr(offer.dateOffered)}
                        </td>
                        <td className="py-2.5 pr-4">
                          {offer.isAccepted
                            ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Accepted</span>
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="py-2.5">
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
                                  type="button"
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
                              type="button"
                              variant="ghost"
                              size="sm"
                              data-testid={`buyer-offer-conditions-toggle--${offer.buyerOfferId}`}
                              onClick={() => toggleExpand(offer.buyerOfferId)}
                              className="h-auto px-2 py-0.5 text-xs text-muted-foreground"
                            >
                              {offerFormToken
                                ? isExpanded
                                  ? <><span>Hide Form</span> <ChevronUp className="size-3" /></>
                                  : <><span>View Form</span> <ChevronDown className="size-3" /></>
                                : isExpanded
                                  ? <><span>Hide</span> <ChevronUp className="size-3" /></>
                                  : hasConditions
                                    ? <><span>Conditions</span> <ChevronDown className="size-3" /></>
                                    : <><span>+ Conditions</span> <ChevronDown className="size-3" /></>}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              data-testid={`offers-tab-delete--${offer.buyerOfferId}`}
                              onClick={() => void handleDelete(offer.buyerOfferId)}
                              disabled={deletingIds.has(offer.buyerOfferId)}
                              className="h-auto px-1.5 py-0.5 text-destructive hover:text-destructive"
                              aria-label="Delete offer"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={4} className="pb-3 pt-0">
                            {offerFormToken
                              ? <BuyerOfferNativeView token={offerFormToken} offerId={offer.buyerOfferId} />
                              : (
                                <OfferConditionsPanel
                                  propertyListId={propertyListId}
                                  propertyType={propertyType}
                                  offer={offer}
                                  contractDate={contractDate}
                                  onSaved={() => void load()}
                                />
                              )}
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
