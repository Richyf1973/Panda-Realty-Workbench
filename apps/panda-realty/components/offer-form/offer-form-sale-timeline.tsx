"use client"

import { FormField, inputClass } from "./offer-form-shared"

interface OfferFormSaleTimelineProps {
  saleStatus: string
  saleDaysBeforeListing: string
  setSaleDaysBeforeListing: (v: string) => void
  saleDaysToContract: string
  setSaleDaysToContract: (v: string) => void
  saleDaysToUnconditional: string
  setSaleDaysToUnconditional: (v: string) => void
  saleDaysToSettle: string
  setSaleDaysToSettle: (v: string) => void
}

export function OfferFormSaleTimeline({
  saleStatus,
  saleDaysBeforeListing,
  setSaleDaysBeforeListing,
  saleDaysToContract,
  setSaleDaysToContract,
  saleDaysToUnconditional,
  setSaleDaysToUnconditional,
  saleDaysToSettle,
  setSaleDaysToSettle,
}: OfferFormSaleTimelineProps) {
  return (
    <div
      className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2"
      data-testid="offer-form-sale-timeline-metrics"
    >
      {saleStatus === "to_be_listed" && (
        <FormField label="Days until listing goes live on portals">
          <input
            type="number"
            value={saleDaysBeforeListing}
            onChange={(e) => setSaleDaysBeforeListing(e.target.value)}
            className={inputClass()}
            placeholder="e.g., 7"
            data-testid="offer-form-sale-days-before-listing"
          />
        </FormField>
      )}
      <FormField label="Estimated days required to secure a sale contract">
        <input
          type="number"
          value={saleDaysToContract}
          onChange={(e) => setSaleDaysToContract(e.target.value)}
          className={inputClass()}
          placeholder="e.g., 30"
          data-testid="offer-form-sale-days-to-contract"
        />
      </FormField>
      <FormField label="Days from contract until Unconditional status">
        <input
          type="number"
          value={saleDaysToUnconditional}
          onChange={(e) => setSaleDaysToUnconditional(e.target.value)}
          className={inputClass()}
          placeholder="e.g., 45"
          data-testid="offer-form-sale-days-to-unconditional"
        />
      </FormField>
      <FormField label="Days from contract until target settlement">
        <input
          type="number"
          value={saleDaysToSettle}
          onChange={(e) => setSaleDaysToSettle(e.target.value)}
          className={inputClass()}
          placeholder="e.g., 60"
          data-testid="offer-form-sale-days-to-settle"
        />
      </FormField>
    </div>
  )
}
