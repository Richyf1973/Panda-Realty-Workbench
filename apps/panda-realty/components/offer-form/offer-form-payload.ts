import type { BuyerCard, SignatureEntry } from "./offer-form-types"

export interface OfferFormPayloadParams {
  buyers: BuyerCard[]
  offerAmount: string
  totalDeposit: string
  initialPayment: string
  secondPayment: string
  cashBuyer: "yes" | "no"
  buildingPestRequired: boolean
  buildingPestDays: "7" | "14"
  suggestBuildingCompanies: boolean | null
  waiveCoolingOff: "yes" | "no"
  settlementPeriod: string
  settlementDate: string
  subjectToSale: boolean
  salePropertyAddress: string
  saleStatus: string
  saleDaysBeforeListing: string
  saleDaysToContract: string
  saleDaysToUnconditional: string
  saleDaysToSettle: string
  saleUnconditionalDate: string
  saleBuyerSettlementDate: string
  saleActiveConditions: string[]
  saleConditionsElaboration: string
  saleFreeAppraisal: boolean | null
  subjectToFinance: boolean
  financePreApproved: boolean | null
  financeApprovalDays: string
  financeBank: string
  financeBankContactName: string
  financeBankContactPhone: string
  financeBankContactEmail: string
  solicitorName: string
  solicitorPhone: string
  solicitorAddress: string
  solicitorEmail: string
  extraComments: string
  signatures: SignatureEntry[]
  multiOfferCheckHighest: boolean
  multiOfferCheckDiscretion: boolean
  multiOfferCheckConfidential: boolean
}

export function buildOfferPayload(p: OfferFormPayloadParams) {
  const saleIsUnconditional =
    p.saleStatus === "under_contract_unconditional" ? true
    : p.saleStatus === "under_contract_conditional" ? false
    : undefined

  return {
    buyers: p.buyers,
    buyer1Name: p.buyers[0]?.name.trim() ?? "",
    buyer2Name: p.buyers[1]?.name.trim() || undefined,
    offerAmount: p.offerAmount.trim(),
    totalDeposit: p.totalDeposit.trim() || undefined,
    initialPayment: p.initialPayment.trim() || undefined,
    secondPayment: p.secondPayment.trim() || undefined,
    cashBuyer: p.cashBuyer === "yes" ? "Yes" : "No",
    buildingPestInspection: p.buildingPestRequired ? (p.buildingPestDays === "7" ? "7_days" : "14_days") : "no",
    suggestBuildingCompanies: p.suggestBuildingCompanies ?? undefined,
    waiveCoolingOff: p.waiveCoolingOff === "yes",
    settlementPeriod: p.settlementPeriod.trim() || undefined,
    settlementDate: p.settlementDate.trim() || undefined,
    subjectToSale: p.subjectToSale,
    salePropertyAddress: p.salePropertyAddress.trim() || undefined,
    saleStatus: p.saleStatus || undefined,
    saleDaysBeforeListing: p.saleDaysBeforeListing || undefined,
    saleDaysToContract: p.saleDaysToContract || undefined,
    saleDaysToUnconditional: p.saleDaysToUnconditional || undefined,
    saleDaysToSettle: p.saleDaysToSettle || undefined,
    saleIsUnconditional,
    saleUnconditionalDate: p.saleUnconditionalDate || undefined,
    saleBuyerSettlementDate: p.saleBuyerSettlementDate || undefined,
    saleActiveConditions: p.saleActiveConditions.length > 0 ? p.saleActiveConditions : undefined,
    saleConditionsElaboration: p.saleConditionsElaboration.trim() || undefined,
    saleFreeAppraisal: p.saleFreeAppraisal ?? undefined,
    subjectToFinance: p.subjectToFinance,
    financePreApproved: p.financePreApproved ?? undefined,
    financeApprovalDays: p.subjectToFinance ? p.financeApprovalDays : undefined,
    financeBank: p.financeBank.trim() || undefined,
    financeBankContactName: p.financeBankContactName.trim() || undefined,
    financeBankContactPhone: p.financeBankContactPhone.trim() || undefined,
    financeBankContactEmail: p.financeBankContactEmail.trim() || undefined,
    solicitorName: p.solicitorName.trim() || undefined,
    solicitorPhone: p.solicitorPhone.trim() || undefined,
    solicitorAddress: p.solicitorAddress.trim() || undefined,
    solicitorEmail: p.solicitorEmail.trim() || undefined,
    extraComments: p.extraComments.trim() || undefined,
    signatures: p.signatures.map((s) => ({ ...s })),
    multiOfferCheckHighest: p.multiOfferCheckHighest,
    multiOfferCheckDiscretion: p.multiOfferCheckDiscretion,
    multiOfferCheckConfidential: p.multiOfferCheckConfidential,
  }
}
