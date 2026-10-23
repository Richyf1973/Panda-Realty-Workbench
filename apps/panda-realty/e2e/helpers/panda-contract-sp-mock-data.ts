// ─── Shared / status ─────────────────────────────────────────────────────────

export { STATUS_MIN, EMPTY_ENTITIES, SEND_HISTORY_EMPTY, AGENTS_LIST } from "./panda-form6-mock-data"

// ─── Forms list ───────────────────────────────────────────────────────────────

export const FORMS_LIST_CONTRACT_SP = {
  items: [{
    propertyFormId: 4,
    formName: "Contract for Sale and Purchase of Residential Real Estate",
    category: "Contract",
    isActive: true,
    prefillStrategy: "contract-sale-purchase-1",
    fileLink: "https://drive.google.com/view?id=contractsp1master",
    fileName: "CONTRACT_FOR_SALE_AND_PURCHASE_OF_RESIDENTIAL_REAL_ESTATE_1ST_EDITION.pdf",
  }],
  totalCount: 1, limit: 25, totalPages: 1, hasNextPage: false, hasPreviousPage: false,
  startCursor: null, endCursor: null,
}

// ─── Template fixtures ────────────────────────────────────────────────────────

export const CSP_TEMPLATE_SAVED = {
  templateValues: {
    seller1Name: "Stale Template Seller",
    purchasePrice: "750,000.00",
    settlementDate: "2026-08-01",
  },
}

export const CSP_TEMPLATE_EMPTY = { templateValues: null }

// ─── Recipients ───────────────────────────────────────────────────────────────

export const CSP_RECIPIENTS_WITH_EMAIL = {
  items: [{
    propertyEntityId: 301,
    entityId: 201,
    entityName: "Alice Buyer",
    emailAddress: "alice@buyer.com",
    phoneNumber: "0422000000",
    address: "88 Buyer Street",
  }],
}

// ─── Party fixtures ───────────────────────────────────────────────────────────

export {
  CSP_PREFILL_DATA_FULL,
  CSP_PREFILL_DATA_MINIMAL,
  CSP_PREFILL_DATA_NO_PARTIES,
  CSP_PREFILL_DATA_BOTH_SOLICITORS,
  CSP_PREFILL_DATA_SELLER_WITH_SUBURB,
  CSP_PREFILL_DATA_SELLER_SUBURB_FALLBACK,
} from "./panda-contract-sp-party-fixtures"

// ─── Offer-augmented fixtures ─────────────────────────────────────────────────

export {
  CSP_PREFILL_DATA_WITH_OFFER,
  CSP_PREFILL_DATA_NO_OFFER,
  CSP_PREFILL_DATA_ZERO_DAYS,
  CSP_PREFILL_DATA_FINANCED_BUYER,
  CSP_PREFILL_DATA_CASH_BUYER,
  CSP_PREFILL_DATA_SETTLEMENT_PERIOD_ONLY,
  CSP_PREFILL_DATA_SPECIAL_CONDITIONS_FULL,
  CSP_PREFILL_DATA_WITH_BUYER_SOLICITOR,
} from "./panda-contract-sp-offer-fixtures"
