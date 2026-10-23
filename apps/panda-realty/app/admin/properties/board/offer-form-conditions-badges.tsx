"use client"

type FormConditionsOffer = {
  waiveCoolingOff: boolean | null
  isSubjectToFinance: boolean | null
  financePreApproved: boolean | null
  financeBank: string | null
  financeBankContactName: string | null
  financeBankContactPhone: string | null
  financeBankContactEmail: string | null
  isSubjectToSale: boolean | null
  saleDaysBeforeListingLive: number | null
  saleIsUnconditional: boolean | null
  saleUnconditionalDate: string | null
  suggestBuildingCompanies: boolean | null
  settlementPeriod: string | null
}

export function OfferFormConditionsBadges({ offer }: { offer: FormConditionsOffer }) {
  return (
    <div className="space-y-2 border-t border-border pt-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Form Conditions</p>

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
        {/* Only show when explicitly waived — no need to surface the "not waived" state */}
        {offer.waiveCoolingOff === true && (
          <span className="text-orange-600 font-medium">Cooling Off Waived</span>
        )}
        {offer.isSubjectToFinance != null && (
          <span className={offer.isSubjectToFinance ? "text-blue-600 font-medium" : "text-muted-foreground"}>
            {offer.isSubjectToFinance ? "Subject to Finance" : "No Finance"}
            {offer.isSubjectToFinance && offer.financePreApproved != null && ` (${offer.financePreApproved ? "Pre-approved" : "Not pre-approved"})`}
          </span>
        )}
        {offer.isSubjectToFinance && offer.financeBank && (
          <span className="text-muted-foreground">Bank: {offer.financeBank}</span>
        )}
        {offer.isSubjectToSale != null && (
          <span className={offer.isSubjectToSale ? "text-purple-600 font-medium" : "text-muted-foreground"}>
            {offer.isSubjectToSale ? "Subject to Sale" : "Not Subject to Sale"}
          </span>
        )}
        {offer.suggestBuildingCompanies != null && (
          <span className="text-muted-foreground">
            Building cos: {offer.suggestBuildingCompanies ? "Yes" : "No"}
          </span>
        )}
        {offer.settlementPeriod && (
          <span className="text-muted-foreground">Settlement: {offer.settlementPeriod}</span>
        )}
      </div>

      {offer.isSubjectToSale && offer.saleDaysBeforeListingLive != null && (
        <p className="text-xs text-muted-foreground">Days before listing: {offer.saleDaysBeforeListingLive}</p>
      )}
      {offer.isSubjectToSale && offer.saleIsUnconditional != null && (
        <p className="text-xs text-muted-foreground">
          Sale unconditional: {offer.saleIsUnconditional ? `Yes (${offer.saleUnconditionalDate ?? "no date"})` : "No"}
        </p>
      )}
      {offer.isSubjectToFinance && (offer.financeBankContactName || offer.financeBankContactPhone || offer.financeBankContactEmail) && (
        <p className="text-xs text-muted-foreground">
          Bank contact: {[offer.financeBankContactName, offer.financeBankContactPhone, offer.financeBankContactEmail].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
  )
}
