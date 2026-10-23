"use client"

import { FormField, inputClass } from "./offer-form-shared"

interface OfferFormSaleUnderContractProps {
  saleStatus: string
  saleUnconditionalDate: string
  setSaleUnconditionalDate: (v: string) => void
  saleBuyerSettlementDate: string
  setSaleBuyerSettlementDate: (v: string) => void
  saleActiveConditions: string[]
  setSaleActiveConditions: (v: string[]) => void
  saleConditionsElaboration: string
  setSaleConditionsElaboration: (v: string) => void
}

function toggleCondition(conditions: string[], value: string): string[] {
  return conditions.includes(value)
    ? conditions.filter((c) => c !== value)
    : [...conditions, value]
}

const CONDITIONS = [
  { value: "finance", label: "Subject to Finance Approval", testId: "offer-form-sale-condition-finance" },
  { value: "building_pest", label: "Building & Pest Assessment", testId: "offer-form-sale-condition-building-pest" },
  { value: "sale_of_property", label: "Prior Interdependent Property Sale", testId: "offer-form-sale-condition-sale-of-property" },
  { value: "other", label: "Other Unique Conditions", testId: "offer-form-sale-condition-other" },
] as const

export function OfferFormSaleUnderContract({
  saleStatus,
  saleUnconditionalDate,
  setSaleUnconditionalDate,
  saleBuyerSettlementDate,
  setSaleBuyerSettlementDate,
  saleActiveConditions,
  setSaleActiveConditions,
  saleConditionsElaboration,
  setSaleConditionsElaboration,
}: OfferFormSaleUnderContractProps) {
  const isConditional = saleStatus === "under_contract_conditional"
  const isUnconditional = saleStatus === "under_contract_unconditional"
  const hasOtherCondition = saleActiveConditions.includes("other")

  return (
    <div
      className="space-y-4 rounded-lg border border-gray-200 bg-white p-4"
      data-testid="offer-form-sale-under-contract-panel"
    >
      {isConditional && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Target date for contract becoming unconditional">
              <input
                type="date"
                value={saleUnconditionalDate}
                onChange={(e) => setSaleUnconditionalDate(e.target.value)}
                className={inputClass()}
                data-testid="offer-form-sale-unconditional-date"
              />
            </FormField>
            <FormField label="Scheduled settlement calendar date">
              <input
                type="date"
                value={saleBuyerSettlementDate}
                onChange={(e) => setSaleBuyerSettlementDate(e.target.value)}
                className={inputClass()}
                data-testid="offer-form-sale-buyer-settlement-date"
              />
            </FormField>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Outstanding conditions still applying{" "}
              <span className="text-xs font-normal text-gray-500">(Select all that apply)</span>
            </label>
            <div className="grid grid-cols-1 gap-2 rounded-lg border border-gray-100 bg-slate-50 p-3 sm:grid-cols-2">
              {CONDITIONS.map(({ value, label, testId }) => (
                <label key={value} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={saleActiveConditions.includes(value)}
                    onChange={() => setSaleActiveConditions(toggleCondition(saleActiveConditions, value))}
                    className="rounded text-slate-900 focus:ring-slate-500"
                    data-testid={testId}
                  />
                  <span className="ml-2 text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
          {hasOtherCondition && (
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Elaborate details on specified conditions:
              </label>
              <textarea
                value={saleConditionsElaboration}
                onChange={(e) => setSaleConditionsElaboration(e.target.value)}
                rows={2}
                className={inputClass()}
                placeholder="Enumerate terms here..."
                data-testid="offer-form-sale-conditions-elaboration"
              />
            </div>
          )}
        </div>
      )}

      {isUnconditional && (
        <div className="max-w-sm">
          <FormField label="Scheduled settlement calendar date">
            <input
              type="date"
              value={saleBuyerSettlementDate}
              onChange={(e) => setSaleBuyerSettlementDate(e.target.value)}
              className={inputClass()}
              data-testid="offer-form-sale-buyer-settlement-date"
            />
          </FormField>
        </div>
      )}
    </div>
  )
}
