import { sql } from "drizzle-orm"
import { bigint, boolean, date, integer, jsonb, numeric, text, timestamp } from "drizzle-orm/pg-core"

import { pandaRealty, citext } from "./schema-base"

export const entities = pandaRealty.table("entities", {
  entityId: bigint("entity_id", { mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  contactCategoryId: bigint("contact_category_id", { mode: "number" }),
  entityCategoryId: bigint("entity_category_id", { mode: "number" }).notNull(),
  entityName: citext("entity_name").notNull(),
  address: citext("address"),
  emailAddress: citext("email_address"),
  notes: text("notes"),
  association: citext("association"),
  lastViewedProperty: bigint("last_viewed_property", { mode: "number" }),
  website: citext("website"),
  isSeller: boolean("is_seller").notNull().default(false),
  customerType: citext("customer_type"),
  toBeContacted: boolean("to_be_contacted").notNull().default(false),
  toBeContactedDate: timestamp("to_be_contacted_date"),
  esuburb: citext("esuburb"),
  estate: citext("estate"),
  epostcode: citext("epostcode"),
  abn: citext("abn"),
  mobile: citext("mobile"),
  fax: citext("fax"),
  ref: citext("ref"),
  contact: citext("contact"),
  licenseNo: citext("license_no"),
  leadSourceId: bigint("lead_source_id", { mode: "number" }),
  /** Buyer member (entity_members.entity_member_id) whose phone is the entity's primary contact. */
  primaryPhoneMemberId: bigint("primary_phone_member_id", { mode: "number" }),
  /** Buyer member (entity_members.entity_member_id) whose email is the entity's primary contact. */
  primaryEmailMemberId: bigint("primary_email_member_id", { mode: "number" }),
  googleContactsSyncedAt: timestamp("google_contacts_synced_at", { withTimezone: true }),
  googleContactsLastOutcome: text("google_contacts_last_outcome"),
  googleContactsLastError: text("google_contacts_last_error"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
})

export const entityMembers = pandaRealty.table("entity_members", {
  entityMemberId: bigint("entity_member_id", { mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  entityId: bigint("entity_id", { mode: "number" }).notNull(),
  memberName: citext("member_name").notNull(),
  memberAddress: citext("member_address"),
  propertyToSellAddress: citext("property_to_sell_address"),
  memberPhoneNumber: citext("member_phone_number"),
  memberEmailAddress: citext("member_email_address"),
  memberNotes: text("member_notes"),
  scheduledViewingDate: timestamp("scheduled_viewing_date"),
  googleCalendarEventId: text("google_calendar_event_id"),
  esuburb: citext("esuburb"),
  estate: citext("estate"),
  epostcode: citext("epostcode"),
  abn: citext("abn"),
  mobile: citext("mobile"),
  fax: citext("fax"),
  ref: citext("ref"),
  contact: citext("contact"),
  licenseNo: citext("license_no"),
  /** At most one member per entity may be true (enforced in API + partial unique index). */
  isBuyersRepresentative: boolean("is_buyers_representative").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
})

export const propertyEntities = pandaRealty.table("property_entities", {
  propertyEntityId: bigint("property_entity_id", { mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  entityId: bigint("entity_id", { mode: "number" }).notNull(),
  propertyListId: bigint("property_list_id", { mode: "number" }),
  propertyEntityNote: citext("property_entity_note"),
  isOriginalOwner: boolean("is_original_owner").notNull().default(false),
  /** Kanban: Buyers pipeline stage for this buyer–property link. Null = not on the buyers board. */
  buyerPipelineStatusId: bigint("buyer_pipeline_status_id", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
})

export const entityBuyerStatuses = pandaRealty.table("entity_buyer_statuses", {
  entityBuyerStatusId: bigint("entity_buyer_status_id", { mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  entityId: bigint("entity_id", { mode: "number" }).notNull(),
  buyerStatusId: bigint("buyer_status_id", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
})

export const buyerViewedProperties = pandaRealty.table("buyer_viewed_properties", {
  buyerViewedPropertyId: bigint("buyer_viewed_property_id", { mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  entityId: bigint("entity_id", { mode: "number" }).notNull(),
  propertyListId: bigint("property_list_id", { mode: "number" }).notNull(),
  viewedAt: timestamp("viewed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
})

export const buyerPreferredFeatures = pandaRealty.table("buyer_preferred_features", {
  buyerPreferredFeatureId: bigint("buyer_preferred_feature_id", { mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  entityId: bigint("entity_id", { mode: "number" }).notNull(),
  feature: citext("feature").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
})

export const entityBuyerRequirements = pandaRealty.table("entity_buyer_requirements", {
  entityBuyerRequirementId: bigint("entity_buyer_requirement_id", { mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  entityId: bigint("entity_id", { mode: "number" }).notNull(),
  buyerRequirementId: bigint("buyer_requirement_id", { mode: "number" }).notNull(),
  value: text("value"),
  createdAt: timestamp("created_at").defaultNow(),
})

/**
 * `panda_realty.buyer_offers` — per-buyer offer amounts linked to a property_entity.
 * FK: property_entity_id → property_entities.property_entity_id.
 */
export const buyerOffers = pandaRealty.table("buyer_offers", {
  buyerOfferId: bigint("buyer_offer_id", { mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  propertyEntityId: bigint("property_entity_id", { mode: "number" }).notNull(),
  offer: numeric("offer", { precision: 20, scale: 2 }).notNull().default("0"),
  isAccepted: boolean("is_accepted").notNull().default(false),
  dateOffered: date("date_offered", { mode: "string" })
    .notNull()
    .default(sql`CURRENT_DATE`),
  isCashOffer: boolean("is_cash_offer").notNull().default(false),
  noConditions: boolean("no_conditions").notNull().default(false),
  coolingOffDays: integer("cooling_off_days"),
  financeDays: integer("finance_days"),
  buildingPestDays: integer("building_pest_days"),
  dueDiligenceDays: integer("due_diligence_days"),
  subjectToSaleDays: integer("subject_to_sale_days"),
  subjectToSaleStage: text("subject_to_sale_stage"),
  subjectToSaleAddress: text("subject_to_sale_address"),
  depositInitial: numeric("deposit_initial", { precision: 20, scale: 2 }),
  depositBalance: numeric("deposit_balance", { precision: 20, scale: 2 }),
  saleOfPropertyDays: integer("sale_of_property_days"),
  unconditionalContractDays: integer("unconditional_contract_days"),
  otherConditions: text("other_conditions"),
  customConditions: jsonb("custom_conditions").$type<Array<{ label: string; days: number }>>(),
  settlementDate: date("settlement_date", { mode: "string" }),
  conditionNotes: text("condition_notes"),
  waiveCoolingOff: boolean("waive_cooling_off"),
  isSubjectToFinance: boolean("is_subject_to_finance"),
  financePreApproved: boolean("finance_pre_approved"),
  financeBank: text("finance_bank"),
  financeBankContactName: text("finance_bank_contact_name"),
  financeBankContactPhone: text("finance_bank_contact_phone"),
  financeBankContactEmail: text("finance_bank_contact_email"),
  suggestBuildingCompanies: boolean("suggest_building_companies"),
  isSubjectToSale: boolean("is_subject_to_sale"),
  saleDaysBeforeListingLive: integer("sale_days_before_listing_live"),
  saleIsUnconditional: boolean("sale_is_unconditional"),
  saleUnconditionalDate: date("sale_unconditional_date", { mode: "string" }),
  saleBuyerSettlementDate: date("sale_buyer_settlement_date", { mode: "string" }),
  saleActiveConditions: text("sale_active_conditions").array(),
  saleFreeAppraisal: boolean("sale_free_appraisal"),
  settlementPeriod: text("settlement_period"),
  settlementCalendarEventId: text("settlement_calendar_event_id"),
  coolingOffCalendarEventId: text("cooling_off_calendar_event_id"),
  financeCalendarEventId: text("finance_calendar_event_id"),
  buildingPestCalendarEventId: text("building_pest_calendar_event_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
})
