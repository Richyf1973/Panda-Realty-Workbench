// Buyer 501 has an email; buyer 502 has none — used for edge-case tests
export const BUYER_PANEL_TWO_BUYERS = {
  items: [
    {
      propertyEntityId: 501,
      entityId: 201,
      entityName: "Test Buyer LLC",
      phoneNumber: "0400 111 222",
      emailAddress: "buyer@test.com",
      address: "1 Buyer Rd",
      esuburb: null,
      estate: null,
      epostcode: null,
      notes: null,
      buyerPipelineStatusId: null,
      pipelineStatusLabel: null,
    },
    {
      propertyEntityId: 502,
      entityId: 202,
      entityName: "No Email Buyer",
      phoneNumber: null,
      emailAddress: null,
      address: null,
      esuburb: null,
      estate: null,
      epostcode: null,
      notes: null,
      buyerPipelineStatusId: null,
      pipelineStatusLabel: null,
    },
  ],
}

export const BUYER_OFFERS_EMPTY = {
  propertyListId: 1001,
  contractDate: null,
  offers: [],
}

export const OFFER_FORM_TOKEN_RESPONSE = {
  token: "abc123token",
  formUrl: "http://localhost:3004/offer-form/abc123token",
  alreadyExists: false,
}

export const OFFER_FORM_TOKEN_REUSE_RESPONSE = {
  ...OFFER_FORM_TOKEN_RESPONSE,
  alreadyExists: true,
}

export const OFFER_FORM_SUBMISSION = {
  submittedAt: "2026-05-18T12:00:00.000Z",
  buyer1Name: "Test Buyer LLC",
  buyer2Name: null,
  buyerAddress: "1 Buyer Rd",
  buyerPhone: "0400 111 222",
  buyerEmail: "buyer@test.com",
  offerAmount: "650000",
  isCashBuyer: false,
  buildingPestInspection: null,
  suggestBuildingCompanies: null,
  waiveCoolingOff: null,
  totalDeposit: null,
  initialPayment: null,
  secondPayment: null,
  settlementPeriod: "30",
  isSubjectToSale: false,
  salePropertyAddress: null,
  salePropertyStatus: null,
  saleTimeframeDays: null,
  saleSettlementDate: null,
  saleIsUnconditional: null,
  saleUnconditionalDate: null,
  saleBuyerSettlementDate: null,
  saleActiveConditions: null,
  saleConditionsElaboration: null,
  saleFreeAppraisal: null,
  isSubjectToFinance: true,
  financePreApproved: false,
  financeDaysToApprove: "14",
  financeBank: "ANZ",
  financeBankPhone: null,
  financeBankContactName: null,
  financeBankContactEmail: null,
  solicitorName: null,
  solicitorPhone: null,
  solicitorAddress: null,
  solicitorEmail: null,
  extraComments: null,
  buyersJson: null,
  saleDaysBeforeListingLive: null,
  saleDaysToGetSaleContract: null,
  saleDaysToGetUnconditionalContract: null,
  saleDaysToSettleExistingProperty: null,
}

export const OFFER_FORM_STATUS_SUBMITTED = {
  token: "abc123token",
  formUrl: "http://localhost:3004/offer-form/abc123token",
  submission: OFFER_FORM_SUBMISSION,
}

export const OFFER_FORM_STATUS_NOT_SUBMITTED = {
  token: "abc123token",
  formUrl: "http://localhost:3004/offer-form/abc123token",
  entityEmail: "buyer@test.com",
  submission: null,
}

// submittedAt = Friday 22 May 2026 (UTC midnight)
// +33 days = Wed 24 Jun 2026
// +7 days  = Fri 29 May 2026
// +14 days = Fri 5 Jun 2026
// +20 days = Thu 11 Jun 2026
// +45 days = Mon 6 Jul 2026
// +60 days = Tue 21 Jul 2026
export const OFFER_FORM_SUBMISSION_WITH_DATES = {
  submittedAt: "2026-05-22T00:00:00.000Z",
  buyer1Name: "Test Buyer",
  buyer2Name: "2nd test",
  buyerAddress: "1 Test St",
  buyerPhone: "0400000001",
  buyerEmail: "test@example.com",
  offerAmount: "1200000",
  isCashBuyer: false,
  buildingPestInspection: "7_days",
  waiveCoolingOff: false,
  totalDeposit: "20000",
  initialPayment: "2000",
  secondPayment: "18000",
  settlementPeriod: "33",
  isSubjectToSale: true,
  salePropertyAddress: "184/46 Amy Street Morayfield",
  salePropertyStatus: "to_be_listed",
  saleTimeframeDays: "60",
  saleIsUnconditional: null,
  saleUnconditionalDate: null,
  saleBuyerSettlementDate: null,
  saleSettlementDate: null,
  saleActiveConditions: null,
  saleConditionsElaboration: null,
  saleFreeAppraisal: true,
  isSubjectToFinance: true,
  financePreApproved: true,
  financeDaysToApprove: "14",
  financeBank: "cba",
  financeBankPhone: null,
  financeBankContactName: "DENISE IRENE TAYLOR",
  financeBankContactEmail: "denise48taylor@gmail.com",
  solicitorName: "NJ Rose Lawyers",
  solicitorPhone: "07 3495 0299",
  solicitorAddress: "Unit 1.03 Norwinn Centre",
  solicitorEmail: "info@njroselawyers.com.au",
  extraComments: null,
  buyersJson: [
    { name: "Test Buyer", phone: "0400000001", email: "test@example.com", address: "1 Test St" },
    { name: "2nd test", phone: "", email: "", address: "" },
  ],
  saleDaysBeforeListingLive: 7,
  saleDaysToGetSaleContract: 20,
  saleDaysToGetUnconditionalContract: 45,
  saleDaysToSettleExistingProperty: 60,
}

export const OFFER_FORM_SUBMISSION_NO_BPEST = {
  ...OFFER_FORM_SUBMISSION_WITH_DATES,
  buildingPestInspection: "no",
  isSubjectToSale: false,
  isSubjectToFinance: false,
}

export const OFFER_FORM_SUBMISSION_NULL_SETTLEMENT = {
  ...OFFER_FORM_SUBMISSION_WITH_DATES,
  settlementPeriod: null,
  isSubjectToSale: false,
  isSubjectToFinance: false,
}

export const OFFER_FORM_STATUS_WITH_DATES = {
  token: "abc123token",
  formUrl: "http://localhost:3004/offer-form/abc123token",
  submission: OFFER_FORM_SUBMISSION_WITH_DATES,
}

export const OFFER_FORM_STATUS_NO_BPEST = {
  token: "abc123token",
  formUrl: "http://localhost:3004/offer-form/abc123token",
  submission: OFFER_FORM_SUBMISSION_NO_BPEST,
}

export const OFFER_FORM_STATUS_NULL_SETTLEMENT = {
  token: "abc123token",
  formUrl: "http://localhost:3004/offer-form/abc123token",
  submission: OFFER_FORM_SUBMISSION_NULL_SETTLEMENT,
}

// ── Contract-date fixtures ────────────────────────────────────────────────────
// contractDate = Mon 1 Jun 2026; submittedAt = Fri 22 May 2026
// From contractDate:  +5 = Sat 6 Jun, +7 = Mon 8 Jun, +14 = Mon 15 Jun, +33 = Sat 4 Jul
// From submittedAt:   +5 = Wed 27 May, +7 = Fri 29 May, +14 = Fri 5 Jun, +33 = Wed 24 Jun

export const OFFER_FORM_SUBMISSION_WITH_CONTRACT_DATE = {
  ...OFFER_FORM_SUBMISSION_WITH_DATES,
  contractDate: "2026-06-01",
  coolingOffDays: 5,
}

export const OFFER_FORM_SUBMISSION_COOLING_OFF_FALLBACK = {
  ...OFFER_FORM_SUBMISSION_WITH_DATES,
  contractDate: null,
  coolingOffDays: 5,
  isSubjectToSale: false,
  isSubjectToFinance: false,
}

export const OFFER_FORM_SUBMISSION_COOLING_OFF_ONE_DAY = {
  ...OFFER_FORM_SUBMISSION_WITH_DATES,
  contractDate: "2026-06-01",
  coolingOffDays: 1,
  isSubjectToSale: false,
  isSubjectToFinance: false,
}

export const OFFER_FORM_SUBMISSION_COOLING_OFF_ZERO = {
  ...OFFER_FORM_SUBMISSION_WITH_DATES,
  contractDate: "2026-06-01",
  coolingOffDays: 0,
  waiveCoolingOff: true,
  isSubjectToSale: false,
  isSubjectToFinance: false,
}

export const OFFER_FORM_STATUS_WITH_CONTRACT_DATE = {
  token: "abc123token",
  formUrl: "http://localhost:3004/offer-form/abc123token",
  submission: OFFER_FORM_SUBMISSION_WITH_CONTRACT_DATE,
}

export const OFFER_FORM_STATUS_COOLING_OFF_FALLBACK = {
  token: "abc123token",
  formUrl: "http://localhost:3004/offer-form/abc123token",
  submission: OFFER_FORM_SUBMISSION_COOLING_OFF_FALLBACK,
}

export const OFFER_FORM_STATUS_COOLING_OFF_ONE_DAY = {
  token: "abc123token",
  formUrl: "http://localhost:3004/offer-form/abc123token",
  submission: OFFER_FORM_SUBMISSION_COOLING_OFF_ONE_DAY,
}

export const OFFER_FORM_STATUS_COOLING_OFF_ZERO = {
  token: "abc123token",
  formUrl: "http://localhost:3004/offer-form/abc123token",
  submission: OFFER_FORM_SUBMISSION_COOLING_OFF_ZERO,
}
