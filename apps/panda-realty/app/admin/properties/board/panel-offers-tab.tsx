"use client"

import { EmptyState, formatAUD, formatDateStr } from "./panel-shared"
import type { PropertyDetailOffer } from "./property-types"

export function OffersTab({ offers }: { offers: PropertyDetailOffer[] }) {
  if (offers.length === 0) return <EmptyState message="No offers recorded yet." />

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="pb-2 pr-4 font-medium text-muted-foreground">Buyer</th>
            <th className="pb-2 pr-4 font-medium text-muted-foreground">Amount</th>
            <th className="pb-2 pr-4 font-medium text-muted-foreground">Date</th>
            <th className="pb-2 font-medium text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {offers.map((offer) => (
            <tr key={offer.buyerOfferId}>
              <td className="py-2.5 pr-4 font-medium text-foreground">{offer.entityName}</td>
              <td className="py-2.5 pr-4 text-foreground">
                {formatAUD(offer.offer) ?? offer.offer}
              </td>
              <td className="py-2.5 pr-4 text-muted-foreground">{formatDateStr(offer.dateOffered)}</td>
              <td className="py-2.5">
                {offer.isAccepted ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    Accepted
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
