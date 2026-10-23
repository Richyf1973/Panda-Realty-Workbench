"use client"

import { Mail, Phone } from "lucide-react"

import { cn } from "@repo/ui/utils"

import { EmptyState, formatAUD, formatDateStr } from "./panel-shared"
import { ContactChip } from "./panel-contact-chip"
import type { PropertyDetailBuyer } from "./property-types"

export function BuyersTab({ buyers }: { buyers: PropertyDetailBuyer[] }) {
  if (buyers.length === 0) return <EmptyState message="No buyers linked yet." />

  const sorted = [...buyers].sort((a, b) => {
    const tier = (buyer: PropertyDetailBuyer) =>
      buyer.offers.some((o) => o.isAccepted) ? 0 : buyer.offers.length > 0 ? 1 : 2
    const ta = tier(a)
    const tb = tier(b)
    if (ta !== tb) return ta - tb
    if (ta === 1) {
      const maxOffer = (buyer: PropertyDetailBuyer) =>
        Math.max(...buyer.offers.map((o) => parseFloat(o.offer)))
      return maxOffer(b) - maxOffer(a)
    }
    return 0
  })

  return (
    <div className="space-y-3">
      {sorted.map((buyer) => {
        const hasAccepted = buyer.offers.some((o) => o.isAccepted)
        const hasOffers = buyer.offers.length > 0
        return (
          <div
            key={buyer.propertyEntityId}
            className={cn(
              "rounded-lg border px-4 py-3",
              hasAccepted
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20"
                : hasOffers
                  ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
                  : "border-border bg-card",
            )}
          >
            <p className="font-medium text-foreground">{buyer.entityName}</p>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
              {buyer.phoneNumber && (
                <ContactChip icon={<Phone className="size-3" />} value={buyer.phoneNumber} />
              )}
              {buyer.emailAddress && (
                <ContactChip icon={<Mail className="size-3" />} value={buyer.emailAddress} />
              )}
            </div>
            {buyer.offers.length > 0 && (
              <div className="mt-2.5 border-t border-border/60 pt-2.5">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Offers</p>
                <div className="space-y-1">
                  {[...buyer.offers]
                    .sort((a, b) => parseFloat(b.offer) - parseFloat(a.offer))
                    .map((offer) => (
                      <div key={offer.buyerOfferId} className="flex items-center gap-2 text-xs">
                        <span className="font-medium text-foreground">
                          {formatAUD(offer.offer) ?? offer.offer}
                        </span>
                        <span className="text-muted-foreground">{formatDateStr(offer.dateOffered)}</span>
                        {offer.isAccepted && (
                          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            Accepted
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
