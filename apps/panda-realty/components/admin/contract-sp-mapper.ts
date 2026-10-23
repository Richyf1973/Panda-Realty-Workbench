import type { ContractSpApiData } from "./prefill-types"
import { formatAuPrice } from "@/lib/format-au-price"
import { formatCoolingOffLine } from "@/lib/cooling-off-days"

const ELECTRONIC_TRANSMISSION_CLAUSE =
  "ELECTRONIC TRANSMISSION: The parties consent to this contract being signed, executed, and communicated " +
  "electronically in accordance with the Electronic Transactions (Queensland) Act 2001."

export function mapContractSpData(
  data: ContractSpApiData,
  initialValues: Record<string, string> | undefined,
): Record<string, string> {
  const seller1 = data.sellers[0]
  const seller2 = data.sellers[1]
  const buyer1 = data.buyers[0]
  const buyer2 = data.buyers[1]

  // Finance conditional logic per PDF spec:
  // cash buyer OR explicitly not subject to finance → leave finance fields blank
  // subject to finance → auto-populate with offer data
  const subjectToFinance = data.isSubjectToFinance === true && data.isCashOffer !== true
  const financeAmountAuto = subjectToFinance ? "Sufficient to complete the transaction" : ""
  const financierAuto = subjectToFinance ? (data.financeBank?.trim() || "Buyer's Choice") : ""
  const financeDateAuto = subjectToFinance && data.financeDays != null
    ? `${data.financeDays} Days from Contract Date`
    : ""
  // buildingPestDays === 0 means "no inspection" — only produce a string for > 0
  const inspectionDateAuto = data.buildingPestDays != null && data.buildingPestDays > 0
    ? `${data.buildingPestDays} Days from Contract Date`
    : ""

  // Settlement: prefer actual date; fall back to "N Days from Contract Date" if only period recorded
  const settlementDateAuto = data.settlementDate
    || (data.settlementPeriod ? `${data.settlementPeriod} Days from Contract Date` : "")

  // Special conditions auto-compilation per PDF spec.
  // Template value takes priority — only compile when no template exists.
  const specialConditionsClauses: string[] = [ELECTRONIC_TRANSMISSION_CLAUSE]
  if (data.coolingOffDays != null) {
    specialConditionsClauses.push(formatCoolingOffLine(data.coolingOffDays))
  }
  if (data.conditionNotes?.trim()) {
    specialConditionsClauses.push(`FURTHER TERMS: ${data.conditionNotes.trim()}`)
  }
  if (data.isSubjectToSale) {
    const addr = data.subjectToSaleAddress?.trim() || "[property address]"
    specialConditionsClauses.push(
      `SUBJECT TO SALE: This contract is conditional upon the concurrent contract execution and successful settlement of the Buyer's current property located at ${addr} within a period matching the specified milestone targets.`,
    )
  }
  const specialConditionsAuto = specialConditionsClauses
    .map((clause, i) => `${i + 1}. ${clause}`)
    .join("\n\n")

  return {
    ...(initialValues ?? {}),
    seller1Name: seller1?.entityName ?? "",
    seller1Address: seller1?.address ?? "",
    seller1Suburb: seller1?.suburb ?? "",
    seller1State: seller1?.state ?? "",
    seller1Postcode: seller1?.postcode ?? "",
    seller1Phone: seller1?.phoneNumber ?? "",
    seller1Mobile: seller1?.mobile ?? seller1?.phoneNumber ?? "",
    seller1Email: seller1?.emailAddress ?? "",
    seller1Abn: seller1?.abn ?? "",
    seller2Name: seller2?.entityName ?? "",
    seller2Address: seller2?.address ?? "",
    seller2Suburb: seller2?.suburb ?? "",
    seller2State: seller2?.state ?? "",
    seller2Postcode: seller2?.postcode ?? "",
    seller2Phone: seller2?.phoneNumber ?? "",
    seller2Mobile: seller2?.mobile ?? seller2?.phoneNumber ?? "",
    seller2Email: seller2?.emailAddress ?? "",
    seller2Abn: seller2?.abn ?? "",
    buyer1Name: buyer1?.entityName ?? "",
    buyer1Address: buyer1?.address ?? "",
    buyer1Suburb: buyer1?.suburb || data.propertySuburb || "",
    buyer1State: buyer1?.state || data.propertyState || "",
    buyer1Postcode: buyer1?.postcode || data.propertyPostcode || "",
    buyer1Phone: buyer1?.phoneNumber ?? "",
    buyer1Mobile: buyer1?.mobile ?? buyer1?.phoneNumber ?? "",
    buyer1Email: buyer1?.emailAddress ?? "",
    buyer1Abn: buyer1?.abn ?? "",
    buyer2Name: buyer2?.entityName ?? "",
    buyer2Address: buyer2?.address ?? "",
    buyer2Suburb: buyer2?.suburb || data.propertySuburb || "",
    buyer2State: buyer2?.state || data.propertyState || "",
    buyer2Postcode: buyer2?.postcode || data.propertyPostcode || "",
    buyer2Phone: buyer2?.phoneNumber ?? "",
    buyer2Mobile: buyer2?.mobile ?? buyer2?.phoneNumber ?? "",
    buyer2Email: buyer2?.emailAddress ?? "",
    buyer2Abn: buyer2?.abn ?? "",
    sellerSolicitorName: data.sellerSolicitor?.entityName ?? "",
    sellerSolicitorRef: data.sellerSolicitor?.ref ?? "",
    sellerSolicitorAddress: data.sellerSolicitor?.address ?? "",
    sellerSolicitorSuburb: data.sellerSolicitor?.suburb ?? "",
    sellerSolicitorState: data.sellerSolicitor?.state ?? "",
    sellerSolicitorPostcode: data.sellerSolicitor?.postcode ?? "",
    sellerSolicitorPhone: data.sellerSolicitor?.phoneNumber ?? "",
    sellerSolicitorMobile: data.sellerSolicitor?.phoneNumber ?? "", // no separate mobile column on solicitor contacts — reuse phoneNumber
    sellerSolicitorEmail: data.sellerSolicitor?.emailAddress ?? "",
    // Buyer solicitor falls back to "To Be Confirmed" when not yet known
    buyerSolicitorName: initialValues?.buyerSolicitorName ?? (data.buyerSolicitor?.entityName || "To Be Confirmed"),
    buyerSolicitorRef: data.buyerSolicitor?.ref ?? "",
    buyerSolicitorAddress: data.buyerSolicitor?.address ?? "",
    buyerSolicitorSuburb: data.buyerSolicitor?.suburb ?? "",
    buyerSolicitorState: data.buyerSolicitor?.state ?? "",
    buyerSolicitorPostcode: data.buyerSolicitor?.postcode ?? "",
    buyerSolicitorPhone: data.buyerSolicitor?.phoneNumber ?? "",
    buyerSolicitorMobile: data.buyerSolicitor?.phoneNumber ?? "", // no separate mobile column on solicitor contacts — reuse phoneNumber
    buyerSolicitorEmail: data.buyerSolicitor?.emailAddress ?? "",
    address: data.propertyStreetAddress ?? "",
    suburb: data.propertySuburb ?? "",
    state: data.propertyState ?? "",
    postcode: data.propertyPostcode ?? "",
    lot: data.propertyLot ?? "",
    plan: data.propertyPlan ?? "",
    titleReference: data.propertyTitleReference ?? "",
    // Static defaults per PDF spec (template overrides via initialValues spread above)
    soldAsOption: initialValues?.soldAsOption ?? "freehold",
    landUseOption: initialValues?.landUseOption ?? "builtOn",
    depositHolder: initialValues?.depositHolder ?? "My Panda Realty Trust Account",
    // Price: formatted as "$xxx,xxx.xx" per PDF spec; template value takes priority
    purchasePrice: initialValues?.purchasePrice ?? (data.salePrice ? `$${formatAuPrice(data.salePrice)}` : ""),
    depositInitial: initialValues?.depositInitial ?? (data.depositInitial ? `$${formatAuPrice(data.depositInitial)}` : ""),
    depositBalance: initialValues?.depositBalance ?? (data.depositBalance ? `$${formatAuPrice(data.depositBalance)}` : ""),
    // Settlement: actual date preferred; fall back to period-based string
    settlementDate: initialValues?.settlementDate ?? settlementDateAuto,
    // Finance fields: template wins (preserves intentional blanks); otherwise auto-computed
    financeAmount: initialValues?.financeAmount ?? financeAmountAuto,
    financier: initialValues?.financier ?? financierAuto,
    financeDate: initialValues?.financeDate ?? financeDateAuto,
    inspectionDate: initialValues?.inspectionDate ?? inspectionDateAuto,
    // Special conditions: template wins; otherwise auto-compiled clauses
    specialConditions: initialValues?.specialConditions ?? specialConditionsAuto,
    // Resolved cooling-off days, surfaced so the page-6 caption matches the special condition.
    coolingOffDays: initialValues?.coolingOffDays ?? (data.coolingOffDays != null ? String(data.coolingOffDays) : ""),
  }
}
