"use client"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

function formatDeadlineDate(baseDate: string | null, days: number): string | null {
  if (!baseDate) return null
  const d = new Date(baseDate)
  if (Number.isNaN(d.getTime())) return null
  d.setUTCDate(d.getUTCDate() + days)
  const weekday = WEEKDAYS[d.getUTCDay()]
  const dateNum = d.getUTCDate()
  const monthName = MONTHS[d.getUTCMonth()]
  return `${weekday} ${dateNum} ${monthName} ${d.getUTCFullYear()}`
}

function parseDays(value: string | null | undefined): number | null {
  if (!value) return null
  const match = value.match(/\d+/)
  if (!match) return null
  const n = parseInt(match[0], 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function formatBuildingPest(value: string | null | undefined): string | null {
  if (!value) return null
  if (value === "7_days") return "7 days"
  if (value === "14_days") return "14 days"
  if (value === "no") return "No"
  return value
}

function formatSaleStatus(value: string | null | undefined): string | null {
  if (!value) return null
  if (value === "to_be_listed") return "To Be Listed"
  if (value === "on_the_market") return "On the Market / Live Campaign"
  if (value === "under_contract_conditional") return "Under Contract (Conditional)"
  if (value === "under_contract_unconditional") return "Under Contract (Unconditional)"
  if (value === "under_contract") return "Under Contract"
  return value
}

function withDeadline(label: string, baseDate: string | null, days: number | null): string | null {
  if (!days) return label
  const date = formatDeadlineDate(baseDate, days)
  if (!date) return label
  return `${label} (${date})`
}

function dayLabel(days: number): string {
  return `${days} ${days === 1 ? "Day" : "Days"}`
}

export interface Submission {
  submittedAt: string | null
  contractDate?: string | null
  disclosureDate?: string | null
  buyer1Name: string | null
  buyer2Name: string | null
  buyerPhone: string | null
  buyerEmail: string | null
  buyerAddress: string | null
  offerAmount: string | null
  isCashBuyer: boolean | null
  buildingPestInspection: string | null
  suggestBuildingCompanies: boolean | null
  waiveCoolingOff: boolean | null
  coolingOffDays?: number | null
  totalDeposit: string | null
  initialPayment: string | null
  secondPayment: string | null
  settlementPeriod: string | null
  isSubjectToSale: boolean | null
  salePropertyAddress: string | null
  salePropertyStatus: string | null
  saleTimeframeDays: string | null
  saleSettlementDate: string | null
  saleIsUnconditional: boolean | null
  saleUnconditionalDate: string | null
  saleBuyerSettlementDate: string | null
  saleActiveConditions: string[] | null
  saleConditionsElaboration: string | null
  saleFreeAppraisal: boolean | null
  isSubjectToFinance: boolean | null
  financePreApproved: boolean | null
  financeDaysToApprove: string | null
  financeBank: string | null
  financeBankPhone: string | null
  financeBankContactName: string | null
  financeBankContactEmail: string | null
  solicitorName: string | null
  solicitorPhone: string | null
  solicitorAddress: string | null
  solicitorEmail: string | null
  sellerSolicitorName: string | null
  sellerSolicitorPhone: string | null
  sellerSolicitorAddress: string | null
  sellerSolicitorEmail: string | null
  extraComments: string | null
  buyersJson: Array<{ name: string; phone: string; email: string; address: string }> | null
  saleDaysBeforeListingLive: number | null
  saleDaysToGetSaleContract: number | null
  saleDaysToGetUnconditionalContract: number | null
  saleDaysToSettleExistingProperty: number | null
}

export function BuyerOfferSubmissionPanel({
  submission,
  propertyEntityId,
  contractDateOverride,
  disclosureDateOverride,
}: {
  submission: Submission
  propertyEntityId: number
  /** Live Contract date from the form; when provided, overrides the fetched snapshot so deadlines recompute before saving. Empty string = no date. */
  contractDateOverride?: string | null
  /** Live Disclosure date from the form; same override semantics as contractDateOverride. */
  disclosureDateOverride?: string | null
}) {
  // All milestone deadlines count from the contract date (falling back to submission date).
  // Exception: Manufactured Home cooling off counts from the disclosure date if set.
  // Live form overrides (when passed) take precedence over the fetched values.
  const contractDate = contractDateOverride !== undefined ? contractDateOverride || null : submission.contractDate ?? null
  const disclosureDate = disclosureDateOverride !== undefined ? disclosureDateOverride || null : submission.disclosureDate ?? null
  const baseDate = contractDate ?? submission.submittedAt
  const coolingOffBase = disclosureDate ?? baseDate

  const settlementDays = parseDays(submission.settlementPeriod)
  const settlementValue = settlementDays != null
    ? withDeadline(String(settlementDays), baseDate, settlementDays)
    : null

  const bpLabel = formatBuildingPest(submission.buildingPestInspection)
  const bpDays = parseDays(submission.buildingPestInspection)
  const bpValue = bpLabel === "No" ? "No" : bpLabel != null
    ? withDeadline(bpLabel, baseDate, bpDays)
    : null

  const financeDays = submission.financeDaysToApprove ? parseInt(submission.financeDaysToApprove, 10) || null : null
  const financeValue = financeDays != null
    ? withDeadline(String(financeDays), baseDate, financeDays)
    : null

  return (
    <div
      className="rounded border bg-muted/50 p-2 text-xs space-y-1"
      data-testid={`buyer-offer-form-submission-panel--${propertyEntityId}`}
    >
      {submission.buyersJson && submission.buyersJson.length > 0 ? (
        submission.buyersJson.map((b, i) => (
          <div key={i}>
            <p className="pt-1 font-medium">Buyer {i + 1}</p>
            <SubmissionRow label="Name" value={b.name} />
            <SubmissionRow label="Phone" value={b.phone} />
            <SubmissionRow label="Email" value={b.email} />
            <SubmissionRow label="Address" value={b.address} />
          </div>
        ))
      ) : (
        <>
          <SubmissionRow label="Buyer 1" value={submission.buyer1Name} />
          <SubmissionRow label="Buyer 2" value={submission.buyer2Name} />
          <SubmissionRow label="Phone" value={submission.buyerPhone} />
          <SubmissionRow label="Email" value={submission.buyerEmail} />
          <SubmissionRow label="Address" value={submission.buyerAddress} />
        </>
      )}

      <div data-testid="submission-conditions-start" className="mt-2" />

      <SubmissionRow label="Offer Amount" value={submission.offerAmount ? `$${submission.offerAmount}` : null} />
      <SubmissionRow label="Cash Buyer" value={submission.isCashBuyer === true ? "Yes" : submission.isCashBuyer === false ? "No" : null} />
      <SubmissionRow label="Building & Pest" value={bpValue} />
      {submission.buildingPestInspection && submission.buildingPestInspection !== "no" && submission.suggestBuildingCompanies !== null && (
        <div data-testid="suggest-building-companies-box" className="flex gap-2">
          <span className="w-32 shrink-0 text-muted-foreground">Recommend Inspectors:</span>
          <div className="flex space-x-4">
            <label className="inline-flex cursor-default items-center gap-1.5">
              <input
                type="radio"
                checked={submission.suggestBuildingCompanies === true}
                readOnly
                disabled
                className="h-3 w-3 accent-slate-900"
              />
              <span>Yes, please</span>
            </label>
            <label className="inline-flex cursor-default items-center gap-1.5">
              <input
                type="radio"
                checked={submission.suggestBuildingCompanies === false}
                readOnly
                disabled
                className="h-3 w-3 accent-slate-900"
              />
              <span>No, I have my own</span>
            </label>
          </div>
        </div>
      )}
      <SubmissionRow label="Waive Cooling Off" value={submission.waiveCoolingOff === true ? "Yes" : submission.waiveCoolingOff === false ? "No" : null} />
      {submission.coolingOffDays != null && (
        <div className="flex gap-2" data-testid="submission-cooling-off-resolved">
          <span className="w-32 shrink-0 font-medium">Cooling Off</span>
          <span>{withDeadline(dayLabel(submission.coolingOffDays), coolingOffBase, submission.coolingOffDays)}</span>
        </div>
      )}
      <SubmissionRow label="Total Deposit" value={submission.totalDeposit ? `$${submission.totalDeposit}` : null} />
      <SubmissionRow label="Initial Payment" value={submission.initialPayment ? `$${submission.initialPayment}` : null} />
      <SubmissionRow label="Secondary Payment / Balance" value={submission.secondPayment ? `$${submission.secondPayment}` : null} />
      <SubmissionRow label="Settlement" value={settlementValue} />
      {submission.isSubjectToSale && (
        <>
          <p className="pt-1 font-medium">Subject to Sale</p>
          <SubmissionRow label="Property" value={submission.salePropertyAddress} />
          <SubmissionRow label="Status" value={formatSaleStatus(submission.salePropertyStatus)} />
          <SubmissionRow label="Unconditional" value={submission.saleIsUnconditional === true ? "Yes" : submission.saleIsUnconditional === false ? "No" : null} />
          <SubmissionRow label="Unconditional Date" value={submission.saleUnconditionalDate} />
          <SubmissionRow label="Settlement Date" value={submission.saleBuyerSettlementDate ?? submission.saleSettlementDate} />
          {submission.saleDaysBeforeListingLive != null && (
            <SubmissionRow label="Days to List" value={withDeadline(String(submission.saleDaysBeforeListingLive), baseDate, submission.saleDaysBeforeListingLive)} />
          )}
          {submission.saleDaysToGetSaleContract != null && (
            <SubmissionRow label="Days to Contract" value={withDeadline(String(submission.saleDaysToGetSaleContract), baseDate, submission.saleDaysToGetSaleContract)} />
          )}
          {submission.saleDaysToGetUnconditionalContract != null && (
            <SubmissionRow label="Days to Unconditional" value={withDeadline(String(submission.saleDaysToGetUnconditionalContract), baseDate, submission.saleDaysToGetUnconditionalContract)} />
          )}
          {submission.saleDaysToSettleExistingProperty != null && (
            <SubmissionRow label="Days to Settle" value={withDeadline(String(submission.saleDaysToSettleExistingProperty), baseDate, submission.saleDaysToSettleExistingProperty)} />
          )}
          {submission.saleActiveConditions && submission.saleActiveConditions.length > 0 && (
            <SubmissionRow label="Conditions" value={submission.saleActiveConditions.join(", ")} />
          )}
          <SubmissionRow label="Other Conditions" value={submission.saleConditionsElaboration} />
          <SubmissionRow label="Free Appraisal" value={submission.saleFreeAppraisal === true ? "Yes" : submission.saleFreeAppraisal === false ? "No" : null} />
        </>
      )}
      {submission.isSubjectToFinance && (
        <>
          <p className="pt-1 font-medium">Finance</p>
          <SubmissionRow label="Pre-approved" value={submission.financePreApproved === true ? "Yes" : submission.financePreApproved === false ? "No" : null} />
          <SubmissionRow label="Days to Approve" value={financeValue} />
          <SubmissionRow label="Bank" value={submission.financeBank} />
          <SubmissionRow label="Bank Contact" value={submission.financeBankContactName} />
          <SubmissionRow label="Bank Email" value={submission.financeBankContactEmail} />
          <SubmissionRow label="Bank Phone" value={submission.financeBankPhone} />
        </>
      )}
      <div data-testid="panda-offer-submission-solicitor">
        <p className="pt-1 font-medium">Buyer&apos;s Solicitor</p>
        <SubmissionRow label="Name" value={submission.solicitorName} />
        <SubmissionRow label="Phone" value={submission.solicitorPhone} />
        <SubmissionRow label="Address" value={submission.solicitorAddress} />
        <SubmissionRow label="Email" value={submission.solicitorEmail} />
      </div>
      <div data-testid="panda-offer-submission-seller-solicitor">
        <p className="pt-1 font-medium">Seller&apos;s Solicitor</p>
        <SubmissionRow label="Name" value={submission.sellerSolicitorName} />
        <SubmissionRow label="Phone" value={submission.sellerSolicitorPhone} />
        <SubmissionRow label="Address" value={submission.sellerSolicitorAddress} />
        <SubmissionRow label="Email" value={submission.sellerSolicitorEmail} />
      </div>
      <SubmissionRow label="Extra Comments" value={submission.extraComments} />
    </div>
  )
}

function SubmissionRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex gap-2">
      <span className="w-32 shrink-0 text-muted-foreground">{label}:</span>
      <span>{value}</span>
    </div>
  )
}
