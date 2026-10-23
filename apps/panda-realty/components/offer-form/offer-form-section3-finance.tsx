"use client"

import { FormField, SectionHeading, inputClass } from "./offer-form-shared"

interface OfferFormSection3FinanceProps {
  offerAmount: string
  setOfferAmount: (v: string) => void
  totalDeposit: string
  setTotalDeposit: (v: string) => void
  initialPayment: string
  setInitialPayment: (v: string) => void
  secondPayment: string
  setSecondPayment: (v: string) => void
  offerAmountError?: string
}

export function OfferFormSection3Finance({
  offerAmount, setOfferAmount,
  totalDeposit, setTotalDeposit,
  initialPayment, setInitialPayment,
  secondPayment, setSecondPayment,
  offerAmountError,
}: OfferFormSection3FinanceProps) {
  return (
    <div>
      <SectionHeading number={3} title="Financial Offer Structuring" />
      <div className="grid grid-cols-1 gap-6 rounded-xl border border-gray-200 bg-slate-50 p-4 md:grid-cols-2">
        <FormField label="Proposed Offer Amount ($)" error={offerAmountError}>
          <input
            type="number"
            value={offerAmount}
            onChange={(e) => setOfferAmount(e.target.value)}
            step={1000}
            className={inputClass(offerAmountError)}
            placeholder="0.00"
            data-testid="offer-form-offer-amount"
          />
        </FormField>
        <FormField label="Total Deposit Amount ($)">
          <input
            type="number"
            value={totalDeposit}
            onChange={(e) => setTotalDeposit(e.target.value)}
            step={1000}
            className={inputClass()}
            data-testid="offer-form-total-deposit"
          />
        </FormField>
        <FormField label={<>Initial Holding Payment ($) <span className="text-xs font-normal normal-case text-gray-500">(Payable upon offer acceptance by vendor)</span></>}>
          <input
            type="number"
            value={initialPayment}
            onChange={(e) => setInitialPayment(e.target.value)}
            step={1000}
            className={inputClass()}
            data-testid="offer-form-initial-payment"
          />
        </FormField>
        <FormField label={<>Secondary Payment / Balance ($) <span className="text-xs font-normal normal-case text-gray-500">(Payable once contract hits unconditional status)</span></>}>
          <input
            type="number"
            value={secondPayment}
            onChange={(e) => setSecondPayment(e.target.value)}
            step={1000}
            className={inputClass()}
            data-testid="offer-form-second-payment"
          />
        </FormField>
      </div>
    </div>
  )
}
