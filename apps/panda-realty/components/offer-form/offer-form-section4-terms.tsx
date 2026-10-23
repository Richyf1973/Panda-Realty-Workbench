"use client"

import { OfferFormFinanceSection } from "./offer-form-finance-section"
import { OfferFormSaleSection } from "./offer-form-sale-section"
import { OfferFormSettlementBlock } from "./offer-form-settlement-block"
import { OfferRadio, SectionHeading } from "./offer-form-shared"
import type { BuildingPestState, FinanceState, SaleState, SettlementState } from "./offer-form-types"

interface OfferFormSection4TermsProps {
  cashBuyer: "yes" | "no"
  setCashBuyer: (v: "yes" | "no") => void
  buildingPest: BuildingPestState
  waiveCoolingOff: "yes" | "no"
  setWaiveCoolingOff: (v: "yes" | "no") => void
  sale: SaleState
  finance: FinanceState
  settlement: SettlementState
  purchasePropertyAddress?: string | null
  viewMode?: boolean
}

export function OfferFormSection4Terms({
  cashBuyer, setCashBuyer,
  buildingPest,
  waiveCoolingOff, setWaiveCoolingOff,
  sale,
  finance,
  settlement,
  purchasePropertyAddress,
  viewMode = false,
}: OfferFormSection4TermsProps) {
  const {
    buildingPestRequired, setBuildingPestRequired,
    buildingPestDays, setBuildingPestDays,
    suggestBuildingCompanies, setSuggestBuildingCompanies,
  } = buildingPest

  const settlementBlock = <OfferFormSettlementBlock {...settlement} />

  return (
    <div>
      <SectionHeading number={4} title="Offer Contingencies & Terms" />
      <div className="space-y-6">
        {/* 1. Cooling Off */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Statutory cooling off period is 5 days for residential home sales. And 21 days for manufactured home sales. Do you wish to waive this statutory cooling off period?
          </label>
          <div className="flex space-x-4">
            <OfferRadio name="waiveCoolingOff" value="yes" checked={waiveCoolingOff === "yes"} onChange={() => setWaiveCoolingOff("yes")} disabled={viewMode} testId="offer-form-cooling-off-yes" labelTestId="offer-form-cooling-off-label-yes" className="text-sm text-gray-700">
              Yes, Waive Period
            </OfferRadio>
            <OfferRadio name="waiveCoolingOff" value="no" checked={waiveCoolingOff === "no"} onChange={() => setWaiveCoolingOff("no")} disabled={viewMode} testId="offer-form-cooling-off-no" labelTestId="offer-form-cooling-off-label-no" className="text-sm text-gray-700">
              No, Retain Statutory Period
            </OfferRadio>
          </div>
        </div>

        {/* 2. Cash Buyer */}
        <div data-testid="offer-form-cash-buyer-question">
          <label className="mb-2 block text-sm font-medium text-gray-700">Are you a Cash Buyer?</label>
          <div className="flex space-x-4">
            <OfferRadio name="cashBuyer" value="yes" checked={cashBuyer === "yes"} onChange={() => setCashBuyer("yes")} disabled={viewMode} testId="offer-form-cash-buyer-yes" labelTestId="offer-form-cash-buyer-label-yes" className="text-sm text-gray-700">
              Yes (Unconditional on Finance)
            </OfferRadio>
            <OfferRadio name="cashBuyer" value="no" checked={cashBuyer === "no"} onChange={() => setCashBuyer("no")} disabled={viewMode} testId="offer-form-cash-buyer-no" labelTestId="offer-form-cash-buyer-label-no" className="text-sm text-gray-700">
              No (Subject to Finance / Terms)
            </OfferRadio>
          </div>
        </div>

        {/* 3. Finance (cashBuyer=no only) */}
        {cashBuyer === "no" && (
          <div data-testid="offer-form-subject-to-finance-section">
            <OfferFormFinanceSection {...finance} viewMode={viewMode} />
          </div>
        )}

        {/* 4. Building & Pest */}
        <div data-testid="offer-form-building-pest-question">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Do you require a building and pest inspection?
          </label>
          <div className="flex space-x-4">
            <OfferRadio name="buildingPestRequired" value="yes" checked={buildingPestRequired} onChange={() => setBuildingPestRequired(true)} disabled={viewMode} testId="offer-form-building-pest-yes" className="text-sm text-gray-700">
              Yes
            </OfferRadio>
            <OfferRadio name="buildingPestRequired" value="no" checked={!buildingPestRequired} onChange={() => setBuildingPestRequired(false)} disabled={viewMode} testId="offer-form-building-pest-no" className="text-sm text-gray-700">
              No
            </OfferRadio>
          </div>
          {buildingPestRequired && (
            <div className="mt-3 space-y-4 rounded-xl border border-gray-200 bg-white p-4" data-testid="offer-form-building-pest-subpanel">
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-600">Required Inspection Timeline</label>
                <div className="flex space-x-6">
                  <OfferRadio name="buildingPestDays" value="7" checked={buildingPestDays === "7"} onChange={() => setBuildingPestDays("7")} disabled={viewMode} testId="offer-form-building-pest-7days" className="text-sm text-gray-700">
                    7 Calendar Days
                  </OfferRadio>
                  <OfferRadio name="buildingPestDays" value="14" checked={buildingPestDays === "14"} onChange={() => setBuildingPestDays("14")} disabled={viewMode} testId="offer-form-building-pest-14days" className="text-sm text-gray-700">
                    14 Calendar Days
                  </OfferRadio>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <label className="mb-2 block text-xs font-semibold text-gray-600">
                  Would you like My Panda Realty to recommend credentialed building inspection providers?
                </label>
                <div className="flex space-x-6">
                  <OfferRadio name="suggestBuildingCompanies" value="yes" checked={suggestBuildingCompanies === true} onChange={() => setSuggestBuildingCompanies(true)} disabled={viewMode} testId="offer-form-suggest-building-companies-yes" className="text-sm text-gray-700">
                    Yes, please
                  </OfferRadio>
                  <OfferRadio name="suggestBuildingCompanies" value="no" checked={suggestBuildingCompanies === false} onChange={() => setSuggestBuildingCompanies(false)} disabled={viewMode} testId="offer-form-suggest-building-companies-no" className="text-sm text-gray-700">
                    No, I have my own
                  </OfferRadio>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5. Sale (cashBuyer=no only) */}
        {cashBuyer === "no" && (
          <div data-testid="offer-form-subject-to-sale-section">
            <OfferFormSaleSection
              {...sale}
              settlementBlock={settlementBlock}
              purchasePropertyAddress={purchasePropertyAddress}
              viewMode={viewMode}
            />
          </div>
        )}

        {/* 6. Settlement — only shown at §4 bottom when NOT subject to sale */}
        {!sale.subjectToSale && settlementBlock}
      </div>
    </div>
  )
}
