import { sql } from "drizzle-orm"
import {
  bigint,
  boolean,
  customType,
  integer,
  numeric,
  pgSchema,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core"

/**
 * Live `panda_realty` — aligned with Supabase (`list_tables` verbose).
 * Re-introspect when the DB drifts.
 */
export const pandaRealty = pgSchema("panda_realty")

export const citext = customType<{ data: string }>({
  dataType() {
    return "citext"
  },
})

export const propertyStatus = pandaRealty.table("property_status", {
  propertyStatusId: bigint("property_status_id", { mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  propertyStatusCode: citext("property_status_code").notNull().unique(),
  propertyStatus: citext("property_status"),
  isShownOnFavorite: boolean("is_shown_on_favorite").notNull().default(false),
  /** 'sellers' | 'buyers' | null — null means a non-pipeline status (existing market visibility labels) */
  pipeline: citext("pipeline"),
  /** 1–10 within a pipeline; null for non-pipeline statuses */
  sortOrder: integer("sort_order"),
  slug: citext("slug")
    .notNull()
    .unique()
    .generatedAlwaysAs(sql`slugify((property_status_code)::text)`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
})

export const contactCategories = pandaRealty.table("contact_categories", {
  contactCategoryId: bigint("contact_category_id", { mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  contactCategoryName: citext("contact_category_name").notNull().unique(),
  slug: citext("slug")
    .notNull()
    .unique()
    .generatedAlwaysAs(sql`slugify((contact_category_name)::text)`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
})

export const buyerStatus = pandaRealty.table("buyer_status", {
  buyerStatusId: bigint("buyer_status_id", { mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  buyerStatus: citext("buyer_status").notNull().unique(),
  slug: citext("slug")
    .notNull()
    .unique()
    .generatedAlwaysAs(sql`slugify((buyer_status)::text)`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
})

export const leadSources = pandaRealty.table("lead_sources", {
  leadSourceId: bigint("lead_source_id", { mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  leadSource: citext("lead_source").notNull().unique(),
  slug: citext("slug")
    .notNull()
    .unique()
    .generatedAlwaysAs(sql`slugify((lead_source)::text)`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
})

export const events = pandaRealty.table("events", {
  eventId: bigint("event_id", { mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  eventName: citext("event_name").notNull(),
  eventOrder: numeric("event_order", { precision: 20, scale: 10 }).notNull(),
  eventFile: text("event_file"),
  eventFileName: citext("event_file_name"),
  eventFileSize: numeric("event_file_size", { precision: 20, scale: 10 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
})

export const entityCategories = pandaRealty.table("entity_categories", {
  entityCategoryId: bigint("entity_category_id", { mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  entityCategoryName: citext("entity_category_name").notNull().unique(),
  slug: citext("slug")
    .notNull()
    .unique()
    .generatedAlwaysAs(sql`slugify((entity_category_name)::text)`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
})

export const buyerRequirement = pandaRealty.table("buyer_requirement", {
  buyerRequirementId: bigint("buyer_requirement_id", { mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  requirement: citext("requirement").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
})

export const pandaPropertyTypes = pandaRealty.table("panda_property_types", {
  propertyTypeId: bigint("property_type_id", { mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  label: citext("label").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const pandaSuburbs = pandaRealty.table(
  "panda_suburbs",
  {
    suburbId: bigint("suburb_id", { mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity(),
    suburb: citext("suburb").notNull(),
    state: citext("state").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("panda_suburbs_suburb_state_unique").on(t.suburb, t.state)],
)

export const pandaAddressTypeConversions = pandaRealty.table(
  "panda_address_type_conversions",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity(),
    addressText: citext("address_text").notNull().unique(),
    variant: citext("variant").notNull(),
  },
)

export const gmailOauthTokens = pandaRealty.table("gmail_oauth_tokens", {
  id: integer("id").primaryKey().default(1),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenType: text("token_type").notNull().default("Bearer"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  scope: text("scope"),
  emailAttachmentsFolderId: text("email_attachments_folder_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const emailSignatures = pandaRealty.table(
  "email_signatures",
  {
    emailSignatureId: bigint("email_signature_id", { mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity(),
    name: citext("name").notNull(),
    layout: text("layout").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    htmlContent: text("html_content").notNull().default(""),
    renderedHtml: text("rendered_html").notNull().default(""),
    bodyText: text("body_text").notNull().default(""),
    closingText: text("closing_text").notNull().default(""),
    contactName: citext("contact_name").notNull().default(""),
    phone: citext("phone"),
    email: citext("email"),
    website: text("website"),
    imageAssetUrl: text("image_asset_url"),
    googleDriveFileId: text("google_drive_file_id"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("email_signatures_single_default_idx")
      .on(table.isDefault)
      .where(sql`${table.isDefault} = true`),
  ],
)
