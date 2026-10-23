import type { ChangeEvent } from "react"

export interface BuildingPestState {
  buildingPestRequired: boolean
  setBuildingPestRequired: (v: boolean) => void
  buildingPestDays: "7" | "14"
  setBuildingPestDays: (v: "7" | "14") => void
  suggestBuildingCompanies: boolean | null
  setSuggestBuildingCompanies: (v: boolean | null) => void
}

export interface SaleState {
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
}

export interface FinanceState {
  subjectToFinance: boolean
  setSubjectToFinance: (v: boolean) => void
  financePreApproved: boolean | null
  setFinancePreApproved: (v: boolean | null) => void
  financeApprovalDays: string
  setFinanceApprovalDays: (v: string) => void
  financeBank: string
  setFinanceBank: (v: string) => void
  financeBankContactName: string
  setFinanceBankContactName: (v: string) => void
  financeBankContactPhone: string
  setFinanceBankContactPhone: (v: string) => void
  financeBankContactEmail: string
  setFinanceBankContactEmail: (v: string) => void
}

export interface BuyerCard {
  id: string
  name: string
  phone: string
  email: string
  address: string
  hasRep: boolean
  repName: string
  repPhone: string
  repEmail: string
  repIsPreferredContact: string
}

export interface SignatureEntry {
  buyerId: string
  buyerName: string
  data: string
  method: "draw" | "type"
  signDate: string
}

export interface PrefillData {
  propertyAddress: string | null
  buyers: Array<{ name: string; phone: string; email: string; address: string }>
  rep: { name: string; phone: string; email: string; isPreferredContact: string } | null
  solicitorName: string | null
  solicitorPhone: string | null
  solicitorAddress: string | null
  solicitorEmail: string | null
  sellerSolicitorName?: string | null
  sellerSolicitorPhone?: string | null
  sellerSolicitorAddress?: string | null
  sellerSolicitorEmail?: string | null
  // offer/conditions prefill from latest buyer_offer + submission
  offerAmount?: string
  depositInitial?: string
  depositBalance?: string
  isCashOffer?: boolean
  waiveCoolingOff?: boolean
  isSubjectToFinance?: boolean
  financePreApproved?: boolean | null
  financeApprovalDays?: string
  financeBank?: string
  financeBankContactName?: string
  financeBankContactPhone?: string
  financeBankContactEmail?: string
  buildingPestDays?: number | null
  suggestBuildingCompanies?: boolean | null
  isSubjectToSale?: boolean
  subjectToSaleAddress?: string
  subjectToSaleStage?: string
  saleDaysBeforeListing?: string
  saleDaysToContract?: string
  saleDaysToUnconditional?: string
  saleDaysToSettle?: string
  saleIsUnconditional?: boolean | null
  saleUnconditionalDate?: string
  saleBuyerSettlementDate?: string
  saleActiveConditions?: string[]
  saleConditionsElaboration?: string
  saleFreeAppraisal?: boolean | null
  settlementPeriod?: string
  settlementDate?: string
  conditionNotes?: string
  signatures?: SignatureEntry[]
  viewMode?: boolean
  multiOfferCheckHighest?: boolean
  multiOfferCheckDiscretion?: boolean
  multiOfferCheckConfidential?: boolean
}

export type SettlementNote =
  | { type: "success"; dayOfWeek: string }
  | { type: "error"; dayOfWeek: string; source: "datepicker" | "days" }
  | null

export interface SettlementState {
  settlementPeriod: string
  settlementDate: string
  settlementNote: SettlementNote
  handleSettlementPeriodChange: (v: string) => void
  handleSettlementDateChange: (e: ChangeEvent<HTMLInputElement>) => void
}
