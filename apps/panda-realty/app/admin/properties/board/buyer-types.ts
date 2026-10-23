import type { PropertyDetailMeeting } from "./property-types"

export type BuyerPropertyEntry = {
  propertyEntityId: number
  propertyListId: number
  streetAddress: string
  suburb: string
  propertyType: string | null
  contractDate: Date | null
  buyerPipelineStatusId: number | null
  stageName: string | null
  salePrice: string | null
  appraisedAmount: string | null
  offers: Array<{
    buyerOfferId: number
    offer: string
    isAccepted: boolean
    dateOffered: string
    isCashOffer: boolean
    noConditions: boolean
    coolingOffDays: number | null
    financeDays: number | null
    buildingPestDays: number | null
    dueDiligenceDays: number | null
    subjectToSaleDays: number | null
    subjectToSaleStage: string | null
    subjectToSaleAddress: string | null
    saleOfPropertyDays: number | null
    unconditionalContractDays: number | null
    depositInitial: string | null
    depositBalance: string | null
    otherConditions: string | null
    customConditions: Array<{ label: string; days: number }> | null
    conditionNotes: string | null
    settlementCalendarEventId: string | null
    coolingOffCalendarEventId: string | null
    financeCalendarEventId: string | null
    buildingPestCalendarEventId: string | null
    waiveCoolingOff: boolean | null
    isSubjectToFinance: boolean | null
    financePreApproved: boolean | null
    financeBank: string | null
    financeBankContactName: string | null
    financeBankContactPhone: string | null
    financeBankContactEmail: string | null
    suggestBuildingCompanies: boolean | null
    isSubjectToSale: boolean | null
    saleDaysBeforeListingLive: number | null
    saleIsUnconditional: boolean | null
    saleUnconditionalDate: string | null
    saleBuyerSettlementDate: string | null
    saleActiveConditions: string[] | null
    saleFreeAppraisal: boolean | null
    settlementPeriod: string | null
  }>
  notes: Array<{
    propertyEntityNoteId: number
    note: string
    createdBy: string | null
    agentId: number | null
    agentName: string | null
    createdAt: Date | null
  }>
  meetings: PropertyDetailMeeting[]
}

export type BuyerDetail = {
  entityId: number
  entityName: string
  phoneNumber: string | null
  emailAddress: string | null
  agents: import("./property-types").PropertyDetailAgent[]
  buyerStatuses: Array<{
    entityBuyerStatusId: number
    buyerStatusId: number
    buyerStatus: string
  }>
  preferredFeatures: Array<{
    buyerPreferredFeatureId: number
    feature: string
    createdAt: Date | null
  }>
  buyerRequirements: Array<{
    entityBuyerRequirementId: number
    buyerRequirementId: number
    requirement: string
    value: string | null
  }>
  /** Per-property data ordered by propertyEntityId ASC. */
  properties: BuyerPropertyEntry[]
}
