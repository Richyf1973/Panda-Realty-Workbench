import { AddToHomeButton } from "@/app/portal/_components/add-to-home-button"

import { formatPortalDate } from "./portal-format-date"

type Props = {
  streetAddress: string
  suburb: string
  state: string
  postcode: string
  salePrice: string | null
  contractDate: Date | null
  settlementDate: Date | null
}

export function PortalPropertySummary({
  streetAddress,
  suburb,
  state,
  postcode,
  salePrice,
  contractDate,
  settlementDate,
}: Props) {
  return (
    <div data-testid="portal-property-summary" className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div data-testid="portal-property-address">
          <p className="text-xl font-semibold text-gray-900">{streetAddress}</p>
          <p className="text-base text-gray-500">
            {suburb} {state} {postcode}
          </p>
        </div>
        <AddToHomeButton triggerTestId="portal-buyer-add-to-home-button" />
      </div>

      {salePrice ? (
        <p data-testid="portal-buyer-sale-price" className="mb-4 text-base font-semibold text-gray-800">
          Sale Price: {salePrice}
        </p>
      ) : (
        <p data-testid="portal-buyer-sale-price-pending" className="mb-4 text-sm text-gray-400">
          Sale price not yet confirmed
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div data-testid="portal-contract-date" className="rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Contract Date
          </p>
          <p className="mt-1 text-base font-semibold text-gray-800">{formatPortalDate(contractDate)}</p>
        </div>
        <div
          data-testid="portal-settlement-date"
          className="rounded-lg border border-gray-200 p-4"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Settlement Date
          </p>
          <p className="mt-1 text-base font-semibold text-gray-800">
            {formatPortalDate(settlementDate)}
          </p>
        </div>
      </div>
    </div>
  )
}
