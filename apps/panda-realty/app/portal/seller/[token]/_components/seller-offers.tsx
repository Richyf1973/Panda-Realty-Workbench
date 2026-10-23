export type SellerOffer = {
  buyerOfferId: number
  offer: string
  isAccepted: boolean
  dateOffered: string | null
  isCashOffer: boolean
  noConditions: boolean
  entityName: string | null
}

function formatCurrency(value: string): string {
  const num = Number(value)
  if (!Number.isFinite(num)) return value
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

function formatOfferDate(dateStr: string | null): string {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
}

function conditionsLabel(offer: SellerOffer): string {
  if (offer.noConditions) return "Unconditional"
  if (offer.isCashOffer) return "Cash"
  return "Finance"
}

export function SellerOffers({ offers }: { offers: SellerOffer[] }) {
  if (offers.length === 0) {
    return (
      <div data-testid="portal-seller-offers" className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
        <p className="mb-4 text-xs font-medium uppercase tracking-wider text-gray-400">
          Offers Received
        </p>
        <p data-testid="portal-seller-offers-empty" className="text-sm text-gray-500">
          No offers received yet.
        </p>
      </div>
    )
  }

  return (
    <div data-testid="portal-seller-offers" className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
      <p className="mb-4 text-xs font-medium uppercase tracking-wider text-gray-400">
        Offers Received
      </p>
      <ul className="space-y-3">
        {offers.map((offer) => (
          <li
            key={offer.buyerOfferId}
            data-testid="portal-seller-offer-row"
            className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">
                {formatCurrency(offer.offer)}
              </p>
              <p className="mt-0.5 text-sm text-gray-500">
                {offer.entityName ?? "Unknown buyer"}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                {formatOfferDate(offer.dateOffered)}
                {" · "}
                {conditionsLabel(offer)}
              </p>
            </div>
            {offer.isAccepted && (
              <span
                data-testid="portal-seller-offer-accepted"
                className="shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700"
              >
                Accepted
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
