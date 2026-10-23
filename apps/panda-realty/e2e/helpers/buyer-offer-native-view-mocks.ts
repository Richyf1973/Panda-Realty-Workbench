export const OFFER_9001_BASE = {
  buyerOfferId: 9001,
  offer: "750000",
  isAccepted: false,
  dateOffered: "2026-03-15",
  isCashOffer: false,
  noConditions: false,
  coolingOffDays: null,
  financeDays: null,
  buildingPestDays: null,
  dueDiligenceDays: null,
  subjectToSaleDays: null,
  subjectToSaleStage: null,
  subjectToSaleAddress: null,
  saleOfPropertyDays: null,
  unconditionalContractDays: null,
  depositInitial: "2000",
  depositBalance: "18000",
  otherConditions: null,
  customConditions: null,
  conditionNotes: null,
  settlementCalendarEventId: null,
  coolingOffCalendarEventId: null,
  financeCalendarEventId: null,
  buildingPestCalendarEventId: null,
  waiveCoolingOff: null,
  isSubjectToFinance: null,
  financePreApproved: null,
  financeBank: null,
  financeBankContactName: null,
  financeBankContactPhone: null,
  financeBankContactEmail: null,
  suggestBuildingCompanies: null,
  isSubjectToSale: null,
  saleDaysBeforeListingLive: null,
  saleIsUnconditional: null,
  saleUnconditionalDate: null,
  saleBuyerSettlementDate: null,
  saleActiveConditions: null,
  saleFreeAppraisal: null,
  settlementPeriod: "60",
  settlementDate: null,
}

export const BUYER_OFFERS_WITH_TOKEN = {
  propertyListId: 1001,
  contractDate: null,
  offerFormToken: "testtoken501",
  offers: [OFFER_9001_BASE],
}

export const OFFER_FORM_STATUS_RESPONSE = {
  token: "testtoken501",
  formUrl: "http://localhost:3014/offer-form/testtoken501",
  propertyAddress: "12 Test Street, Testville, QLD, 4000",
  entityEmail: "buyer@test.com",
  submission: null,
}

export const PREFILL_BASE = {
  propertyAddress: "12 Test Street, Testville, QLD, 4000",
  buyers: [{ name: "Test Buyer", phone: "0400 000 000", email: "buyer@test.com", address: "1 Buyer Rd" }],
  rep: null,
  solicitorName: "Jane Solicitor",
  solicitorPhone: "0411 111 111",
  solicitorAddress: "5 Law St",
  solicitorEmail: "jane@lawfirm.com",
  offerAmount: "750000",
  depositInitial: "2000",
  depositBalance: "18000",
  isCashOffer: false,
  waiveCoolingOff: false,
  isSubjectToFinance: false,
  buildingPestDays: null,
  isSubjectToSale: false,
  settlementPeriod: "60",
  settlementDate: null,
  conditionNotes: null,
  viewMode: true,
}

export const PREFILL_CASH_BUYER = {
  ...PREFILL_BASE,
  isCashOffer: true,
  waiveCoolingOff: true,
}

export const PREFILL_WITH_FINANCE = {
  ...PREFILL_BASE,
  isCashOffer: false,
  isSubjectToFinance: true,
  financePreApproved: true,
  financeApprovalDays: "14",
  financeBank: "ANZ",
  financeBankContactName: "Bob Banker",
  financeBankContactPhone: "0422 333 444",
  financeBankContactEmail: "bob@anz.com",
}

export const PREFILL_WITH_BUILDING_PEST = {
  ...PREFILL_BASE,
  buildingPestDays: 7,
  suggestBuildingCompanies: true,
}

export const PREFILL_WITH_SALE_LISTED = {
  ...PREFILL_BASE,
  isCashOffer: false,
  isSubjectToSale: true,
  subjectToSaleAddress: "99 Old Rd, Brisbane, QLD, 4000",
  subjectToSaleStage: "to_be_listed",
  saleDaysToContract: "30",
  saleDaysToUnconditional: "14",
  saleDaysToSettle: "60",
}

export const PREFILL_WITH_SALE_UNDER_CONTRACT = {
  ...PREFILL_BASE,
  isCashOffer: false,
  isSubjectToSale: true,
  subjectToSaleAddress: "99 Old Rd, Brisbane, QLD, 4000",
  subjectToSaleStage: "under_contract",
  saleIsUnconditional: false,
  saleUnconditionalDate: "2026-06-01",
  saleBuyerSettlementDate: "2026-06-30",
  saleActiveConditions: ["finance", "building_pest"],
  saleConditionsElaboration: "",
}

export const PREFILL_WITH_REP = {
  ...PREFILL_BASE,
  rep: {
    name: "Rep Person",
    phone: "0455 666 777",
    email: "rep@agency.com",
    isPreferredContact: "yes",
  },
}

export const PREFILL_WITH_NOTES = {
  ...PREFILL_BASE,
  conditionNotes: "Buyer requests early access for inspection.",
}

export const PREFILL_WITH_SALE_UNDER_CONTRACT_CONDITIONAL = {
  ...PREFILL_BASE,
  isCashOffer: false,
  isSubjectToSale: true,
  subjectToSaleAddress: "99 Old Rd, Brisbane, QLD, 4000",
  subjectToSaleStage: "under_contract_conditional",
  saleIsUnconditional: false,
  saleUnconditionalDate: "2026-06-01",
  saleBuyerSettlementDate: "2026-06-30",
  saleActiveConditions: ["finance", "building_pest"],
  saleConditionsElaboration: "",
}

export const PREFILL_WITH_SALE_UNDER_CONTRACT_UNCONDITIONAL = {
  ...PREFILL_BASE,
  isCashOffer: false,
  isSubjectToSale: true,
  subjectToSaleAddress: "99 Old Rd, Brisbane, QLD, 4000",
  subjectToSaleStage: "under_contract_unconditional",
  saleIsUnconditional: true,
  saleBuyerSettlementDate: "2026-07-15",
}

export const PREFILL_WITH_MULTI_OFFER = {
  ...PREFILL_BASE,
  multiOfferCheckHighest: true,
  multiOfferCheckDiscretion: false,
  multiOfferCheckConfidential: true,
}

export const PREFILL_WITH_SELLER_SOLICITOR = {
  ...PREFILL_BASE,
  sellerSolicitorName: "Smith & Partners Conveyancing",
  sellerSolicitorPhone: "0733 555 999",
  sellerSolicitorAddress: "Level 2, 88 Queen St, Brisbane QLD 4000",
  sellerSolicitorEmail: "info@smithpartners.com.au",
}
