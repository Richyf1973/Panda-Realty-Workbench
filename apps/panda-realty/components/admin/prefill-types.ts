export type Seller = {
  entityName: string | null
  nameLine2?: string | null
  address: string | null
  address2?: string | null
  suburb?: string | null
  state?: string | null
  postcode?: string | null
  phoneNumber: string | null
  mobile: string | null
  emailAddress: string | null
  abn: string | null
  acn?: string | null
  gstRegistered?: string | null
  fax?: string | null
}

export type Buyer = {
  entityId: number
  entityName: string | null
  address: string | null
  suburb: string | null
  state: string | null
  postcode: string | null
  phoneNumber: string | null
  mobile: string | null
  emailAddress: string | null
  abn: string | null
}

export type SolicitorContact = {
  entityName: string | null
  ref: string | null
  address: string | null
  suburb: string | null
  state: string | null
  postcode: string | null
  phoneNumber: string | null
  emailAddress: string | null
}

export type ProFormaBuyer = {
  entityId: number
  entityName: string | null
  members?: Array<{ memberName: string | null; memberAddress: string | null; memberPhoneNumber: string | null }>
  address: string | null
  phoneNumber: string | null
  emailAddress: string | null
}

export type Form6ApiData = {
  sellers: Seller[]
  propertyDescription1: string | null
  propertyStreetAddress: string | null
  propertySuburb: string | null
  propertyState: string | null
  propertyPostcode: string | null
  propertyLot: string | null
  propertyPlan: string | null
  propertyTitleReference: string | null
  commissionRate: string | null
  appraisedAmount: string | null
}

export type ContractSpApiData = {
  sellers: Seller[]
  buyers: Buyer[]
  sellerSolicitor: SolicitorContact | null
  buyerSolicitor: SolicitorContact | null
  propertyStreetAddress: string | null
  propertySuburb: string | null
  propertyState: string | null
  propertyPostcode: string | null
  propertyLot: string | null
  propertyPlan: string | null
  propertyTitleReference: string | null
  salePrice: string | null
  settlementDate: string | null
  settlementPeriod: string | null
  depositInitial: string | null
  depositBalance: string | null
  financeDays: number | null
  buildingPestDays: number | null
  isCashOffer: boolean | null
  isSubjectToFinance: boolean | null
  isSubjectToSale: boolean | null
  subjectToSaleAddress: string | null
  financeBank: string | null
  conditionNotes: string | null
  coolingOffDays: number | null
}

export type ProFormaApiData = {
  buyers: ProFormaBuyer[]
  solicitor: {
    entityId: number
    entityName: string | null
    address: string | null
    phoneNumber: string | null
    emailAddress: string | null
  } | null
}
