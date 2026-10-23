"use client"

import type { ReactNode } from "react"

import { FormField, OfferRadio, inputClass } from "./offer-form-shared"
import { OfferFormSaleTimeline } from "./offer-form-sale-timeline"
import { OfferFormSaleUnderContract } from "./offer-form-sale-under-contract"

interface OfferFormSaleSectionProps {
  subjectToSale: boolean
  setSubjectToSale: (v: boolean) => void
  salePropertyAddress: string
  setSalePropertyAddress: (v: string) => void
  saleStatus: string
  setSaleStatus: (v: string) => void
  simultaneousSettlement: string
  setSimultaneousSettlement: (v: string) => void
  saleDaysBeforeListing: string
  setSaleDaysBeforeListing: (v: string) => void
  saleDaysToContract: string
  setSaleDaysToContract: (v: string) => void
  saleDaysToUnconditional: string
  setSaleDaysToUnconditional: (v: string) => void
  saleDaysToSettle: string
  setSaleDaysToSettle: (v: string) => void
  saleUnconditionalDate: string
  setSaleUnconditionalDate: (v: string) => void
  saleBuyerSettlementDate: string
  setSaleBuyerSettlementDate: (v: string) => void
  saleActiveConditions: string[]
  setSaleActiveConditions: (v: string[]) => void
  saleConditionsElaboration: string
  setSaleConditionsElaboration: (v: string) => void
  saleFreeAppraisal: boolean | null
  setSaleFreeAppraisal: (v: boolean | null) => void
  purchasePropertyAddress?: string | null
  settlementBlock?: ReactNode
  viewMode?: boolean
}

export function OfferFormSaleSection({
  subjectToSale,
  setSubjectToSale,
  salePropertyAddress,
  setSalePropertyAddress,
  saleStatus,
  setSaleStatus,
  simultaneousSettlement,
  setSimultaneousSettlement,
  saleDaysBeforeListing,
  setSaleDaysBeforeListing,
  saleDaysToContract,
  setSaleDaysToContract,
  saleDaysToUnconditional,
  setSaleDaysToUnconditional,
  saleDaysToSettle,
  setSaleDaysToSettle,
  saleUnconditionalDate,
  setSaleUnconditionalDate,
  saleBuyerSettlementDate,
  setSaleBuyerSettlementDate,
  saleActiveConditions,
  setSaleActiveConditions,
  saleConditionsElaboration,
  setSaleConditionsElaboration,
  saleFreeAppraisal,
  setSaleFreeAppraisal,
  purchasePropertyAddress,
  settlementBlock,
  viewMode = false,
}: OfferFormSaleSectionProps) {
  const showTimeline = saleStatus === "to_be_listed" || saleStatus === "on_the_market"
  const showUnderContract = saleStatus === "under_contract_conditional" || saleStatus === "under_contract_unconditional"

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-slate-50 p-4 transition-all duration-200">
      <fieldset>
        <legend className="mb-2 block text-sm font-medium text-gray-700">
          Will this offer be contingent upon the sale of another property?
        </legend>
        <div className="flex space-x-4">
          <OfferRadio name="subjectToSale" checked={subjectToSale} onChange={() => setSubjectToSale(true)} disabled={viewMode} testId="offer-form-subject-to-sale-yes" className="text-sm text-gray-700">
            Yes, Contingent on Existing Sale
          </OfferRadio>
          <OfferRadio name="subjectToSale" checked={!subjectToSale} onChange={() => setSubjectToSale(false)} disabled={viewMode} testId="offer-form-subject-to-sale-no" className="text-sm text-gray-700">
            No, Independent Offer
          </OfferRadio>
        </div>
      </fieldset>

      {subjectToSale && (
        <div className="space-y-4 border-t border-gray-200 pt-2" data-testid="offer-form-sale-details">
          <FormField label="Full Address of the Asset to be Sold">
            <input
              type="text"
              value={salePropertyAddress}
              onChange={(e) => setSalePropertyAddress(e.target.value)}
              disabled={viewMode}
              className={inputClass()}
              placeholder="Type your Queensland property to be sold..."
              data-testid="offer-form-sale-property-address"
            />
          </FormField>

          {/* Simultaneous settlement question */}
          <fieldset className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-inner space-y-3" data-testid="offer-form-simultaneous-settlement-panel">
            <legend className="block text-xs font-bold uppercase tracking-wider text-slate-700 leading-relaxed">
              Will the settlement of{" "}
              <span
                data-testid="offer-form-settlement-sold-address-span"
                className="text-emerald-600 font-bold underline"
              >
                {salePropertyAddress.trim() || "[Property to be Sold Address]"}
              </span>{" "}
              occur at the same time as the purchase of{" "}
              <span
                data-testid="offer-form-settlement-purchase-address-span"
                className="text-emerald-600 font-bold underline"
              >
                {(purchasePropertyAddress ?? "").trim() || "[Property Address]"}
              </span>?
            </legend>
            <div className="flex space-x-6">
              <OfferRadio
                name="simultaneousSettlement"
                value="yes"
                checked={simultaneousSettlement === "yes"}
                onChange={() => setSimultaneousSettlement("yes")}
                disabled={viewMode}
                testId="offer-form-simultaneous-settlement-yes"
                className="text-sm font-medium text-slate-700"
              >
                Yes
              </OfferRadio>
              <OfferRadio
                name="simultaneousSettlement"
                value="no"
                checked={simultaneousSettlement === "no"}
                onChange={() => setSimultaneousSettlement("no")}
                disabled={viewMode}
                testId="offer-form-simultaneous-settlement-no"
                className="text-sm font-medium text-slate-700"
              >
                No
              </OfferRadio>
            </div>

            {simultaneousSettlement === "yes" && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800" data-testid="offer-form-simultaneous-yes-result">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Result: Settlement date will be this date (Simultaneous Settlement).</span>
              </div>
            )}

            {simultaneousSettlement === "no" && settlementBlock && (
              <div className="border-t border-slate-100 pt-3 space-y-2" data-testid="offer-form-simultaneous-no-result">
                {settlementBlock}
              </div>
            )}
          </fieldset>

          <FormField label="Current Transaction Status">
            <select
              value={saleStatus}
              onChange={(e) => setSaleStatus(e.target.value)}
              disabled={viewMode}
              className={inputClass()}
              data-testid="offer-form-sale-status-dropdown"
            >
              <option value="">-- Select State --</option>
              <option value="to_be_listed">To be Listed</option>
              <option value="on_the_market">On the Market / Live Campaign</option>
              <option value="under_contract_conditional">Under Contract (Conditional)</option>
              <option value="under_contract_unconditional">Under Contract (Unconditional)</option>
            </select>
          </FormField>

          {showTimeline && (
            <OfferFormSaleTimeline
              saleStatus={saleStatus}
              saleDaysBeforeListing={saleDaysBeforeListing}
              setSaleDaysBeforeListing={setSaleDaysBeforeListing}
              saleDaysToContract={saleDaysToContract}
              setSaleDaysToContract={setSaleDaysToContract}
              saleDaysToUnconditional={saleDaysToUnconditional}
              setSaleDaysToUnconditional={setSaleDaysToUnconditional}
              saleDaysToSettle={saleDaysToSettle}
              setSaleDaysToSettle={setSaleDaysToSettle}
            />
          )}

          {showUnderContract && (
            <OfferFormSaleUnderContract
              saleStatus={saleStatus}
              saleUnconditionalDate={saleUnconditionalDate}
              setSaleUnconditionalDate={setSaleUnconditionalDate}
              saleBuyerSettlementDate={saleBuyerSettlementDate}
              setSaleBuyerSettlementDate={setSaleBuyerSettlementDate}
              saleActiveConditions={saleActiveConditions}
              setSaleActiveConditions={setSaleActiveConditions}
              saleConditionsElaboration={saleConditionsElaboration}
              setSaleConditionsElaboration={setSaleConditionsElaboration}
            />
          )}

          {saleStatus === "to_be_listed" && (
            <fieldset className="pt-2">
              <legend className="mb-2 block text-sm font-semibold text-slate-800">
                Would you like My Panda Realty to perform a complimentary modern Market Valuation on your current asset?
              </legend>
              <div className="flex space-x-4">
                <OfferRadio name="saleFreeAppraisal" checked={saleFreeAppraisal === true} onChange={() => setSaleFreeAppraisal(true)} disabled={viewMode} testId="offer-form-sale-free-appraisal-yes">
                  <span className="font-medium">Yes, compute appraisal</span>
                </OfferRadio>
                <OfferRadio name="saleFreeAppraisal" checked={saleFreeAppraisal === false} onChange={() => setSaleFreeAppraisal(false)} disabled={viewMode} testId="offer-form-sale-free-appraisal-no">
                  <span className="font-medium">No, thank you</span>
                </OfferRadio>
              </div>
            </fieldset>
          )}
        </div>
      )}
    </div>
  )
}
