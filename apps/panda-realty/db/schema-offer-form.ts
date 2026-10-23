import { bigint, boolean, integer, jsonb, text, timestamp } from "drizzle-orm/pg-core"

import { pandaRealty, citext } from "./schema-base"
import { pandaProperties } from "./schema-properties"
import { propertyEntities } from "./schema-entities"

/**
 * `panda_realty.offer_form_tokens` — one stable token per buyer+property pair
 * used to generate a public offer form URL for that buyer.
 */
export const offerFormTokens = pandaRealty.table("offer_form_tokens", {
  offerFormTokenId: bigint("offer_form_token_id", { mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  propertyEntityId: bigint("property_entity_id", { mode: "number" })
    .notNull()
    .references(() => propertyEntities.propertyEntityId, { onDelete: "cascade" }),
  propertyListId: bigint("property_list_id", { mode: "number" })
    .notNull()
    .references(() => pandaProperties.propertyListId, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
})

/**
 * `panda_realty.offer_form_submissions` — raw submission data from a buyer filling
 * the public offer form; mirrors all Pro Forma Contract fields.
 */
export const offerFormSubmissions = pandaRealty.table("offer_form_submissions", {
  offerFormSubmissionId: bigint("offer_form_submission_id", { mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  offerFormTokenId: bigint("offer_form_token_id", { mode: "number" })
    .notNull()
    .references(() => offerFormTokens.offerFormTokenId, { onDelete: "cascade" }),
  propertyEntityId: bigint("property_entity_id", { mode: "number" })
    .notNull()
    .references(() => propertyEntities.propertyEntityId, { onDelete: "cascade" }),
  propertyListId: bigint("property_list_id", { mode: "number" })
    .notNull()
    .references(() => pandaProperties.propertyListId, { onDelete: "cascade" }),
  buyer1Name: citext("buyer1_name"),
  buyer2Name: citext("buyer2_name"),
  buyerAddress: text("buyer_address"),
  buyerPhone: citext("buyer_phone"),
  buyerEmail: citext("buyer_email"),
  offerAmount: citext("offer_amount"),
  isCashBuyer: boolean("is_cash_buyer"),
  settlementPeriod: citext("settlement_period"),
  isSubjectToSale: boolean("is_subject_to_sale"),
  saleTimeframeDays: citext("sale_timeframe_days"),
  salePropertyStatus: citext("sale_property_status"),
  saleSettlementDate: citext("sale_settlement_date"),
  isSubjectToFinance: boolean("is_subject_to_finance"),
  financePreApproved: boolean("finance_pre_approved"),
  financeDaysToApprove: citext("finance_days_to_approve"),
  financeBank: citext("finance_bank"),
  financeBankPhone: citext("finance_bank_phone"),
  solicitorName: citext("solicitor_name"),
  solicitorPhone: citext("solicitor_phone"),
  solicitorAddress: text("solicitor_address"),
  solicitorEmail: citext("solicitor_email"),
  buildingPestInspection: citext("building_pest_inspection"),
  waiveCoolingOff: boolean("waive_cooling_off"),
  totalDeposit: citext("total_deposit"),
  initialPayment: citext("initial_payment"),
  secondPayment: citext("second_payment"),
  salePropertyAddress: text("sale_property_address"),
  saleDaysBeforeListingLive: integer("sale_days_before_listing_live"),
  saleDaysToGetSaleContract: integer("sale_days_to_get_sale_contract"),
  saleDaysToGetUnconditionalContract: integer("sale_days_to_get_unconditional_contract"),
  saleDaysToSettleExistingProperty: integer("sale_days_to_settle_existing_property"),
  saleIsUnconditional: boolean("sale_is_unconditional"),
  saleUnconditionalDate: citext("sale_unconditional_date"),
  saleBuyerSettlementDate: citext("sale_buyer_settlement_date"),
  saleActiveConditions: text("sale_active_conditions").array(),
  saleConditionsElaboration: text("sale_conditions_elaboration"),
  saleFreeAppraisal: boolean("sale_free_appraisal"),
  financeBankContactName: citext("finance_bank_contact_name"),
  financeBankContactPhone: citext("finance_bank_contact_phone"),
  financeBankContactEmail: citext("finance_bank_contact_email"),
  suggestBuildingCompanies: boolean("suggest_building_companies"),
  extraComments: text("extra_comments"),
  buyersJson: jsonb("buyers_json").$type<Array<{ name: string; phone: string; email: string; address: string }>>(),
  signaturesJson: jsonb("signatures_json").$type<Array<{ buyerName: string; data: string; method: string; signDate: string }>>(),
  multiOfferCheckHighest: boolean("multi_offer_check_highest").default(false),
  multiOfferCheckDiscretion: boolean("multi_offer_check_discretion").default(false),
  multiOfferCheckConfidential: boolean("multi_offer_check_confidential").default(false),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow(),
})
