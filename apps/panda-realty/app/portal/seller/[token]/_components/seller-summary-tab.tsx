import { formatPortalDate } from "@/app/portal/[token]/_components/portal-format-date"

type Props = {
  contractDate: Date | null
  settlementDate: Date | null
}

export function SellerSummaryTab({ contractDate, settlementDate }: Props) {
  return (
    <div data-testid="portal-seller-summary-tab" className="rounded-xl bg-white p-6 shadow-sm sm:p-8 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div data-testid="portal-seller-contract-date" className="rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Contract Date
          </p>
          <p className="mt-1 text-base font-semibold text-gray-800">
            {formatPortalDate(contractDate)}
          </p>
        </div>
        <div data-testid="portal-seller-settlement-date" className="rounded-lg border border-gray-200 p-4">
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
