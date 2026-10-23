import { CSP_PREFILL_DATA_FULL, CSP_PREFILL_DATA_MINIMAL } from "./panda-contract-sp-party-fixtures"

/** Full prefill including accepted-offer data (settlement, deposit, condition days) */
export const CSP_PREFILL_DATA_WITH_OFFER = {
  ...CSP_PREFILL_DATA_FULL,
  settlementDate: "2026-09-15",
  depositInitial: "20000",
  depositBalance: "62500",
  financeDays: 14,
  buildingPestDays: 14,
}

/** Prefill with no accepted offer — settlement/deposit/days all null */
export const CSP_PREFILL_DATA_NO_OFFER = {
  ...CSP_PREFILL_DATA_MINIMAL,
  settlementDate: null,
  depositInitial: null,
  depositBalance: null,
  financeDays: null,
  buildingPestDays: null,
}

/** Offer with zero-day conditions */
export const CSP_PREFILL_DATA_ZERO_DAYS = {
  ...CSP_PREFILL_DATA_FULL,
  settlementDate: "2026-10-01",
  depositInitial: "10000",
  depositBalance: "50000",
  financeDays: 0,
  buildingPestDays: 0,
}

/** Financed buyer with all offer fields — isSubjectToFinance=true, isCashOffer=false */
export const CSP_PREFILL_DATA_FINANCED_BUYER = {
  sellers: [
    {
      entityName: "Margaret Smith",
      address: "180/46 Amy Street",
      suburb: "Morayfield",
      state: "QLD",
      postcode: "4506",
      phoneNumber: "07 3000 1111",
      mobile: "0411 000 111",
      emailAddress: "margaret@example.com",
      abn: "11 111 111 111",
    },
  ],
  buyers: [
    {
      entityId: 101,
      entityName: "Alice Buyer",
      address: "88 Buyer Street",
      suburb: "Newstead",
      state: "QLD",
      postcode: "4006",
      phoneNumber: "0422 000 000",
      mobile: null,
      emailAddress: "alice@buyer.com",
      abn: null,
    },
  ],
  sellerSolicitor: {
    entityName: "Smith Legal",
    ref: "SL-001",
    address: "1 Legal Lane",
    suburb: "Brisbane City",
    state: "QLD",
    postcode: "4000",
    phoneNumber: "07 3000 9999",
    emailAddress: "info@smithlegal.com",
  },
  buyerSolicitor: null,
  propertyStreetAddress: "180/46 Amy Street",
  propertySuburb: "Morayfield",
  propertyState: "QLD",
  propertyPostcode: "4506",
  propertyLot: "180",
  propertyPlan: "SP123456",
  propertyTitleReference: null,
  salePrice: "825000",
  settlementDate: "2026-09-15",
  settlementPeriod: null,
  depositInitial: "20000",
  depositBalance: "62500",
  financeDays: 14,
  buildingPestDays: 14,
  isCashOffer: false,
  isSubjectToFinance: true,
  isSubjectToSale: false,
  subjectToSaleAddress: null,
  financeBank: "ANZ Bank",
  conditionNotes: "The property is to be professionally cleaned prior to settlement.",
}

/** Cash buyer — isCashOffer=true overrides isSubjectToFinance; finance fields must be blank */
export const CSP_PREFILL_DATA_CASH_BUYER = {
  ...CSP_PREFILL_DATA_FINANCED_BUYER,
  isCashOffer: true,
  isSubjectToFinance: true,
  conditionNotes: null,
}

/** Settlement period only — no actual date; mapper produces "30 Days from Contract Date" */
export const CSP_PREFILL_DATA_SETTLEMENT_PERIOD_ONLY = {
  ...CSP_PREFILL_DATA_FULL,
  settlementDate: null,
  settlementPeriod: "30",
  depositInitial: "10000",
  depositBalance: "40000",
  financeDays: null,
  buildingPestDays: null,
  isCashOffer: false,
  isSubjectToFinance: false,
  isSubjectToSale: false,
  subjectToSaleAddress: null,
  financeBank: null,
  conditionNotes: null,
}

/** All 3 special conditions: ET + further terms (conditionNotes) + subject to sale */
export const CSP_PREFILL_DATA_SPECIAL_CONDITIONS_FULL = {
  ...CSP_PREFILL_DATA_FINANCED_BUYER,
  isSubjectToSale: true,
  subjectToSaleAddress: "42 Previous Property Lane, Springfield QLD 4300",
}

/** Buyer solicitor populated from offer form submission */
export const CSP_PREFILL_DATA_WITH_BUYER_SOLICITOR = {
  ...CSP_PREFILL_DATA_FINANCED_BUYER,
  buyerSolicitor: {
    entityName: "Buyer Legal Partners",
    ref: null,
    address: "22 Buyer Law Street",
    suburb: null,
    state: null,
    postcode: null,
    phoneNumber: "07 3002 2222",
    emailAddress: "info@buyerlegal.com",
  },
}
