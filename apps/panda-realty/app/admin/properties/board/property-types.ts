// Types for the property detail panel — no "use server" needed (pure TS interfaces)

export type PropertyDetailProperty = {
  propertyListId: number
  streetAddress: string
  suburb: string
  state: string
  postcode: string
  propertyType: string
  salePrice: string | null
  appraisedAmount: string | null
  commissionRate: string | null
  createdAt: Date | null
  contractDate: Date | null
  isWon: boolean
  isLost: boolean
  propertyStatusId: number | null
  stageName: string | null
  dealStageStatusId: number | null
  dealStageName: string | null
  owner1name: string | null
  owner1phone: string | null
  owner1email: string | null
  owner2name: string | null
  owner2phone: string | null
  owner2email: string | null
  owner3name: string | null
  owner3phone: string | null
  owner3email: string | null
}

export type PropertyDetailBuyer = {
  propertyEntityId: number
  entityId: number
  entityName: string
  phoneNumber: string | null
  emailAddress: string | null
  memberPropertyToSellAddress: string | null
  memberResidenceAddress: string | null
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
}

export type PropertyDetailContact = {
  propertyEntityId: number
  entityId: number
  entityName: string
  phoneNumber: string | null
  emailAddress: string | null
  association: string | null
}

export type PropertyDetailNote = {
  noteId: number
  propertyEntityId: number | null
  note: string
  createdBy: string | null
  createdAt: Date | null
  entityName: string | null
  source: "property" | "entity"
  agentId: number | null
  agentName: string | null
  agentEmail: string | null
}

export type PropertyDetailFile = {
  fileId: number
  kind: "property" | "entity"
  fileName: string | null
  fileType: string | null
  fileSize: number | null
  fileLink: string | null
  googleDriveFileId: string | null
  sharedWithPortal: boolean
  sharedWithSeller: boolean
}

export type PropertyDetailOffer = {
  buyerOfferId: number
  entityName: string
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
}

export type DealStage = {
  propertyStatusId: number
  stageName: string | null
  sortOrder: number | null
}

export type PropertyDetailAgent = {
  agentId: number
  agentName: string
  agentEmail: string | null
}

export type PropertyDetailMeeting = {
  propertyMeetingId: number
  propertyEntityId: number | null
  type: "meeting" | "reminder"
  title: string
  scheduledAt: Date
  durationMinutes: number | null
  notes: string | null
  googleCalendarEventId: string | null
  buyerName: string | null
}

export type PropertyDetail = {
  property: PropertyDetailProperty | null
  buyers: PropertyDetailBuyer[]
  contacts: PropertyDetailContact[]
  notes: PropertyDetailNote[]
  files: PropertyDetailFile[]
  offers: PropertyDetailOffer[]
  meetings: PropertyDetailMeeting[]
  primaryPropertyEntityId: number | null
  dealStages: DealStage[]
  agents: PropertyDetailAgent[]
}
